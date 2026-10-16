import { database, cookie } from '../../../db/server';
import { reply, failure, clean, invalidate, presenterFor, canReadRoom, type Session } from '../../../lib/snapshot';
import type { Config } from '../../../lib/workshop';
export const dynamic='force-dynamic';
/* Files shared in team rooms. A file arrives in pieces of at most CHUNK bytes, because the VPS proxy limits
   each request to 128 KB; the last piece assembles the file. The type is decided from the file's own bytes,
   never from its name, and only images and PDFs are accepted. Voice notes (`kind=voice`) are recordings attached to an
   idea, comment or public post: audio only, allowed in the main workshop as well, and kept out of the room's file list.
   A character picture (`kind=avatar`) is one small square image in the main workshop; it stays `avatar-pending` until
   the presenter approves it (`avatar`), so nobody else sees it before then. */
const CHUNK=96*1024, MAX=3*1024*1024, PER_PERSON=15, PER_ROOM=150, VOICE_PER_PERSON=60, VOICE_PER_WORKSHOP=1500, PICTURES_PER_PERSON=12, PICTURES_PER_WORKSHOP=600;
const pictureTypes=['image/png','image/jpeg','image/webp'];
const signatures:[string,number[],number][]=[['image/png',[0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a],0],['image/jpeg',[0xff,0xd8,0xff],0],['image/gif',[0x47,0x49,0x46,0x38],0],['image/webp',[0x57,0x45,0x42,0x50],8],['application/pdf',[0x25,0x50,0x44,0x46,0x2d],0]];
function sniff(b:Uint8Array){for(const [type,sig,at] of signatures)if(sig.every((v,i)=>b[at+i]===v)&&(type!=='image/webp'||String.fromCharCode(b[0],b[1],b[2],b[3])==='RIFF'))return type;return null;}
/** Browser recordings: WebM/Opus (Chrome, Edge, Firefox), Ogg, MP4/AAC (Safari, iPhone) and WAV. */
const audioSignatures:[string,number[],number][]=[['audio/webm',[0x1a,0x45,0xdf,0xa3],0],['audio/ogg',[0x4f,0x67,0x67,0x53],0],['audio/mp4',[0x66,0x74,0x79,0x70],4],['audio/wav',[0x57,0x41,0x56,0x45],8],['audio/mpeg',[0x49,0x44,0x33],0]];
function sniffAudio(b:Uint8Array){for(const [type,sig,at] of audioSignatures)if(sig.every((v,i)=>b[at+i]===v)&&(type!=='audio/wav'||String.fromCharCode(b[0],b[1],b[2],b[3])==='RIFF'))return type;return null;}
const fileName=(v:unknown)=>clean(v,120).replace(/[\\/:*?"<>|\u0000-\u001f]/g,'_')||'file';
const bytes=(v:unknown)=>v instanceof Uint8Array?v:new Uint8Array(v as ArrayBuffer);
async function access(req:Request,db:D1Database,code:string){const session=await db.prepare('SELECT * FROM sessions WHERE code=?').bind(code).first<Session>();if(!session)return null;const isPresenter=await presenterFor(req,session);const id=cookie(req,'student_'+code);const me=id?await db.prepare('SELECT id,nickname,role FROM participants WHERE id=? AND code=?').bind(id,code).first<{id:string;nickname:string;role:string}>():null;return {session,config:JSON.parse(session.config) as Config,isPresenter,me,facilitator:isPresenter||me?.role==='lead'};}

export async function POST(req:Request){let code='';try{
 const origin=req.headers.get('origin');if(origin&&origin!==new URL(req.url).origin)return failure('Invalid request origin.',403);
 const q=new URL(req.url).searchParams;code=clean(q.get('code'),30).toUpperCase();const id=clean(q.get('id'),40),idx=Number(q.get('index')),total=Number(q.get('total')),voice=q.get('kind')==='voice',avatar=q.get('kind')==='avatar';
 if(!/^[a-f0-9-]{36}$/.test(id))return failure('Invalid upload.');
 if(!Number.isInteger(total)||!Number.isInteger(idx)||total<1||idx<0||idx>=total)return failure('Invalid upload.');
 if(total>Math.ceil(MAX/CHUNK))return failure('The file is too large (3 MB at most).');
 if(avatar&&total!==1)return failure('The picture is too large. Please choose a smaller one.');
 if(Number(req.headers.get('content-length')||0)>CHUNK)return failure('Invalid upload.');
 const body=new Uint8Array(await req.arrayBuffer());if(!body.length||body.length>CHUNK)return failure('Invalid upload.');
 const db=database();const a=await access(req,db,code);if(!a)return failure('Workshop not found.',404);
 if(avatar){if(a.session.parent)return failure('Invalid upload.');if(!a.me)return failure('Join the workshop first.',401);if(a.config.ended)return failure('This workshop has ended.');
  if(!pictureTypes.includes(sniff(body)||''))return failure('Choose a PNG, JPEG or WebP picture.');
  const n=await db.prepare("SELECT (SELECT COUNT(*) FROM uploads WHERE code=? AND status LIKE 'avatar%') AS workshop,(SELECT COUNT(*) FROM uploads WHERE code=? AND participant=? AND status LIKE 'avatar%') AS mine").bind(code,code,a.me.id).first<{workshop:number;mine:number}>();
  if((n?.workshop||0)>=PICTURES_PER_WORKSHOP)return failure('This workshop has reached its picture limit.');if((n?.mine||0)>=PICTURES_PER_PERSON)return failure('You have reached your picture limit. Ask the presenter for help.');
  // A new picture replaces one still waiting for review.
  await db.batch([db.prepare("UPDATE uploads SET status='deleted',data=X'' WHERE code=? AND participant=? AND status IN ('avatar-pending','avatar-rejected')").bind(code,a.me.id),db.prepare("INSERT OR IGNORE INTO uploads (id,code,participant,nickname,name,type,size,data,status,created) VALUES (?,?,?,?,?,?,?,?,'avatar-pending',?)").bind(id,code,a.me.id,a.me.nickname,'character-picture',sniff(body)!,body.length,body,Date.now())]);
  return reply({ok:true,id,status:'pending'},201);
 }
 if(!a.session.parent&&!voice)return failure('Files can be shared in team rooms.');
 if(!a.me&&!a.isPresenter)return failure('Join the workshop first.',401);
 if(a.me?.role==='guest'&&!a.isPresenter&&!voice)return failure('Visitors can read and comment. Join this room as a member to share files.',403);
 if(a.config.ended)return failure('This workshop has ended.');if(a.config.paused&&!a.facilitator)return failure('The workshop is paused. Please wait for the presenter.');
 const owner=a.me?.id||'presenter',nickname=a.me?.nickname||'Presenter';
 if(idx===0){
  if(voice?!sniffAudio(body):!sniff(body))return failure(voice?'This recording format is not supported. Please try another browser.':'Share a PNG, JPEG, GIF or WebP image, or a PDF.');
  const audio=voice?"type LIKE 'audio/%'":"type NOT LIKE 'audio/%'";
  const n=await db.prepare(`SELECT (SELECT COUNT(*) FROM uploads WHERE code=? AND status!='deleted' AND ${audio}) AS room,(SELECT COUNT(*) FROM uploads WHERE code=? AND participant=? AND status!='deleted' AND ${audio}) AS mine`).bind(code,code,owner).first<{room:number;mine:number}>();
  if(voice){if((n?.room||0)>=VOICE_PER_WORKSHOP)return failure('This workshop has reached its voice note limit.');if(!a.isPresenter&&(n?.mine||0)>=VOICE_PER_PERSON)return failure('You have reached your voice note limit.');}
  else{if((n?.room||0)>=PER_ROOM)return failure('This room has reached its file limit.');if(!a.isPresenter&&(n?.mine||0)>=PER_PERSON)return failure('You have reached your file limit in this room.');}
 }
 await db.batch([db.prepare('DELETE FROM upload_chunks WHERE created<?').bind(Date.now()-3600000),db.prepare('INSERT OR REPLACE INTO upload_chunks (id,idx,code,participant,data,created) VALUES (?,?,?,?,?,?)').bind(id,idx,code,owner,body,Date.now())]);
 const got=await db.prepare('SELECT COUNT(*) AS n FROM upload_chunks WHERE id=? AND code=? AND participant=?').bind(id,code,owner).first<{n:number}>();
 if((got?.n||0)<total)return reply({ok:true,received:got?.n||0},202);
 const parts=((await db.batch([db.prepare('SELECT idx,data FROM upload_chunks WHERE id=? AND code=? AND participant=? ORDER BY idx').bind(id,code,owner)]))[0].results as {idx:number;data:unknown}[]).map(p=>bytes(p.data));
 const size=parts.reduce((n,p)=>n+p.length,0);if(size>MAX){await db.prepare('DELETE FROM upload_chunks WHERE id=?').bind(id).run();return failure('The file is too large (3 MB at most).');}
 const file=new Uint8Array(size);let at=0;for(const p of parts){file.set(p,at);at+=p.length;}
 const type=voice?sniffAudio(file):sniff(file);if(!type){await db.prepare('DELETE FROM upload_chunks WHERE id=?').bind(id).run();return failure(voice?'This recording format is not supported. Please try another browser.':'Share a PNG, JPEG, GIF or WebP image, or a PDF.');}
 // A voice note is only reachable through the contribution it belongs to, which carries its own moderation.
 const status=voice||!a.config.moderated||a.facilitator?'approved':'pending';
 await db.batch([db.prepare('INSERT OR IGNORE INTO uploads (id,code,participant,nickname,name,type,size,data,status,created) VALUES (?,?,?,?,?,?,?,?,?,?)').bind(id,code,owner,nickname,fileName((()=>{try{return decodeURIComponent(req.headers.get('x-file-name')||'')}catch{return ''}})()),type,size,file,status,Date.now()),db.prepare('DELETE FROM upload_chunks WHERE id=?').bind(id)]);
 return reply({ok:true,id,status},201);
}catch(e){console.error('Upload failed',e);return failure('Unable to save the file right now. Please retry.',503);}finally{if(code)invalidate(code);}}

/** Approved files are readable by anyone who can open the room (their ids are unguessable); pending ones only by their owner and the room's facilitators. */
export async function GET(req:Request){try{
 const q=new URL(req.url).searchParams;const id=clean(q.get('id'),40);if(!/^[a-f0-9-]{36}$/.test(id))return failure('File not found.',404);
 const db=database();const row=await db.prepare('SELECT code,participant,name,type,data,status FROM uploads WHERE id=?').bind(id).first<{code:string;participant:string;name:string;type:string;data:unknown;status:string}>();
 if(!row||row.status==='deleted')return failure('File not found.',404);
 if(row.status!=='approved'&&row.status!=='avatar'){const a=await access(req,db,row.code);if(!a||!(a.facilitator||a.me?.id===row.participant))return failure('File not found.',404);}
 // Files of a private room are only for the teams allowed in (and the presenter).
 else if(row.status==='approved'){const session=await db.prepare('SELECT * FROM sessions WHERE code=?').bind(row.code).first<Session>();if(!session||!await canReadRoom(req,db,session))return failure('File not found.',404);}
 const inline=(row.type.startsWith('image/')||row.type.startsWith('audio/'))&&q.get('download')!=='1';
 const data=bytes(row.data);const head:Record<string,string>={'Content-Type':row.type,'Content-Disposition':`${inline?'inline':'attachment'}; filename*=UTF-8''${encodeURIComponent(row.name)}`,'X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox",'Cache-Control':'private, max-age=3600','Accept-Ranges':'bytes'};
 // Audio players (Safari in particular) ask for byte ranges.
 const range=/^bytes=(\d*)-(\d*)$/.exec(req.headers.get('range')||'');
 if(range&&(range[1]||range[2])){const size=data.length;const start=range[1]?Number(range[1]):Math.max(0,size-Number(range[2]));const end=range[1]&&range[2]?Math.min(Number(range[2]),size-1):size-1;if(start>=size||start>end)return new Response(null,{status:416,headers:{'Content-Range':`bytes */${size}`}});return new Response(data.slice(start,end+1).buffer as ArrayBuffer,{status:206,headers:{...head,'Content-Range':`bytes ${start}-${end}/${size}`,'Content-Length':String(end-start+1)}});}
 return new Response(data.slice().buffer as ArrayBuffer,{headers:head});
}catch(e){console.error('File read failed',e);return failure('The file is unavailable. Please retry.',503);}}
