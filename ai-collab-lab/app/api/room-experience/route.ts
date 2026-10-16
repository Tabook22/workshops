import {database,cookie,hash} from '../../../db/server';
import {reply,failure,readCode,presenterFor,invalidate,type Session} from '../../../lib/snapshot';
import {validAvatar,customPicture,type RoomExperience,type RoomMood} from '../../../lib/avatars';
import type {Config} from '../../../lib/workshop';
export const dynamic='force-dynamic';
type Person={id:string;member:string|null;nickname:string;role:string;avatar:string|null;roomState:string|null;roomSignalAt:number|null;raisedAt:number|null;speakingUntil:number|null};
const seatKey=(code:string,id:string)=>hash('workshop-seat:'+code+':'+id);
/** A speaking turn lasts two minutes; the leader can add a minute. Raised hands expire after ten minutes. */
const TURN=120000,EXTRA=60000,HAND=600000;
const ACTIVE=`EXISTS(SELECT 1 FROM sessions s JOIN sessions r ON r.code=s.parent WHERE s.code=? AND COALESCE(json_extract(s.config,'$.ended'),0)=0 AND COALESCE(json_extract(r.config,'$.ended'),0)=0 AND COALESCE(json_extract(s.config,'$.paused'),0)=0 AND COALESCE(json_extract(r.config,'$.paused'),0)=0)`;
/** Automatic turns: when nobody holds the floor, the first raised hand gets it. One statement, so two
    teammates polling at once cannot both be given the floor. */
async function passTurn(db:D1Database,code:string,config:Config){
 if(config.autoTurns===false)return;const now=Date.now();
 await db.prepare(`UPDATE participants SET speakingUntil=?,raisedAt=NULL WHERE id=(SELECT id FROM participants WHERE code=? AND role!='guest' AND raisedAt IS NOT NULL AND raisedAt>? ORDER BY raisedAt,id LIMIT 1) AND NOT EXISTS(SELECT 1 FROM participants WHERE code=? AND speakingUntil>?) AND ${ACTIVE}`).bind(now+TURN,code,now-HAND,code,now,code).run();
}
async function context(req:Request,code:string){
 const db=database(),session=await db.prepare('SELECT * FROM sessions WHERE code=?').bind(code).first<Session>();if(!session)return null;
 const root=session.parent||code,me=await db.prepare('SELECT * FROM participants WHERE id=? AND code=?').bind(cookie(req,'student_'+code),code).first<Person>(),admin=await presenterFor(req,session);
 const base=me?await db.prepare('SELECT avatar FROM participants WHERE id=? AND code=?').bind(me.member||me.id,root).first<{avatar:string|null}>():null;
 const config=JSON.parse(session.config) as Config,parent=session.parent?await db.prepare('SELECT config FROM sessions WHERE code=?').bind(root).first<{config:string}>():null;
 return {db,session,config,root,me,admin,avatar:base?.avatar,ended:config.ended||!!(parent&&JSON.parse(parent.config).ended),paused:config.paused||!!(parent&&JSON.parse(parent.config).paused)};
}
export async function GET(req:Request){try{
 const code=readCode(req),c=await context(req,code);if(!c)return failure('Workshop not found.',404);if(!c.me&&!c.admin)return failure('Join the workshop first.',401);
 // Presenter: character pictures waiting for approval across the whole workshop.
 if(new URL(req.url).searchParams.has('pictures')){if(!c.admin)return failure('Presenter access required.',403);
  const pending=(await c.db.batch([c.db.prepare("SELECT u.id,u.created,p.nickname FROM uploads u JOIN participants p ON p.id=u.participant AND p.code=u.code WHERE u.code=? AND u.status='avatar-pending' ORDER BY u.created LIMIT 100").bind(c.root)]))[0].results as {id:string;created:number;nickname:string}[];
  return reply({pending});}
 const member=!!c.session.parent&&!!c.me&&c.me.role!=='guest',manage=!!c.session.parent&&(c.admin||c.me?.role==='lead');
 if(c.session.parent&&(member||c.admin)&&!c.ended&&!c.paused)await passTurn(c.db,code,c.config);
 const now=Date.now();
 const people=c.session.parent&&(member||c.admin)?(await c.db.batch([c.db.prepare("SELECT p.*,b.avatar AS avatar FROM participants p LEFT JOIN participants b ON b.id=p.member AND b.code=? WHERE p.code=? AND p.role!='guest' ORDER BY p.created,p.id LIMIT 500").bind(c.root,code)]))[0].results as Person[]:[];
 const members=await Promise.all(people.map(async p=>({key:await seatKey(code,p.id),name:p.nickname,avatar:validAvatar(p.avatar)?p.avatar:null,lead:p.role==='lead',me:p.id===c.me?.id,recent:!!p.roomSignalAt&&now-p.roomSignalAt<45000,state:(p.roomSignalAt&&now-p.roomSignalAt<25000&&['thinking','writing'].includes(p.roomState||'')?p.roomState:'ready') as RoomMood,hand:!c.ended&&p.raisedAt&&now-p.raisedAt<HAND?p.raisedAt:null,speaking:!c.ended&&!!p.speakingUntil&&p.speakingUntil>now,until:!c.ended&&p.speakingUntil&&p.speakingUntil>now?p.speakingUntil:null})));
 const mine=c.me?(await c.db.batch([c.db.prepare("SELECT id,status FROM uploads WHERE code=? AND participant=? AND status IN ('avatar','avatar-pending','avatar-rejected') ORDER BY created DESC LIMIT 20").bind(c.root,c.me.member||c.me.id)]))[0].results as {id:string;status:string}[]:[];
 const own=mine.find(u=>u.status!=='avatar'),approvedPicture=mine.find(u=>u.status==='avatar');
 const data:RoomExperience={avatar:validAvatar(c.avatar)?c.avatar:null,picture:own?{id:own.id,status:own.status==='avatar-pending'?'pending':'rejected'}:null,ownPicture:approvedPicture?'custom:'+approvedPicture.id:null,members,manage,member,ended:!!c.ended,generated:now,autoTurns:c.config.autoTurns!==false,turn:TURN};return reply(data);
 }catch(e){console.error('Room experience read failed',e);return failure('Unable to load the team table. Please retry.',503)}}
export async function POST(req:Request){try{
 if(req.headers.get('origin')&&req.headers.get('origin')!==new URL(req.url).origin)return failure('Invalid request origin.',403);
 const raw=await req.text();if(raw.length>1600)return failure('Request too large.',413);const b=JSON.parse(raw) as Record<string,unknown>,code=String(b.code||'').toUpperCase();if(!/^UTAS-\d{6}(-R\d+)?$/.test(code))return failure('Invalid workshop code.');
 const c=await context(req,code);if(!c)return failure('Workshop not found.',404);
 if(b.action==='avatar'){
  if(!c.me)return failure('Join the workshop first.',401);if(b.avatar!==null&&!validAvatar(b.avatar))return failure('Choose a character from the gallery.');
  const base=c.me.member||c.me.id,picture=customPicture(b.avatar);
  // Only your own picture, and only once the presenter has approved it.
  if(picture&&!await c.db.prepare("SELECT 1 FROM uploads WHERE id=? AND code=? AND participant=? AND status='avatar'").bind(picture,c.root,base).first())return failure('This picture is not approved yet.',403);
  await c.db.batch([c.db.prepare('UPDATE participants SET avatar=? WHERE id=? AND code=?').bind(b.avatar,base,c.root),c.db.prepare("UPDATE uploads SET status='deleted',data=X'' WHERE code=? AND participant=? AND status='avatar-rejected'").bind(c.root,base)]);invalidate(code);return reply({ok:true});
 }
 if(b.action==='picture'){
  // Presenter decision on an uploaded character picture. Approving also puts it on the participant's seat.
  if(!c.admin)return failure('Presenter access required.',403);const id=String(b.id||'');if(!/^[a-f0-9-]{36}$/.test(id))return failure('Picture not found.',404);
  const row=await c.db.prepare("SELECT participant FROM uploads WHERE id=? AND code=? AND status='avatar-pending'").bind(id,c.root).first<{participant:string}>();if(!row)return failure('This picture was already reviewed or replaced.',404);
  if(b.approve===true)await c.db.batch([c.db.prepare("UPDATE uploads SET status='avatar' WHERE id=?").bind(id),c.db.prepare('UPDATE participants SET avatar=? WHERE id=? AND code=?').bind('custom:'+id,row.participant,c.root)]);
  else await c.db.prepare("UPDATE uploads SET status='avatar-rejected' WHERE id=?").bind(id).run();
  invalidate(code);return reply({ok:true});
 }
 if(!c.session.parent)return failure('Use a team room.',403);
 const member=!!c.me&&c.me.role!=='guest',manage=c.admin||c.me?.role==='lead';
 if(!member&&!c.admin)return failure('Only team members can use the table.',403);
 const active=ACTIVE;
 const now=Date.now();
 if(b.action==='signal'){
  if(!member)return failure('Only team members can use the table.',403);if(!['ready','thinking','writing'].includes(String(b.state)))return failure('Invalid room status.');
  if(c.ended||c.paused)return reply({ok:true});
  await c.db.prepare(`UPDATE participants SET roomState=?,roomSignalAt=? WHERE id=? AND code=? AND role!='guest' AND ${active}`).bind(b.state,now,c.me!.id,code,code).run();return reply({ok:true});
 }
 if(b.action==='hand'){
  if(!member)return failure('Only team members can use the table.',403);if(typeof b.raised!=='boolean')return failure('Invalid room status.');if(b.raised&&(c.ended||c.paused))return failure('The workshop is paused or ended.');
  const res=await c.db.prepare(`UPDATE participants SET raisedAt=CASE WHEN ?=0 THEN NULL ELSE COALESCE(raisedAt,?) END WHERE id=? AND code=? AND role!='guest' AND (?=0 OR ${active})`).bind(b.raised?1:0,now,c.me!.id,code,b.raised?1:0,code).run();if(!res.meta.changes)return failure('Your membership changed. Please refresh.',409);if(b.raised)await passTurn(c.db,code,c.config);return reply({ok:true});
 }
 if(b.action==='done'){
  // The speaker hands the floor back; the next raised hand gets it if turns are automatic.
  if(!member)return failure('Only team members can use the table.',403);
  await c.db.prepare('UPDATE participants SET speakingUntil=NULL WHERE id=? AND code=? AND speakingUntil>?').bind(c.me!.id,code,now).run();
  if(!c.ended&&!c.paused)await passTurn(c.db,code,c.config);return reply({ok:true});
 }
 if(b.action==='extend'){
  if(!manage)return failure('Only the leader or presenter manages speaking turns.',403);
  await c.db.prepare(`UPDATE participants SET speakingUntil=MIN(speakingUntil+?,?) WHERE code=? AND speakingUntil>? AND ${active}`).bind(EXTRA,now+TURN+3*EXTRA,code,now,code).run();return reply({ok:true});
 }
 if(b.action==='turns'){
  if(!manage)return failure('Only the leader or presenter manages speaking turns.',403);if(typeof b.auto!=='boolean')return failure('Invalid room status.');
  await c.db.prepare("UPDATE sessions SET config=json_set(config,'$.autoTurns',json(?)) WHERE code=?").bind(b.auto?'true':'false',code).run();invalidate(code);
  if(b.auto&&!c.ended&&!c.paused)await passTurn(c.db,code,{...c.config,autoTurns:true});return reply({ok:true});
 }
 if(b.action==='speaker'){
  if(!manage)return failure('Only the leader or presenter manages speaking turns.',403);if(b.seat!==null&&(c.ended||c.paused))return failure('The workshop is paused or ended.');
  const people=(await c.db.batch([c.db.prepare("SELECT id FROM participants WHERE code=? AND role!='guest'").bind(code)]))[0].results as {id:string}[];
  let chosen:string|null=null;if(b.seat!==null){for(const p of people)if(await seatKey(code,p.id)===b.seat){chosen=p.id;break}if(!chosen)return failure('This teammate is no longer in the room.',409)}
  const permission=c.admin?'1=1':"EXISTS(SELECT 1 FROM participants leader WHERE leader.id=? AND leader.code=? AND leader.role='lead')";
  const args=c.admin?[]:[c.me!.id,code];
  await c.db.prepare(`UPDATE participants SET speakingUntil=CASE WHEN id=? THEN ? ELSE NULL END,raisedAt=CASE WHEN id=? THEN NULL ELSE raisedAt END WHERE code=? AND role!='guest' AND ${permission} AND (?=1 OR ${active})`).bind(chosen,now+TURN,chosen,code,...args,chosen===null?1:0,code).run();
  // Ending a turn passes the floor on when turns are automatic.
  if(chosen===null&&!c.ended&&!c.paused)await passTurn(c.db,code,c.config);return reply({ok:true});
 }
 return failure('Unknown action.');
 }catch(e){console.error('Room experience write failed',e);return failure('Unable to save your room preference. Please retry.',400)}}
