import {database,cookie} from '../../../db/server';
import {reply,failure,readCode,presenterFor,roomVisible,teamOf,type Session} from '../../../lib/snapshot';
import type {Config} from '../../../lib/workshop';
import {PRESENCE_WINDOW,recentSignal,type ParticipantRecord,type ParticipantsReport,type ParticipationCounts} from '../../../lib/participant-records';
export const dynamic='force-dynamic';
type Person={id:string;code:string;nickname:string;member:string|null;role:string;created:number;joined:number|null;lastSeen:number|null;lastLocation:string|null};
type Aggregate=ParticipationCounts&{id:string};
const empty=():ParticipationCounts=>({ideas:0,comments:0,pending:0,votes:0,files:0,reactions:0,lastContribution:null});
export async function GET(req:Request){try{
 const db=database(),code=readCode(req);const session=await db.prepare('SELECT * FROM sessions WHERE code=?').bind(code).first<Session>();
 if(!session)return failure('Workshop not found.',404);
 // Do not confuse a room leader's facilitator snapshot with presenter/account authorization.
 if(!await presenterFor(req,session))return failure('Presenter access required.',403);
 const root=session.parent||code;const main=await db.prepare('SELECT * FROM sessions WHERE code=?').bind(root).first<Session>();if(!main)return failure('Workshop not found.',404);
 const records=await db.batch([
 db.prepare('SELECT code,config FROM sessions WHERE code=? OR parent=? ORDER BY created,code').bind(root,root),
 db.prepare('SELECT id,code,nickname,member,role,created,joined,lastSeen,lastLocation FROM participants WHERE code IN (SELECT code FROM sessions WHERE code=? OR parent=?) ORDER BY created,id').bind(root,root),
 db.prepare(`WITH work AS (
 SELECT participant AS id,CASE WHEN type!='comment' THEN 1 ELSE 0 END AS ideas,CASE WHEN type='comment' THEN 1 ELSE 0 END AS comments,CASE WHEN status='pending' THEN 1 ELSE 0 END AS pending,0 AS votes,0 AS files,0 AS reactions,created AS stamp FROM ideas WHERE status!='deleted' AND code IN (SELECT code FROM sessions WHERE code=? OR parent=?)
 UNION ALL SELECT participant,0,0,0,1,0,0,NULL FROM votes WHERE code IN (SELECT code FROM sessions WHERE code=? OR parent=?)
 UNION ALL SELECT participant,0,0,CASE WHEN status='pending' THEN 1 ELSE 0 END,0,1,0,created FROM uploads WHERE status!='deleted' AND code IN (SELECT code FROM sessions WHERE code=? OR parent=?)
 UNION ALL SELECT participant,0,0,0,0,0,1,created FROM reactions WHERE code IN (SELECT code FROM sessions WHERE code=? OR parent=?)
 ) SELECT id,SUM(ideas) AS ideas,SUM(comments) AS comments,SUM(pending) AS pending,SUM(votes) AS votes,SUM(files) AS files,SUM(reactions) AS reactions,MAX(stamp) AS lastContribution FROM work GROUP BY id`).bind(root,root,root,root,root,root,root,root)
 ]);
 const sessions=new Map((records[0].results as {code:string;config:string}[]).map(s=>[s.code,JSON.parse(s.config) as Config]));const people=records[1].results as Person[],counts=new Map((records[2].results as Aggregate[]).map(a=>[a.id,a]));
 const [boardResult]=await db.batch([db.prepare("SELECT participant AS id,SUM(CASE WHEN parent IS NULL THEN 1 ELSE 0 END) AS posts,SUM(CASE WHEN parent IS NOT NULL THEN 1 ELSE 0 END) AS replies,SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) AS pending,MAX(created) AS last FROM board_posts WHERE code=? AND status!='deleted' GROUP BY participant").bind(root)]);const boardCounts=new Map((boardResult.results as {id:string;posts:number;replies:number;pending:number;last:number}[]).map(r=>[r.id,r]));
 const linked=new Map<string,Person[]>();for(const p of people)if(p.code!==root&&p.member){const list=linked.get(p.member)||[];list.push(p);linked.set(p.member,list)}
 const users:ParticipantRecord[]=people.filter(p=>p.code===root).map(p=>{const children=linked.get(p.id)||[];const membership=children.filter(r=>r.role!=='guest').sort((a,b)=>(b.joined||b.created)-(a.joined||a.created))[0];const total=empty();for(const identity of [p,...children]){const c=counts.get(identity.id);if(!c)continue;for(const key of ['ideas','comments','pending','votes','files','reactions'] as const)total[key]+=c[key];if(c.lastContribution)total.lastContribution=Math.max(total.lastContribution||0,c.lastContribution)}
 const publicWork=boardCounts.get(p.id);if(publicWork){total.pending+=publicWork.pending;total.lastContribution=Math.max(total.lastContribution||0,publicWork.last)}
 return {...total,publicPosts:publicWork?.posts||0,publicReplies:publicWork?.replies||0,id:p.id,nickname:p.nickname,registered:p.created,room:membership?.code||null,role:membership?.role||'unassigned',roomJoined:membership?.joined||null,lastSeen:p.lastSeen,lastLocation:sessions.has(p.lastLocation||'')?p.lastLocation:null,locations:[p,...children].map(r=>{const config=sessions.get(r.code)!;return {...empty(),...counts.get(r.id),code:r.code,name:config.name,project:config.challenge,role:r.role,firstEntered:r.created,joined:r.joined}})};
 });
 const generated=Date.now(),config=JSON.parse(main.config) as Config;
 const rooms=[...sessions].filter(([c])=>c!==root).map(([c,config])=>{const members=users.filter(u=>u.room===c);const roomPeople=people.filter(p=>p.code===c);return {code:c,name:config.name,project:config.challenge,members:members.length,recent:members.filter(u=>recentSignal(u,generated)).length,contributors:roomPeople.filter(p=>{const v=counts.get(p.id);return v&&v.ideas+v.comments+v.votes+v.files+v.reactions>0}).length,ideas:roomPeople.reduce((n,p)=>n+(counts.get(p.id)?.ideas||0),0),comments:roomPeople.reduce((n,p)=>n+(counts.get(p.id)?.comments||0),0)}});
 const report:ParticipantsReport={code:root,name:config.name,project:config.challenge,generated,presenceWindow:PRESENCE_WINDOW,users,rooms,totals:{users:users.length,assigned:users.filter(u=>u.room).length,unassigned:users.filter(u=>!u.room).length,recent:users.filter(u=>recentSignal(u,generated)).length,contributors:users.filter(u=>u.ideas+u.comments+u.files+u.votes+u.reactions+(u.publicPosts||0)+(u.publicReplies||0)>0).length,ideas:users.reduce((n,u)=>n+u.ideas,0),comments:users.reduce((n,u)=>n+u.comments,0)}};
 return reply(report);
 }catch(e){console.error('Participant records failed',e);return failure('Unable to load participant records. Please retry.',503)}}
export async function POST(req:Request){try{
 const origin=req.headers.get('origin');if(origin&&origin!==new URL(req.url).origin)return failure('Invalid request origin.',403);
 if(Number(req.headers.get('content-length')||0)>2000)return failure('Request too large.',413);
 const b=await req.json() as {code?:unknown};const code=String(b?.code||'').trim().toUpperCase();if(!/^UTAS-\d{6}(-R\d+)?$/.test(code))return failure('Invalid workshop code.');
 const db=database(),session=await db.prepare('SELECT * FROM sessions WHERE code=?').bind(code).first<Session>();if(!session)return failure('Workshop not found.',404);
 const id=cookie(req,'student_'+code),me=await db.prepare('SELECT id,member,role FROM participants WHERE id=? AND code=?').bind(id,code).first<{id:string;member:string|null;role:string}>();if(!me)return failure('Join the workshop first.',401);
 const root=session.parent||code;if(session.parent){const main=await db.prepare('SELECT config FROM sessions WHERE code=?').bind(root).first<{config:string}>();if(!main)return failure('Workshop not found.',404);const room=JSON.parse(session.config) as Config;if(me.role==='guest'&&!roomVisible(room,code,await teamOf(db,root,me.member||''),(JSON.parse(main.config) as Config).gallery!==false))return failure('This team keeps its discussion private.',403)}
 // The requester cannot select another participant or invent an arbitrary room location.
 const base=me.member||me.id,now=Date.now();await db.prepare('UPDATE participants SET lastSeen=?,lastLocation=? WHERE id=? AND code=? AND (lastSeen IS NULL OR lastSeen<? OR lastLocation IS NOT ?)').bind(now,code,base,root,now-15000,code).run();return reply({ok:true});
 }catch{return failure('Invalid request.',400)}}
