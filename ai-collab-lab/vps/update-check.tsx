import {useEffect,useState} from 'react';
import {RefreshCw} from 'lucide-react';
import {appUrl} from '../lib/urls';
import {useUiLang,tx} from '../lib/i18n';

declare const __APP_BUILD__: string;
const mine=typeof __APP_BUILD__==='string'?__APP_BUILD__:'';
let snoozed=false;

/** Someone is in the middle of something: typing text or working in a dialog. */
function busy(){const el=document.activeElement as HTMLInputElement|HTMLTextAreaElement|null;return !!document.querySelector('.modal')||(!!el&&/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)&&!!el.value);}

/** After a new release, open pages pick it up on their own: student phones and projector screens reload when
    idle (their drafts are kept per stage in session storage), while the presenter is offered a Reload button so
    nothing refreshes in the middle of a presentation. Checked every minute and when a page comes back into view. */
export default function UpdateCheck({presenter}:{presenter:boolean}){const lang=useUiLang();const [ready,setReady]=useState(false);
 useEffect(()=>{if(!mine)return;let stopped=false;
  const check=async()=>{try{const r=await fetch(appUrl('/healthz'),{cache:'no-store'});const j=await r.json() as {build?:string};if(stopped||!j.build||j.build===mine)return;if(!presenter&&!busy()&&document.visibilityState==='visible')location.reload();else if(!snoozed)setReady(true);}catch{/* offline: try again later */}};
  const timer=setInterval(()=>void check(),60000);const onVisible=()=>{if(document.visibilityState==='visible')void check()};
  document.addEventListener('visibilitychange',onVisible);
  return()=>{stopped=true;clearInterval(timer);document.removeEventListener('visibilitychange',onVisible)};
 },[presenter]);
 if(!ready)return null;
 return <div className="update-banner" role="status" dir={lang==='ar'?'rtl':'ltr'}><RefreshCw size={16}/><span>{tx(lang,'A new version of the app is ready.','نسخة جديدة من التطبيق جاهزة.')}</span><button className="btn small primary" onClick={()=>location.reload()}>{tx(lang,'Reload','إعادة التحميل')}</button><button className="btn small ghost" onClick={()=>{snoozed=true;setReady(false)}}>{tx(lang,'Later','لاحقاً')}</button></div>;
}
