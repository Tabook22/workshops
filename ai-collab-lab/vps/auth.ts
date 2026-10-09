import { readFileSync, writeFileSync, renameSync, chmodSync } from 'node:fs';
import { scryptSync, randomBytes, timingSafeEqual, createHmac } from 'node:crypto';
type Credentials = {username:string;salt:string;hash:string;secret:string};
const file = process.env.PRESENTER_AUTH_FILE;
let credentials = file ? JSON.parse(readFileSync(file, 'utf8')) as Credentials : null;
export const authEnabled = !!credentials;
const attempts = new Map<string,{count:number;until:number}>();
const SESSION_MS = 12*3600000;
export function presenterAuthenticated(req:Request) {
  if (!credentials) return false;
  const token=req.headers.get('cookie')?.split(';').map(v=>v.trim()).find(v=>v.startsWith('presenter_session='))?.slice(18)||'';
  const [expiry,nonce,signature]=token.split('.');
  if(!expiry||!nonce||!signature||Number(expiry)<Date.now())return false;
  const expected=createHmac('sha256',credentials.secret).update(expiry+'.'+nonce).digest('hex');
  return signature.length===expected.length&&timingSafeEqual(Buffer.from(signature),Buffer.from(expected));
}
export function currentUsername() { return credentials?.username || ''; }
function sessionCookie(basePath:string) {
  const payload=String(Date.now()+SESSION_MS)+'.'+randomBytes(24).toString('hex');
  const token=payload+'.'+createHmac('sha256',credentials!.secret).update(payload).digest('hex');
  return `presenter_session=${token}; Path=${basePath}; HttpOnly; Secure; SameSite=Lax; Max-Age=43200`;
}
/** Shared rate limit for password checks (login and credential changes): 10 failures per IP per 15 minutes. */
function limited(req:Request) {
  const ip=req.headers.get('x-real-ip')||'local'; const now=Date.now();
  for(const [key,value] of attempts)if(value.until<now)attempts.delete(key);
  const state=attempts.get(ip)||{count:0,until:now+900000};
  return {blocked:state.count>=10,fail(){state.count++;attempts.set(ip,state)},clear(){attempts.delete(ip)}};
}
function passwordMatches(password:unknown) {
  const value=typeof password==='string'&&password.length<=256?password:'';
  return timingSafeEqual(scryptSync(value,credentials!.salt,64),Buffer.from(credentials!.hash,'hex'));
}
export function accountLogin(req:Request, username:unknown,password:unknown,basePath='/workshops') {
  if(!credentials)return new Response(null,{status:404});
  const limit=limited(req);
  if(limit.blocked)return Response.json({error:'Too many login attempts. Try again in 15 minutes.'},{status:429});
  if(!passwordMatches(password)||username!==credentials.username){limit.fail();return Response.json({error:'Incorrect username or password.'},{status:401});}
  limit.clear();
  return Response.json({ok:true},{headers:{'Set-Cookie':sessionCookie(basePath),'Cache-Control':'no-store'}});
}
/**
 * Change the admin username and/or password. Requires a signed-in session and the current password.
 * The file is replaced atomically (write + rename, mode 600). The signing secret is rotated, so every
 * other device is signed out; this browser receives a fresh session cookie.
 */
export function updateCredentials(req:Request, body:Record<string,unknown>, basePath='/workshops') {
  if(!credentials||!file)return Response.json({error:'Presenter accounts are not enabled on this server.'},{status:404});
  if(!presenterAuthenticated(req))return Response.json({error:'Presenter login required.'},{status:401});
  const limit=limited(req);
  if(limit.blocked)return Response.json({error:'Too many login attempts. Try again in 15 minutes.'},{status:429});
  if(!passwordMatches(body.currentPassword)){limit.fail();return Response.json({error:'Your current password is incorrect.'},{status:403});}
  limit.clear();
  const username=typeof body.username==='string'?body.username.trim():credentials.username;
  const password=typeof body.newPassword==='string'?body.newPassword:'';
  if(!/^[A-Za-z0-9._@-]{3,40}$/.test(username))return Response.json({error:'Username must be 3–40 letters, numbers or . _ - @'},{status:400});
  if(password){
    if(password.length<10||password.length>200)return Response.json({error:'The new password must be at least 10 characters.'},{status:400});
    if(password.toLowerCase().includes(username.toLowerCase())||/^(.)\1+$/.test(password))return Response.json({error:'Choose a password that does not contain the username or repeat one character.'},{status:400});
  } else if(username===credentials.username) return Response.json({error:'Nothing to change.'},{status:400});
  const salt=password?randomBytes(16).toString('hex'):credentials.salt;
  const next:Credentials={username,salt,hash:password?scryptSync(password,salt,64).toString('hex'):credentials.hash,secret:randomBytes(32).toString('hex')};
  const temp=file+'.tmp-'+process.pid;
  writeFileSync(temp,JSON.stringify(next),{mode:0o600});
  try{chmodSync(temp,0o600)}catch{/* Windows */}
  renameSync(temp,file);
  credentials=next;
  return Response.json({ok:true,username},{headers:{'Set-Cookie':sessionCookie(basePath),'Cache-Control':'no-store'}});
}
