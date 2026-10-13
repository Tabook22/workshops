import {reply,failure,clean,snapshot} from '../../../lib/snapshot';
import {database,presenterAuthenticated} from '../../../db/server';
import {translateTexts,readTranslationConfig,type Target} from '../../../lib/translate-server';
import {snapshotTexts} from '../../../lib/localization';
import type {Snapshot} from '../../../lib/workshop';
export const dynamic='force-dynamic';
/** Accept only content this exact viewer is authorized to read. Never authorize from unfiltered room data. */
async function allowedTexts(req:Request,body:Record<string,unknown>):Promise<Set<string>|Response>{
 if(body.directory===true){const [rows]=await database().batch([database().prepare("SELECT config FROM sessions WHERE parent IS NULL AND json_extract(config,'$.showOnJoinPage')=1 AND json_extract(config,'$.ended')=0 ORDER BY created DESC LIMIT 100")]);return new Set((rows.results as {config:string}[]).flatMap(r=>{const c=JSON.parse(r.config);return[c.name,c.challenge]}));}
 if(body.account===true){if(!presenterAuthenticated(req))return failure('Presenter access required.',403);const [rows]=await database().batch([database().prepare('SELECT config FROM sessions WHERE parent IS NULL ORDER BY created DESC LIMIT 500')]);return new Set((rows.results as {config:string}[]).flatMap(r=>{const c=JSON.parse(r.config);return[c.name,c.challenge,c.question,c.description]}));}
 if(body.app===true){const [rows]=await database().batch([database().prepare("SELECT value FROM app_settings WHERE key IN ('app','landing')")]);const out=new Set<string>();const collect=(v:unknown)=>{if(typeof v==='string')out.add(v);else if(Array.isArray(v))v.forEach(collect);else if(v&&typeof v==='object')Object.values(v).forEach(collect)};(rows.results as {value:string}[]).forEach(r=>collect(JSON.parse(r.value)));return out;}
 const code=clean(body.code,20).toUpperCase();const res=await snapshot(req,code);if(!res.ok)return res;return new Set(snapshotTexts(await res.json() as Snapshot));
}
export async function POST(req:Request){
 try{
  const origin=req.headers.get('origin');if(origin&&origin!==new URL(req.url).origin)return failure('Invalid request origin.',403);
  if(Number(req.headers.get('content-length')||0)>200000)return failure('Request too large.',413);
  let body:Record<string,unknown>;try{body=await req.json();if(!body||typeof body!=='object'||Array.isArray(body))return failure('Invalid request.')}catch{return failure('Invalid request.')}
  const target=body.target==='ar'||body.target==='en'?body.target as Target:null;if(!target)return failure('Invalid request.');
  const allowed=await allowedTexts(req,body);if(allowed instanceof Response)return allowed;
  const texts=[...new Set((Array.isArray(body.texts)?body.texts:[]).filter((t):t is string=>typeof t==='string'&&t.length<=25000&&allowed.has(t)))].slice(0,80);
  const config=await readTranslationConfig();
  const code=body.app?'app':body.account?'account':body.directory?'directory':clean(body.code,20).toUpperCase();
  const translations=texts.length?await translateTexts(code,texts,target):{};
  return reply({enabled:config.provider!=='off',translations});
 }catch(e){console.error('Translate request failed',(e as Error).message);return reply({enabled:true,translations:{},error:'Translation is temporarily unavailable.'},503)}
}
