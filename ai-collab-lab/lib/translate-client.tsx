"use client";
import {useEffect,useSyncExternalStore} from 'react';
import {Languages} from 'lucide-react';
import {builtInTranslation} from './ui-translation';
import {appUrl} from './urls';
import type {Language,Snapshot} from './workshop';
import {detectLang,needsTranslation,snapshotTexts,translatedSnapshot,localizeNumbers,type Target} from './localization';
export {detectLang};
const cache=new Map<string,string>();
type Scope={code?:string;directory?:boolean;account?:boolean;app?:boolean};
type State={pending:boolean;enabled:boolean|null;error:string;retryAt:number};
const states=new Map<string,State>();
const listeners=new Set<()=>void>();let version=0;
const bump=()=>{version++;listeners.forEach(l=>l())};
const subscribe=(l:()=>void)=>{listeners.add(l);return()=>{listeners.delete(l)}};
const useVersion=()=>useSyncExternalStore(subscribe,()=>version,()=>0);
const key=(target:Target,text:string)=>target+'\u0000'+text;
const scopeKey=(scope:Scope,target:Target)=>JSON.stringify(scope)+':'+target;
const SHOW_ORIGINAL='ai-collab-show-original';
let showOriginal=typeof window!=='undefined'&&(()=>{try{return localStorage.getItem(SHOW_ORIGINAL)==='1'}catch{return false}})();
export function setShowOriginal(v:boolean){showOriginal=v;try{localStorage.setItem(SHOW_ORIGINAL,v?'1':'0')}catch{}bump()}
export const useShowOriginal=()=>{useVersion();return showOriginal};
async function fetchTexts(scope:Scope,target:Target,texts:string[]){
 const sk=scopeKey(scope,target);const state=states.get(sk);if(state?.pending||Date.now()<(state?.retryAt||0))return;
 states.set(sk,{pending:true,enabled:state?.enabled??null,error:'',retryAt:0});bump();
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),25000);
 try{
  const res=await fetch(appUrl('/api/translate'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...scope,target,texts}),signal:controller.signal});
  const data=await res.json() as {enabled?:boolean;translations?:Record<string,string>;error?:string};
  if(!res.ok)throw new Error(data.error||'Translation unavailable');
  for(const [source,text] of Object.entries(data.translations||{}))if(texts.includes(source)&&typeof text==='string'&&text.trim())cache.set(key(target,source),text);
  const incomplete=texts.some(t=>!cache.has(key(target,t))&&!builtInTranslation(t,target));
  states.set(sk,{pending:false,enabled:data.enabled!==false,error:incomplete?(data.enabled===false?'disabled':'unavailable'):'',retryAt:incomplete||data.enabled===false?Date.now()+30000:0});
 }catch{states.set(sk,{pending:false,enabled:state?.enabled??null,error:'unavailable',retryAt:Date.now()+15000})}
 finally{clearTimeout(timeout);bump()}
}
/** One scope at a time, small sequential batches, automatic retry, no cross-room authorization assumptions. */
export function useContentTranslation(scope:Scope,texts:string[],lang:Language){
 const v=useVersion(),target=lang==='ar'||lang==='en'?lang:null;
 const sk=JSON.stringify(scope),serialized=JSON.stringify([...new Set(texts.filter(Boolean))]);
 useEffect(()=>{
  if(!target)return;let stopped=false;
  const request=()=>{if(stopped)return;const all=JSON.parse(serialized) as string[];const missing=all.filter(t=>needsTranslation(t,target)&&!cache.has(key(target,t))&&!builtInTranslation(t,target));if(missing.length)void fetchTexts(JSON.parse(sk),target,missing.slice(0,60))};
  const debounce=setTimeout(request,0),timer=setInterval(request,5000);return()=>{stopped=true;clearTimeout(debounce);clearInterval(timer)};
 },[sk,serialized,target,v]);
 const state=target?states.get(sk+':'+target):undefined;
 const missing=target?texts.some(t=>needsTranslation(t,target)&&!cache.has(key(target,t))&&!builtInTranslation(t,target)):false;
 const tr=(text:string)=>!target||showOriginal?text:localizeNumbers(builtInTranslation(text,target)||cache.get(key(target,text))||text,target);
 return{tr,pending:missing&&(!state||state.pending||!state.error),disabled:missing&&state?.enabled===false,error:missing?state?.error||'':'',translated:!!target&&texts.some(t=>cache.has(key(target,t))||!!builtInTranslation(t,target)),retry:()=>{if(target){states.delete(sk+':'+target);bump()}}};
}
export function useTranslatedSnapshot(data:Snapshot|null,lang:Language):Snapshot|null{
 const content=useContentTranslation({code:data?.code||''},data?snapshotTexts(data):[],lang);
 return data?translatedSnapshot(data,content.tr):null;
}
export function TranslationNotice({data,lang}:{data:Snapshot|null;lang:Language}){
 const original=useShowOriginal();const content=useContentTranslation({code:data?.code||''},data?snapshotTexts(data):[],lang);
 if(!data||lang==='both'||(!content.translated&&!content.pending&&!content.error&&!original))return null;
 const ar=lang==='ar';
 const text=original?(ar?'تُعرض النصوص بلغتها الأصلية.':'Showing original text.'):content.disabled?(ar?'الترجمة التلقائية غير مفعّلة. اطلب من مقدم الورشة تفعيل خدمة الترجمة في الإعدادات.':'Automatic translation is not configured. Ask the presenter to enable a translation service in Settings.'):content.error?(ar?'تعذّرت ترجمة بعض النصوص. تُعرض الأصول مؤقتاً وسنحاول مجدداً.':'Some text could not be translated. Originals are shown temporarily; retrying.'):content.pending?(ar?'جارٍ ترجمة محتوى الورشة إلى العربية…':'Translating workshop content into English…'):(ar?'يُعرض محتوى الورشة مترجماً إلى العربية دون تغيير النصوص الأصلية.':'Workshop content is shown in English without changing the original text.');
 return <div className="translation-notice" role="status"><Languages size={15}/><span>{text}</span>{content.error&&<button type="button" className="link-button" onClick={content.retry}>{ar?'حاول مجدداً':'Retry'}</button>}{(content.translated||original)&&<button type="button" className="link-button" onClick={()=>setShowOriginal(!original)}>{original?(ar?'عرض الترجمة':'Show translation'):(ar?'عرض الأصل':'Show original')}</button>}</div>;
}
export function TranslatedMark({orig,lang}:{orig?:{title:string;text:string};lang:Language}){if(!orig)return null;return <span className="translated-mark" title={(lang==='ar'?'النص الأصلي: ':'Original: ')+orig.title+'\n'+orig.text} tabIndex={0}><Languages size={12}/>{lang==='ar'?'مترجم':'Translated'}</span>}
