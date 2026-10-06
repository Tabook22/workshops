import { env } from 'cloudflare:workers';
export function database():D1Database { if(!(env as unknown as {DB?:D1Database}).DB) throw new Error('Workshop storage unavailable');return (env as unknown as {DB:D1Database}).DB; }
export async function hash(value:string){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));return Array.from(new Uint8Array(bytes)).map(b=>b.toString(16).padStart(2,'0')).join('');}
export function cookie(req:Request,name:string){const value=req.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith(name+'='));return value?decodeURIComponent(value.slice(name.length+1)):'';}
export function setCookie(req:Request,name:string,value:string){return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800${new URL(req.url).protocol==='https:'?'; Secure':''}`;}
