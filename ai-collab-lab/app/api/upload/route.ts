import { database, cookie } from '../../../db/server';
import { reply, failure, clean, invalidate, presenterFor, canReadRoom, type Session } from '../../../lib/snapshot';
import type { Config } from '../../../lib/workshop';
export const dynamic='force-dynamic';
/* Files shared in team rooms. A file arrives in pieces of at most CHUNK bytes, because the VPS proxy limits
   each request to 128 KB; the last piece assembles the file. The type is decided from the file's own bytes,
   never from its name, and only images and PDFs are accepted. */
const CHUNK=96*1024, MAX=3*1024*1024, PER_PERSON=15, PER_ROOM=150;
const signatures:[string,number[],number][]=[['image/png',[0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a],0],['image/jpeg',[0xff,0xd8,0xff],0],['image/gif',[0x47,0x49,0x46,0x38],0],['image/webp',[0x57,0x45,0x42,0x50],8],['application/pdf',[0x25,0x50,0x44,0x46,0x2d],0]];
function sniff(b:Uint8Array){for(const [type,sig,at] of signatures)if(sig.every((v,i)=>b[at+i]===v)&&(type!=='image/webp'||String.fromCharCode(b[0],b[1],b[2],b[3])==='RIFF'))return type;return null;}
const fileName=(v:unknown)=>clean(v,120).replace(/[\\/:*?"<>|\u0000-\u001f]/g,'_')||'file';
const bytes=(v:unknown)=>v instanceof Uint8Array?v:new Uint8Array(v as ArrayBuffer);
async function access(req:Request,db:D1Database,code:string){const session=await db.prepare('SELECT * FROM sessions WHERE code=?').bind(code).first<Session>();if(!session)return null;const isPresenter=await presenterFor(req,session);const id=cookie(req,'student_'+code);const me=id?await db.prepare('SELECT id,nickname,role FROM participants WHERE id=? AND code=?').bind(id,code).first<{id:string;nickname:string;role:string}>():null;return {session,config:JSON.parse(session.config) as Config,isPresenter,me,facilitator:isPresenter||me?.role==='lead'};}

export async function POST(req:Request){let code='';try{
 const origin=req.headers.get('origin');if(origin&&origin!==new URL(req.url).origin)return failure('Invalid request origin.',403);
 const q=new URL(req.url).searchParams;code=clean(q.get('code'),30).toUpperCase();const id=clean(q.get('id'),40),idx=Number(q.get('index')),total=Number(q.get('total'));
 if(!/^[a-f0-9-]{36}$/.test(id))return failure('Invalid upload.');
 if(!Number.isInteger(total)||!Number.isInteger(idx)||total<1||idx<0||idx>=total)return failure('Invalid upload.');
 if(total>Math.ceil(MAX/CHUNK))return failure('The file is too large (3 MB at most).');
 if(Number(req.headers.get('content-length')||0)>CHUNK)return failure('Invalid upload.');
 const body=new Uint8Array(await req.arrayBuffer());if(!body.length||body.length>CHUNK)return failure('Invalid upload.');
 const db=database();const a=await access(req,db,code);if(!a)return failure('Workshop not found.',404);
 if(!a.session.parent)return failure('Files can be shared in team rooms.');
 if(!a.me&&!a.isPresenter)return failure('Join the workshop first.',401);
 if(a.me?.role==='guest'&&!a.isPresenter)return failure('Visitors can read and comment. Join this room as a member to share files.',403);
 if(a.config.ended)return failure('This workshop has ended.');if(a.config.paused&&!a.facilitator)return failure('The workshop is paused. Please wait for the presenter.');
 const owner=a.me?.id||'presenter',nickname=a.me?.nickname||'Presenter';
 if(idx===0){
  if(!sniff(body))return failure('Share a PNG, JPEG, GIF or WebP image, or a PDF.');
  const n=await db.prepare("SELECT (SELECT COUNT(*) FROM uploads WHERE code=? AND status!='deleted') AS room,(SELECT COUNT(*) FROM uploads WHERE code=? AND participant=? AND status!='deleted') AS mine").bind(code,code,owner).first<{room:number;mine:number}>();
  if((n?.room||0)>=PER_ROOM)return failure('This room has reached its file limit.');if(!a.isPresenter&&(n?.mine||0)>=PER_PERSON)return failure('You have reached your file limit in this room.');
 }
 await db.batch([db.prepare('DELETE FROM upload_chunks WHERE created<?').bind(Date.now()-3600000),db.prepare('INSERT OR REPLACE INTO upload_chunks (id,idx,code,participant,data,created) VALUES (?,?,?,?,?,?)').bind(id,idx,code,owner,body,Date.now())]);
 const got=await db.prepare('SELECT COUNT(*) AS n FROM upload_chunks WHERE id=? AND code=? AND participant=?').bind(id,code,owner).first<{n:number}>();
 if((got?.n||0)<total)return reply({ok:true,received:got?.n||0},202);
 const parts=((await db.batch([db.prepare('SELECT idx,data FROM upload_chunks WHERE id=? AND code=? AND participant=? ORDER BY idx').bind(id,code,owner)]))[0].results as {idx:number;data:unknown}[]).map(p=>bytes(p.data));
 const size=parts.reduce((n,p)=>n+p.length,0);if(size>MAX){await db.prepare('DELETE FROM upload_chunks WHERE id=?').bind(id).run();return failure('The file is too large (3 MB at most).');}
 const file=new Uint8Array(size);let at=0;for(const p of parts){file.set(p,at);at+=p.length;}
 const type=sniff(file);if(!type){await db.prepare('DELETE FROM upload_chunks WHERE id=?').bind(id).run();return failure('Share a PNG, JPEG, GIF or WebP image, or a PDF.');}
 const status=a.config.moderated&&!a.facilitator?'pending':'approved';
 await db.batch([db.prepare('INSERT OR IGNORE INTO uploads (id,code,participant,nickname,name,type,size,data,status,created) VALUES (?,?,?,?,?,?,?,?,?,?)').bind(id,code,owner,nickname,fileName((()=>{try{return decodeURIComponent(req.headers.get('x-file-name')||'')}catch{return ''}})()),type,size,file,status,Date.now()),db.prepare('DELETE FROM upload_chunks WHERE id=?').bind(id)]);
 return reply({ok:true,id,status},201);
}catch(e){console.error('Upload failed',e);return failure('Unable to save the file right now. Please retry.',503);}finally{if(code)invalidate(code);}}

/** Approved files are readable by anyone who can open the room (their ids are unguessable); pending ones only by their owner and the room's facilitators. */
export async function GET(req:Request){try{
 const q=new URL(req.url).searchParams;const id=clean(q.get('id'),40);if(!/^[a-f0-9-]{36}$/.test(id))return failure('File not found.',404);
 const db=database();const row=await db.prepare('SELECT code,participant,name,type,data,status FROM uploads WHERE id=?').bind(id).first<{code:string;participant:string;name:string;type:string;data:unknown;status:string}>();
 if(!row||row.status==='deleted')return failure('File not found.',404);
 if(row.status!=='approved'){const a=await access(req,db,row.code);if(!a||!(a.facilitator||a.me?.id===row.participant))return failure('File not found.',404);}
 // Files of a private room are only for the teams allowed in (and the presenter).
 else{const session=await db.prepare('SELECT * FROM sessions WHERE code=?').bind(row.code).first<Session>();if(!session||!await canReadRoom(req,db,session))return failure('File not found.',404);}
 const inline=row.type.startsWith('image/')&&q.get('download')!=='1';
 const data=bytes(row.data);return new Response(data.slice().buffer as ArrayBuffer,{headers:{'Content-Type':row.type,'Content-Disposition':`${inline?'inline':'attachment'}; filename*=UTF-8''${encodeURIComponent(row.name)}`,'X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox",'Cache-Control':'private, max-age=3600'}});
}catch(e){console.error('File read failed',e);return failure('The file is unavailable. Please retry.',503);}}
