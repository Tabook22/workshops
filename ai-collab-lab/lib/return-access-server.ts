import { hash, setCookie } from '../db/server';
import { studentCookie } from './snapshot';
/* Personal return codes: a short code such as K7-4Q2M brings a participant back to their identity (and team) on any device.
   Only a hash is stored. Codes are unique across workshops, so the code alone is enough to come back. */

// No 0/O, 1/I/L or U/V lookalikes: easy to read from a projector and to type on a phone.
const ALPHABET='23456789ABCDEFGHJKMNPQRSTWXYZ';
const ARABIC_DIGITS:Record<string,string>={'٠':'0','١':'1','٢':'2','٣':'3','٤':'4','٥':'5','٦':'6','٧':'7','٨':'8','٩':'9','۰':'0','۱':'1','۲':'2','۳':'3','۴':'4','۵':'5','۶':'6','۷':'7','۸':'8','۹':'9'};
/** Uppercase, Arabic-Indic digits to ASCII, separators and spaces removed. */
export const normalizeReturnCode=(value:unknown)=>String(value??'').slice(0,40).replace(/[٠-٩۰-۹]/g,d=>ARABIC_DIGITS[d]).toUpperCase().replace(/[^A-Z0-9]/g,'');
const format=(raw:string)=>raw.slice(0,2)+'-'+raw.slice(2);
export const returnHash=(raw:string)=>hash('return-code:'+raw);
function randomCode(){let out='';while(out.length<6){const bytes=new Uint8Array(12);crypto.getRandomValues(bytes);for(const b of bytes)if(b<ALPHABET.length*8&&out.length<6)out+=ALPHABET[b%ALPHABET.length];}return out;}
/** A fresh code for a main-workshop identity; replaces (and so invalidates) any earlier one. Returns the code to show once. */
export async function issueReturnCode(db:D1Database,participant:string){
 for(let i=0;i<5;i++){const raw=randomCode();const h=await returnHash(raw);if(await db.prepare('SELECT 1 FROM participants WHERE returnHash=?').bind(h).first())continue;await db.prepare('UPDATE participants SET returnHash=? WHERE id=?').bind(h,participant).run();return format(raw);}
 throw new Error('Could not create a return code');
}

/* Rate limiting: failed attempts per client address and overall, in a 15-minute window.
   A whole class may share one address (campus Wi-Fi), so the per-address limit is generous; the search space (29^6) is not. */
const WINDOW=15*60_000;
export const clientAddress=(req:Request)=>req.headers.get('cf-connecting-ip')||req.headers.get('x-real-ip')||(req.headers.get('x-forwarded-for')||'').split(',')[0].trim()||'local';
export type Limit={key:string;max:number};
export async function rateLimited(db:D1Database,limits:Limit[]){const now=Date.now();for(const l of limits){const row=await db.prepare('SELECT count,reset FROM access_attempts WHERE key=?').bind(l.key).first<{count:number;reset:number}>();if(row&&row.reset>now&&row.count>=l.max)return Math.ceil((row.reset-now)/60_000);}return 0;}
export async function recordFailure(db:D1Database,limits:Limit[]){const now=Date.now();await db.batch([db.prepare('DELETE FROM access_attempts WHERE reset<=?').bind(now),...limits.map(l=>db.prepare('INSERT INTO access_attempts(key,count,reset) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1').bind(l.key,now+WINDOW))]);}
export const returnLimits=(req:Request):Limit[]=>[{key:'return:ip:'+clientAddress(req),max:30},{key:'return:all',max:600}];

/** Cookies that put this browser back into the identity: the main workshop and, if they have one, their team room. */
export async function restoreCookies(req:Request,db:D1Database,participant:{id:string;code:string}){
 const room=await db.prepare("SELECT p.id,p.code FROM participants p JOIN sessions s ON s.code=p.code WHERE p.member=? AND p.role!='guest' AND s.parent=? LIMIT 1").bind(participant.id,participant.code).first<{id:string;code:string}>();
 return {room:room?.code||null,cookies:[studentCookie(req,participant.code,participant.id),...(room?[studentCookie(req,room.code,room.id)]:[])]};
}
/** "Not me / sign out on this device": forget this workshop's identity and its room identities in this browser. */
export async function forgetCookies(req:Request,db:D1Database,code:string){
 const rooms=(await db.batch([db.prepare('SELECT code FROM sessions WHERE parent=?').bind(code)]))[0].results as {code:string}[];
 return [code,...rooms.map(r=>r.code)].map(c=>setCookie(req,'student_'+c,'',0));
}

/* Optional "Protect my account": a username (unique in the workshop) and a 4–6 digit PIN, salted with the participant id and hashed.
   A PIN is short, so failures are limited per username as well as per address and per workshop. */
const toAscii=(v:string)=>v.replace(/[٠-٩۰-۹]/g,d=>ARABIC_DIGITS[d]);
export const normalizeUsername=(value:unknown)=>toAscii(String(value??'').normalize('NFKC').trim().toLowerCase()).replace(/\s+/g,'.').slice(0,40);
export const normalizePin=(value:unknown)=>toAscii(String(value??'')).replace(/\s/g,'').slice(0,12);
export const pinHash=(participant:string,pin:string)=>hash('pin:'+participant+':'+pin);
/** The username and PIN from a request, or the reason they cannot be used. */
export function credentials(b:Record<string,unknown>):{username:string;pin:string}|string{
 const username=normalizeUsername(b.username),pin=normalizePin(b.pin);
 if(!/^[\p{L}\p{N}._-]{3,20}$/u.test(username))return 'Choose a username of 3–20 letters or numbers.';
 if(!/^\d{4,6}$/.test(pin))return 'Choose a PIN of 4 to 6 digits.';
 return {username,pin};
}
export const usernameTaken=async(db:D1Database,code:string,username:string,except='')=>!!await db.prepare('SELECT 1 FROM participants WHERE code=? AND username=? AND id!=?').bind(code,username,except).first();
export const pinLimits=(req:Request,code:string,username:string):Limit[]=>[{key:'pin:user:'+code+':'+username,max:5},{key:'pin:ip:'+clientAddress(req),max:30},{key:'pin:ws:'+code,max:100}];
