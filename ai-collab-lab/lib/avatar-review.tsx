"use client";
import {useCallback,useEffect,useState} from 'react';
import {Check,ImageUp,X} from 'lucide-react';
import {T} from './client';
import {appUrl} from './urls';
import {displayNumber} from './i18n';
import type {Language} from './workshop';

type Pending={id:string;nickname:string;created:number};

/** Presenter: character pictures participants uploaded, waiting for approval. Hidden when there are none. */
export default function AvatarReview({code,lang}:{code:string;lang:Language}){
 const t=(en:string,ar:string)=><T en={en} ar={ar} lang={lang}/>;
 const [pending,setPending]=useState<Pending[]>([]),[busy,setBusy]=useState(''),[error,setError]=useState('');
 const endpoint=appUrl('/api/room-experience');
 const load=useCallback(async(signal?:AbortSignal)=>{const response=await fetch(endpoint+'?pictures=1&code='+encodeURIComponent(code),{signal});if(!response.ok)return;const result=await response.json() as {pending?:Pending[]};setPending(result.pending||[])},[code,endpoint]);
 useEffect(()=>{const abort=new AbortController();const update=()=>{if(document.visibilityState==='visible')void load(abort.signal).catch(()=>{})};update();const timer=setInterval(update,20000);return()=>{abort.abort();clearInterval(timer)}},[load]);
 async function decide(id:string,approve:boolean){if(busy)return;setBusy(id);setError('');try{
  const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code,action:'picture',id,approve})});const result=await response.json() as {error?:string};
  if(!response.ok&&response.status!==404)throw Error(result.error||'Unable to save.');setPending(p=>p.filter(x=>x.id!==id));
 }catch(e){setError((e as Error).message)}finally{setBusy('')}}
 if(!pending.length)return null;
 return <section className="avatar-review" aria-label={lang==='ar'?'صور بانتظار الموافقة':'Pictures awaiting approval'}>
  <div className="section-heading"><h2><ImageUp size={20}/> {t('Character pictures awaiting approval','صور شخصيات بانتظار الموافقة')} <span className="pill">{displayNumber(pending.length,lang)}</span></h2></div>
  <p className="muted">{t('Participants uploaded these for their seat. Nobody else sees a picture until you approve it.','رفع المشاركون هذه الصور لمقاعدهم. لا يراها أحد غيرهم حتى توافق عليها.')}</p>
  {error&&<p className="error" role="alert">{error}</p>}
  <div className="avatar-review-grid">{pending.map(p=><figure key={p.id}>
   <img src={appUrl('/api/upload?id='+p.id)} alt="" width={120} height={120}/>
   <figcaption dir="auto">{p.nickname}</figcaption>
   <div className="actions"><button type="button" className="btn small primary" disabled={!!busy} onClick={()=>void decide(p.id,true)}><Check size={15}/>{t('Approve','موافقة')}</button><button type="button" className="btn small secondary" disabled={!!busy} onClick={()=>void decide(p.id,false)}><X size={15}/>{t('Decline','رفض')}</button></div>
  </figure>)}</div>
 </section>;
}
