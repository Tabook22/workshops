"use client";
import {useEffect,useState,useSyncExternalStore} from 'react';
import {QRCodeSVG} from 'qrcode.react';
import {ArrowRight,Copy,QrCode,RefreshCw} from 'lucide-react';
import {T,copyText} from './client';
import {appUrl} from './urls';
import type {Language} from './workshop';

export type JoinableWorkshop={code:string;name:string;challenge:string;language:Language};
const subscribeOrigin=()=>()=>{};
const readOrigin=()=>window.location.origin;
const serverOrigin=()=>'';
/** The QR and button must always point to the same participant URL, never presenter controls. */
export function WorkshopJoinCard({workshop,lang,copy=false}:{workshop:JoinableWorkshop;lang:Language;copy?:boolean}){
 const origin=useSyncExternalStore(subscribeOrigin,readOrigin,serverOrigin);
 const [message,setMessage]=useState('');
 const href=appUrl('/join?code=')+encodeURIComponent(workshop.code);
 const url=origin+href;
 const tr=(en:string,ar:string)=><T en={en} ar={ar} lang={lang}/>;
 return <article className="workshop-join-card" dir={lang==='ar'?'rtl':'ltr'}>
  <div className="workshop-join-qr">{origin?<QRCodeSVG value={url} size={176} level="M" marginSize={4} bgColor="#fff" fgColor="#101216" title={lang==='ar'?`امسح للانضمام إلى ${workshop.name}`:`Scan to join ${workshop.name}`}/>:<span className="spinner"/>}</div>
  <div className="workshop-join-info"><span className="pill lime"><QrCode size={14}/>{tr('Scan or click to join','امسح أو اضغط للانضمام')}</span><h3 dir="auto">{workshop.name}</h3>{workshop.challenge!==workshop.name&&<p dir="auto">{workshop.challenge}</p>}<span className="workshop-join-code" dir="ltr">{workshop.code}</span><a className="btn primary" href={href} aria-label={lang==='ar'?`انضم إلى ${workshop.name}`:`Join ${workshop.name}`}>{tr('Join workshop','انضم إلى الورشة')}<ArrowRight size={17}/></a>{copy&&<button type="button" className="btn secondary" onClick={()=>void copyText(url).then(ok=>setMessage(ok?(lang==='ar'?'تم نسخ رابط الانضمام':'Join link copied'):(lang==='ar'?'تعذّر النسخ. حدد الرابط وانسخه أدناه.':'Could not copy. Select the link below.')))} disabled={!origin}><Copy size={16}/>{tr('Copy join link','نسخ رابط الانضمام')}</button>}<small>{tr('No workshop code to type. A nickname may be requested.','لا حاجة لكتابة رمز الورشة. قد يُطلب اسم مستعار.')}</small>{copy&&<a className="workshop-share-url" href={href} dir="ltr">{url}</a>}{message&&<small role="status">{message}</small>}</div>
 </article>;
}

/** Only explicitly listed, active main workshops. No content, identities, room codes or tokens. */
export function WorkshopDirectory({lang}:{lang:Language}){
 const [workshops,setWorkshops]=useState<JoinableWorkshop[]|null>(null);
 const [error,setError]=useState(false);
 const [attempt,setAttempt]=useState(0);
 const tr=(en:string,ar:string)=><T en={en} ar={ar} lang={lang}/>;
 useEffect(()=>{
  const controller=new AbortController();
  const load=async()=>{try{const res=await fetch(appUrl('/api/workshop?directory=1'),{cache:'no-store',signal:controller.signal});if(!res.ok)throw new Error('Unavailable');const data=await res.json() as {workshops:JoinableWorkshop[]};if(!Array.isArray(data.workshops))throw new Error('Invalid response');setWorkshops(data.workshops);setError(false)}catch{if(!controller.signal.aborted){setError(true);setWorkshops(null)}}};
  void load();const timer=setInterval(()=>{if(document.visibilityState==='visible')void load()},30000);
  const visible=()=>{if(document.visibilityState==='visible')void load()};document.addEventListener('visibilitychange',visible);
  return()=>{controller.abort();clearInterval(timer);document.removeEventListener('visibilitychange',visible)};
 },[attempt]);
 return <section className="workshop-directory" aria-labelledby="workshop-directory-title" aria-busy={!workshops&&!error}>
  <div><h2 id="workshop-directory-title">{tr('Choose your workshop','اختر ورشتك')}</h2><p className="muted">{tr('Scan the QR on your phone, or click Join workshop on this device.','امسح رمز QR بهاتفك، أو اضغط «انضم إلى الورشة» على هذا الجهاز.')}</p></div>
  {error?<div className="panel stack"><p role="alert">{tr('We couldn’t load the workshop list. You can still use a code below.','تعذّر تحميل قائمة الورش. يمكنك استخدام الرمز أدناه.')}</p><button type="button" className="btn secondary" onClick={()=>{setError(false);setAttempt(n=>n+1)}}><RefreshCw size={16}/>{tr('Try again','حاول مجدداً')}</button></div>:!workshops?<p className="connecting" role="status"><span className="spinner"/>{tr('Loading available workshops…','جارٍ تحميل الورش المتاحة…')}</p>:workshops.length?<div className="workshop-directory-grid">{workshops.map(workshop=><WorkshopJoinCard key={workshop.code} workshop={workshop} lang={lang}/>)}</div>:<div className="panel directory-empty"><QrCode size={24}/><div><strong>{tr('No public workshops right now','لا توجد ورش عامة حالياً')}</strong><p>{tr('Ask your presenter for a workshop link, QR code, or code. Workshops appear here only when the presenter chooses to share them.','اطلب من مقدم الورشة رابطاً أو رمز QR أو رمز الورشة. تظهر الورش هنا فقط عندما يختار المقدم مشاركتها.')}</p></div></div>}
 </section>;
}
