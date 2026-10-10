import { database, hash, cookie, presenterAuthenticated } from '../db/server';
import type { Config, Idea, RoomSummary } from './workshop';
export const reply=(data:unknown,status=200,headers:Record<string,string>={})=>Response.json(data,{status,headers:{'Cache-Control':'no-store',...headers}});
export const failure=(message:string,status=400)=>reply({error:message},status);
export const clean=(value:unknown,max:number)=>String(value??'').trim().slice(0,max);
export type Session={code:string;adminHash:string;config:string;created:number;parent:string|null};
/** A team room shares its main workshop's presenter: the account login, or the presenter key of the room or of its main workshop. */
export async function presenterFor(req:Request,session:Session){if(presenterAuthenticated(req))return true;for(const c of [session.code,session.parent]){if(!c)continue;const admin=cookie(req,'admin_'+c);if(admin&&await hash(admin)===session.adminHash)return true;}return false;}
type RoomRow={code:string;config:string;created:number;members:number;ideas:number;pending:number;votes?:number};
/** Showcase votes are stored in the votes table of the main workshop as idea `room:<room code>`. */
export const ROOM_VOTE='room:';
export const roomSummary=(r:RoomRow):RoomSummary=>{const c=JSON.parse(r.config) as Config;const brief=(k:string)=>String(c.canvas?.[k]||'').slice(0,600);return {code:r.code,name:c.name,challenge:c.challenge,question:c.question,stage:c.stage,screen:c.screen,paused:c.paused,ended:c.ended,members:r.members,ideas:r.ideas,pending:r.pending,created:r.created,brief:{problem:brief('Problem'),users:brief('Users'),solution:brief('Solution'),features:brief('Features')},votes:r.votes||0};};
/* Workshop-wide data is identical for every viewer, so live streams share one read per workshop
   (and concurrent readers share one in-flight query). Writes invalidate it; explicit GETs bypass it. */
type Shared={session:Session;config:Config;ideas:Idea[];participants:number;totals:{type:string;count:number}[];votes:number;reflection:Record<string,number>;parent:{code:string;config:Config}|null;rooms:RoomSummary[]};
const sharedCache=new Map<string,{at:number;value:Promise<Shared|null>}>();
const SHARED_TTL=1000;
/** A write to a workshop or one of its team rooms changes what the whole family shows (room lists, broadcast). */
export function invalidate(code:string){const root=code.replace(/-R\d+$/,'');for(const k of [...sharedCache.keys()])if(k===root||k.startsWith(root+'-R'))sharedCache.delete(k);}
function loadShared(db:D1Database,code:string,cached:boolean):Promise<Shared|null>{
 const hit=sharedCache.get(code);
 if(cached&&hit&&Date.now()-hit.at<SHARED_TTL)return hit.value;
 const value=(async()=>{const data=await db.batch([db.prepare('SELECT * FROM sessions WHERE code=?').bind(code),db.prepare('SELECT i.*, (SELECT COUNT(*) FROM votes v WHERE v.code=i.code AND v.idea=i.id) AS votes FROM ideas i WHERE i.code=? ORDER BY i.sortOrder,i.created DESC').bind(code),db.prepare("SELECT COUNT(*) AS count FROM participants WHERE code=? AND role!='guest'").bind(code),db.prepare('SELECT type, COUNT(*) AS count FROM ideas WHERE code=? AND status != ? GROUP BY type').bind(code,'deleted'),db.prepare("SELECT COUNT(*) AS count FROM votes WHERE code=? AND idea NOT LIKE 'room:%'").bind(code),db.prepare('SELECT skill,COUNT(*) AS count FROM reflections WHERE code=? GROUP BY skill').bind(code),db.prepare('SELECT code,config FROM sessions WHERE code=(SELECT parent FROM sessions WHERE code=?)').bind(code),db.prepare("SELECT s.code,s.config,s.created,(SELECT COUNT(*) FROM participants p WHERE p.code=s.code AND p.role!='guest') AS members,(SELECT COUNT(*) FROM ideas i WHERE i.code=s.code AND i.status='approved' AND i.type!='comment') AS ideas,(SELECT COUNT(*) FROM ideas i WHERE i.code=s.code AND i.status='pending') AS pending,(SELECT COUNT(*) FROM votes v WHERE v.code=s.parent AND v.idea='room:'||s.code) AS votes FROM sessions s WHERE s.parent=COALESCE((SELECT parent FROM sessions WHERE code=?),?) ORDER BY s.created").bind(code,code)]);
  const session=data[0].results[0] as Session|undefined;if(!session)return null;
  return {session,config:JSON.parse(session.config) as Config,ideas:data[1].results as unknown as Idea[],participants:(data[2].results[0] as {count:number})?.count||0,totals:data[3].results as unknown as {type:string;count:number}[],votes:(data[4].results[0] as {count:number})?.count||0,reflection:Object.fromEntries((data[5].results as {skill:string;count:number}[]).map(x=>[x.skill,x.count])),parent:(()=>{const p=data[6].results[0] as {code:string;config:string}|undefined;return p?{code:p.code,config:JSON.parse(p.config) as Config}:null})(),rooms:(data[7].results as RoomRow[]).map(roomSummary)};})();
 sharedCache.set(code,{at:Date.now(),value});
 value.then(v=>{if(!v&&sharedCache.get(code)?.value===value)sharedCache.delete(code)},()=>{if(sharedCache.get(code)?.value===value)sharedCache.delete(code)});
 if(sharedCache.size>200){const oldest=sharedCache.keys().next().value;if(oldest!==undefined)sharedCache.delete(oldest);}
 return value;
}
export async function snapshot(req:Request,code:string,cached=false){const db=database();const s=await loadShared(db,code,cached);if(!s)return failure('Workshop not found. Check the session code.',404);const {config}=s;
 const isPresenter=await presenterFor(req,s.session);const participant=cookie(req,'student_'+code);
 let me:{id:string;nickname:string;role:string}|null=null,myVotes:string[]=[],myReflection:string|null=null,myRoom:string|null=null,myShowcase:string|null=null,viewer:{nickname:string}|null=null;
 if(participant){const own=await db.batch([db.prepare('SELECT id,nickname,role FROM participants WHERE id = ? AND code = ?').bind(participant,code),db.prepare("SELECT idea FROM votes WHERE code=? AND participant=? AND idea NOT LIKE 'room:%'").bind(code,participant),db.prepare("SELECT idea FROM votes WHERE code=? AND participant=? AND idea LIKE 'room:%'").bind(code,participant),db.prepare('SELECT skill FROM reflections WHERE code=? AND participant=?').bind(code,participant),db.prepare("SELECT code FROM participants WHERE member=? AND role!='guest' AND code IN (SELECT code FROM sessions WHERE parent=?) LIMIT 1").bind(participant,code)]);me=(own[0].results[0] as {id:string;nickname:string;role:string}|undefined)||null;if(me){myVotes=(own[1].results as {idea:string}[]).map(x=>x.idea);myReflection=(own[3].results[0] as {skill:string}|undefined)?.skill||null;myRoom=(own[4].results[0] as {code:string}|undefined)?.code||null;myShowcase=(own[2].results[0] as {idea:string}|undefined)?.idea.slice(ROOM_VOTE.length)||null;}}
 // Someone who joined the main workshop can enter its rooms without typing their nickname again.
 if(!me&&s.parent){const id=cookie(req,'student_'+s.parent.code);if(id)viewer=await db.prepare('SELECT nickname FROM participants WHERE id=? AND code=?').bind(id,s.parent.code).first<{nickname:string}>();}
 const p=s.parent?.config;
 // A room lead facilitates their own room, so they see it as the presenter does.
 const facilitator=isPresenter||(!!s.parent&&me?.role==='lead');
 const showVotes=facilitator||config.liveResults||!config.votingOpen;
 const ideaList=(facilitator?s.ideas:s.ideas.filter(i=>i.status==='approved'||(!!me&&i.participant===me.id))).map(i=>({...i,participant:me&&i.participant===me.id?i.participant:'',votes:showVotes?i.votes:null}));const totals=s.totals;
 return reply({code,config,ideas:ideaList,stats:{participants:s.participants,ideas:totals.filter(x=>x.type!=='improvement'&&x.type!=='reflection'&&x.type!=='comment').reduce((n,x)=>n+x.count,0),improvements:totals.find(x=>x.type==='improvement')?.count||0,votes:s.votes},reflection:s.reflection,isPresenter:facilitator,me:me?{...me,votes:myVotes,reflection:myReflection,room:s.parent?null:myRoom,showcaseVote:s.parent?null:myShowcase,submitted:ideaList.filter(i=>i.participant===me!.id&&i.status!=='deleted').map(i=>i.type)}:null,...(s.rooms.length||config.teamRooms?{rooms:s.rooms.map(r=>({...r,votes:isPresenter||(!s.parent&&(config.liveResults||!config.showcaseVoting))?r.votes:null}))}:{}),...(s.parent&&p?{parent:{code:s.parent.code,name:p.name,challenge:p.challenge,broadcast:p.broadcast||'',gallery:p.gallery!==false,studentRooms:p.studentRooms!==false,ended:p.ended},viewer}:{})});}
export const readCode=(req:Request)=>clean(new URL(req.url).searchParams.get('code'),20).toUpperCase();
export const unavailable=(e:unknown)=>{console.error('Workshop read failed',e);return failure('The workshop connection is unavailable. Your work is safe. Please retry.',503);};
/** Live-stream reads: may reuse the workshop-wide data for up to a second. */
export async function streamSnapshot(req:Request){try{return await snapshot(req,readCode(req),true);}catch(e){return unavailable(e);}}
/** Text any attendee can already read in this workshop (config + approved contributions). Used to validate translation requests. */
export async function workshopTexts(code:string):Promise<Set<string>|null>{const s=await loadShared(database(),code,true);if(!s)return null;const set=new Set<string>();const c=s.config;for(const v of [c.challenge,c.question,c.description,c.name])if(v)set.add(v);for(const i of s.ideas)if(i.status==='approved'){if(i.title)set.add(i.title);if(i.text)set.add(i.text)}return set;}
