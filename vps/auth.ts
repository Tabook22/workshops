import { readFileSync } from 'node:fs';
import { scryptSync, randomBytes, timingSafeEqual, createHmac } from 'node:crypto';
const file = process.env.PRESENTER_AUTH_FILE;
const credentials = file ? JSON.parse(readFileSync(file, 'utf8')) as {username:string;salt:string;hash:string;secret:string} : null;
export const authEnabled = !!credentials;
const attempts = new Map<string,{count:number;until:number}>();
export function presenterAuthenticated(req:Request) {
  if (!credentials) return false;
  const token=req.headers.get('cookie')?.split(';').map(v=>v.trim()).find(v=>v.startsWith('presenter_session='))?.slice(18)||'';
  const [expiry,nonce,signature]=token.split('.');
  if(!expiry||!nonce||!signature||Number(expiry)<Date.now())return false;
  const expected=createHmac('sha256',credentials.secret).update(expiry+'.'+nonce).digest('hex');
  return signature.length===expected.length&&timingSafeEqual(Buffer.from(signature),Buffer.from(expected));
}
export function accountLogin(req:Request, username:unknown,password:unknown,basePath='/workshops') {
  if(!credentials)return new Response(null,{status:404});
  const ip=req.headers.get('x-real-ip')||'local'; const now=Date.now();
  for(const [key,value] of attempts)if(value.until<now)attempts.delete(key);
  const state=attempts.get(ip)||{count:0,until:now+900000};
  if(state.count>=10)return Response.json({error:'Too many login attempts. Try again in 15 minutes.'},{status:429});
  const value=typeof password==='string'&&password.length<=256?password:'';
  const actual=scryptSync(value,credentials.salt,64); const expected=Buffer.from(credentials.hash,'hex');
  if(!timingSafeEqual(actual,expected)||username!==credentials.username){state.count++;attempts.set(ip,state);return Response.json({error:'Incorrect username or password.'},{status:401});}
  attempts.delete(ip);
  const payload=String(now+12*3600000)+'.'+randomBytes(24).toString('hex');
  const token=payload+'.'+createHmac('sha256',credentials.secret).update(payload).digest('hex');
  return Response.json({ok:true},{headers:{'Set-Cookie':`presenter_session=${token}; Path=${basePath}; HttpOnly; Secure; SameSite=Lax; Max-Age=43200`,'Cache-Control':'no-store'}});
}
