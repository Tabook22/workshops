"use client";
/* Coming back to a workshop: "Welcome back" on the same device, the "My room" area (enter, switch, leave),
   and the list of workshops this browser already joined. Every string is bilingual; layout follows dir. */
import {useEffect,useState} from 'react';
import {DoorOpen,ArrowRight,LogOut,Repeat,Lock,Users,Sparkles,KeyRound,Copy,QrCode,RefreshCw,Check,UserX} from 'lucide-react';
import {QRCodeSVG} from 'qrcode.react';
import {localizeNumbers} from './localization';
import {action,copyText} from './client';
import {appUrl} from './urls';
import type {Snapshot,Language} from './workshop';

type L=(en:string,ar:string)=>string;
const translator=(lang:Language):L=>(en,ar)=>localizeNumbers(lang==='ar'?ar:en,lang);
export const goToWorkshop=(code:string)=>{location.href=appUrl('/join?code=')+encodeURIComponent(code)};
const LOCKED_HELP:[string,string]=['The presenter has locked the teams. Ask the presenter if you need to change team.','قفل مقدم الورشة الفرق. اطلب من مقدم الورشة إن احتجت إلى تغيير فريقك.'];

/** "Welcome back" is shown once per browser session on the main workshop, to someone this browser already knows. */
const BACK_KEY='ai-collab-back:';
export const welcomedBack=(code:string)=>{try{return sessionStorage.getItem(BACK_KEY+code)==='1'}catch{return false}};
const markWelcomed=(code:string)=>{try{sessionStorage.setItem(BACK_KEY+code,'1')}catch{}};

export function WelcomeBack({data,lang,onContinue,children}:{data:Snapshot;lang:Language;onContinue:()=>void;children?:React.ReactNode}){
 const t=translator(lang);const me=data.me!;const room=(data.rooms||[]).find(r=>r.code===me.room);
 const done=()=>{markWelcomed(data.code);onContinue()};
 return <section className="welcome-back panel" aria-labelledby="welcome-back-title">
  <span className="welcome-back-icon" aria-hidden="true"><Sparkles size={26}/></span>
  <span className="eyebrow">{t('WELCOME BACK','مرحباً بعودتك')}</span>
  <h1 id="welcome-back-title">{t('Welcome back,','مرحباً بعودتك،')} <bdi>{me.nickname}</bdi></h1>
  {room?<><p className="welcome-back-room">{t('You’re in','أنت في')} <strong><bdi>{room.emoji?room.emoji+' ':''}{room.name}</bdi></strong></p>
   <p className="muted">{t('Everything you shared is saved. Pick up where you left off.','كل ما شاركته محفوظ. تابع من حيث توقفت.')}</p>
   <button className="btn primary full-width btn-lg" onClick={()=>{markWelcomed(data.code);goToWorkshop(room.code)}}><DoorOpen size={19}/>{t('Enter your room','ادخل غرفتك')} <ArrowRight size={18}/></button>
   <button className="btn secondary full-width" onClick={done}>{t('Stay in the main workshop','ابقَ في الورشة الرئيسية')}</button></>
  :<><p className="muted">{data.config.teamRooms?t('You haven’t chosen a team yet. Choose one to start.','لم تختر فريقاً بعد. اختر فريقاً للبدء.'):t('Everything you shared is saved. Pick up where you left off.','كل ما شاركته محفوظ. تابع من حيث توقفت.')}</p>
   <button className="btn primary full-width btn-lg" onClick={done}>{data.config.teamRooms?<><Users size={18}/>{t('Choose a team','اختر فريقاً')}</>:t('Continue to the workshop','تابع إلى الورشة')} <ArrowRight size={18}/></button></>}
  {children}
 </section>;
}

/** "My room": where you belong, with Enter, Switch room and Leave room. Leaving keeps every past contribution under your name. */
export function MyRoomPanel({data,lang,refresh,onSwitch,children}:{data:Snapshot;lang:Language;refresh:()=>Promise<void>;onSwitch:()=>void;children?:React.ReactNode}){
 const t=translator(lang);const room=(data.rooms||[]).find(r=>r.code===data.me?.room);
 const [leaving,setLeaving]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const locked=!!data.config.lockTeams;
 if(!room&&!children)return null;
 async function leave(){setBusy(true);setError('');try{await action({action:'leaveRoom',code:data.code});setLeaving(false);await refresh()}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
 return <section className="my-room-panel panel" aria-labelledby="my-room-title">
  <span className="eyebrow" id="my-room-title">{t('MY ROOM','غرفتي')}</span>
  {room&&<><h2 className="my-room-name"><bdi>{room.emoji?room.emoji+' ':''}{room.name}</bdi></h2>{room.challenge&&<p className="muted"><bdi>{room.challenge}</bdi></p>}
   <button className="btn primary full-width" onClick={()=>goToWorkshop(room.code)}><DoorOpen size={18}/>{t('Enter your room','ادخل غرفتك')} <ArrowRight size={17}/></button>
   {locked?<p className="inline-help my-room-locked"><Lock size={15}/> {t(...LOCKED_HELP)}</p>
   :leaving?<div className="my-room-confirm" role="group" aria-label={t('Leave room','مغادرة الغرفة')}><p>{t(`Leave ${room.name}? Your ideas and comments stay there under your name. You can join another team afterwards.`,`مغادرة ${room.name}؟ تبقى أفكارك وتعليقاتك هناك باسمك، ويمكنك الانضمام إلى فريق آخر بعدها.`)}</p><div className="actions"><button className="btn danger" disabled={busy} onClick={()=>void leave()}><LogOut size={16}/>{t('Yes, leave','نعم، غادر')}</button><button className="btn secondary" disabled={busy} onClick={()=>setLeaving(false)}>{t('Cancel','إلغاء')}</button></div></div>
   :<div className="my-room-actions"><button className="btn secondary" onClick={onSwitch}><Repeat size={16}/>{t('Switch room','غيّر الغرفة')}</button><button className="btn ghost" onClick={()=>setLeaving(true)}><LogOut size={16}/>{t('Leave room','غادر الغرفة')}</button></div>}
  </>}
  {error&&<div role="alert" className="error">{error}</div>}
  {children}
 </section>;
}
export const lockedTeamsText=(lang:Language)=>translator(lang)(...LOCKED_HELP);

type Mine={code:string;name:string;challenge:string;nickname:string;ended:boolean;room:{code:string;name:string}|null};
/** On the join page: workshops this browser already joined, so a returning participant goes straight back in. */
export function ResumeWorkshops({lang}:{lang:Language}){
 const t=translator(lang);const [list,setList]=useState<Mine[]>([]);
 useEffect(()=>{let live=true;fetch(appUrl('/api/workshop?mine=1'),{cache:'no-store'}).then(r=>r.ok?r.json() as Promise<{workshops?:Mine[]}>:{workshops:[]}).then(r=>{if(live)setList((r.workshops||[]).filter(w=>!w.ended).slice(0,3))}).catch(()=>{});return ()=>{live=false}},[]);
 if(!list.length)return null;
 return <section className="resume-workshops" aria-label={t('Continue where you left off','تابع من حيث توقفت')}>
  {list.map(w=><div className="welcome-back panel compact" key={w.code}>
   <span className="eyebrow">{t('WELCOME BACK','مرحباً بعودتك')} · <span dir="ltr">{w.code}</span></span>
   <h2>{t('Welcome back,','مرحباً بعودتك،')} <bdi>{w.nickname}</bdi></h2>
   <p>{w.room?<>{t('You’re in','أنت في')} <strong><bdi>{w.room.name}</bdi></strong> · </>:null}<bdi className="muted">{w.name}</bdi></p>
   {w.room?<button className="btn primary full-width" onClick={()=>goToWorkshop(w.room!.code)}><DoorOpen size={18}/>{t('Enter your room','ادخل غرفتك')} <ArrowRight size={17}/></button>
   :<button className="btn primary full-width" onClick={()=>goToWorkshop(w.code)}>{t('Continue to the workshop','تابع إلى الورشة')} <ArrowRight size={17}/></button>}
  </div>)}
 </section>;
}

/* Personal return code. The server keeps only a hash, so this browser remembers the code to show it again;
   a participant who lost it makes a new one here (or asks the presenter), which retires the old one. */
const CODE_KEY='ai-collab-return:';
export const readReturnCode=(workshop:string)=>{try{return localStorage.getItem(CODE_KEY+workshop)||''}catch{return ''}};
export const saveReturnCode=(workshop:string,code:string)=>{try{localStorage.setItem(CODE_KEY+workshop,code)}catch{}};
export const returnLink=(code:string)=>(typeof location==='undefined'?'':location.origin)+appUrl('/join?return=')+encodeURIComponent(code);

export function ReturnCodeCard({workshop,lang,prominent=false,onDone}:{workshop:string;lang:Language;prominent?:boolean;onDone?:()=>void}){
 const t=translator(lang);const [code,setCode]=useState(()=>readReturnCode(workshop));const [qr,setQr]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[copied,setCopied]=useState(''),[renew,setRenew]=useState(false);
 async function make(){setBusy(true);setError('');try{const r=await action({action:'returnCode',code:workshop}) as {returnCode?:string};if(r.returnCode){saveReturnCode(workshop,r.returnCode);setCode(r.returnCode);setRenew(false)}}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
 async function copy(kind:'code'|'link'){if(await copyText(kind==='code'?code:returnLink(code))){setCopied(kind);setTimeout(()=>setCopied(''),1800)}}
 return <section className={'return-code-card'+(prominent?' prominent':'')} aria-labelledby={'return-code-'+workshop}>
  <h3 id={'return-code-'+workshop}><KeyRound size={18}/>{prominent?t('Save your return code','احفظ رمز العودة'):t('Your return code','رمز العودة الخاص بك')}</h3>
  <p className="muted">{t('Closed the browser or changed device? This code brings you back to your name and your room.','أغلقت المتصفح أو غيّرت الجهاز؟ هذا الرمز يعيدك إلى اسمك وغرفتك.')}</p>
  {code?<>
   <output className="return-code" dir="ltr" aria-label={t('Return code','رمز العودة')}>{code}</output>
   <div className="return-code-actions"><button type="button" className="btn small secondary" onClick={()=>void copy('code')}>{copied==='code'?<Check size={15}/>:<Copy size={15}/>}{copied==='code'?t('Copied','تم النسخ'):t('Copy code','انسخ الرمز')}</button><button type="button" className="btn small secondary" onClick={()=>void copy('link')}>{copied==='link'?<Check size={15}/>:<Copy size={15}/>}{copied==='link'?t('Copied','تم النسخ'):t('Copy return link','انسخ رابط العودة')}</button><button type="button" className="btn small secondary" aria-expanded={qr} onClick={()=>setQr(v=>!v)}><QrCode size={15}/>{qr?t('Hide QR','إخفاء QR'):t('Show QR','اعرض QR')}</button></div>
   {qr&&<div className="qr return-qr"><QRCodeSVG value={returnLink(code)} size={200} level="M" bgColor="#fff" fgColor="#101216" marginSize={2} title={t('Scan to come back','امسح للعودة')}/><small className="muted">{t('Scan with your phone to continue there.','امسحه بهاتفك للمتابعة عليه.')}</small></div>}
   <p className="inline-help">{t('Take a screenshot or write it down. On the join page, choose “Joined before? Enter your code”. Keep it private — it opens your place.','التقط صورة للشاشة أو اكتبه. في صفحة الانضمام اختر «سجّلت من قبل؟ ادخل برمزك». احتفظ به لنفسك — فهو يفتح مكانك.')}</p>
   {prominent&&onDone&&<button type="button" className="btn primary full-width" onClick={onDone}><Check size={17}/>{t('I’ve saved it','حفظته')}</button>}
   {!prominent&&(renew?<div className="my-room-confirm"><p>{t('Make a new code? The old one will stop working.','إنشاء رمز جديد؟ سيتوقف الرمز القديم عن العمل.')}</p><div className="actions"><button type="button" className="btn small primary" disabled={busy} onClick={()=>void make()}><RefreshCw size={15}/>{t('Make a new code','أنشئ رمزاً جديداً')}</button><button type="button" className="btn small secondary" onClick={()=>setRenew(false)}>{t('Cancel','إلغاء')}</button></div></div>
   :<button type="button" className="btn small ghost" onClick={()=>setRenew(true)}><RefreshCw size={15}/>{t('Lost it? Make a new code','فقدته؟ أنشئ رمزاً جديداً')}</button>)}
  </>:<button type="button" className="btn primary full-width" disabled={busy} onClick={()=>void make()}><KeyRound size={17}/>{t('Get my return code','احصل على رمز العودة')}</button>}
  {error&&<div role="alert" className="error">{error}</div>}
 </section>;
}

/** Bottom of the participant page: the return code, and "Not you?" for shared computers. */
export function ReturnAccess({workshop,lang}:{workshop:string;lang:Language}){
 const t=translator(lang);const [forget,setForget]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function signOut(){setBusy(true);setError('');try{await action({action:'forgetMe',code:workshop});location.href=appUrl('/join')}catch(e){setError((e as Error).message);setBusy(false)}}
 return <details className="participant-extra return-access">
  <summary><KeyRound size={16}/>{t('Come back later or on another device','العودة لاحقاً أو من جهاز آخر')}</summary>
  <ReturnCodeCard workshop={workshop} lang={lang}/>
  <div className="return-forget">{forget?<div className="my-room-confirm"><p>{t('Sign out on this device? Your work stays saved. You will need your return code to come back here.','تسجيل الخروج من هذا الجهاز؟ يبقى عملك محفوظاً، وستحتاج إلى رمز العودة للرجوع هنا.')}</p><div className="actions"><button type="button" className="btn small danger" disabled={busy} onClick={()=>void signOut()}><UserX size={15}/>{t('Sign out','تسجيل الخروج')}</button><button type="button" className="btn small secondary" onClick={()=>setForget(false)}>{t('Cancel','إلغاء')}</button></div></div>
  :<button type="button" className="btn small ghost" onClick={()=>setForget(true)}><UserX size={15}/>{t('Not you? Sign out on this device','لست أنت؟ سجّل الخروج من هذا الجهاز')}</button>}</div>
  {error&&<div role="alert" className="error">{error}</div>}
 </details>;
}

export async function restore(returnCode:string){return await action({action:'restore',returnCode}) as unknown as {code:string;room:string|null;nickname:string}}
/** "Joined before? Enter your code": brings this browser back to an earlier identity and straight into its room. */
export function RestoreForm({lang,open=false}:{lang:Language;open?:boolean}){
 const t=translator(lang);const [value,setValue]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function submit(){setBusy(true);setError('');try{const r=await restore(value);goToWorkshop(r.room||r.code)}catch(e){setError((e as Error).message);setBusy(false)}}
 return <details className="restore-form panel" open={open||undefined}>
  <summary><KeyRound size={17}/>{t('Joined before? Enter your code','سجّلت من قبل؟ ادخل برمزك')}</summary>
  <form className="stack" onSubmit={e=>{e.preventDefault();void submit()}}>
   <label>{t('Your return code','رمز العودة الخاص بك')}<input className="code-input" dir="ltr" value={value} onChange={e=>setValue(e.target.value.toUpperCase())} placeholder="K7-4Q2M" required maxLength={12} autoComplete="off" autoCapitalize="characters" spellCheck={false}/></label>
   <small className="muted">{t('It was shown when you joined, and is under “Come back later or on another device”. Lost it? Ask the presenter for a new one.','ظهر لك عند الانضمام، وتجده تحت «العودة لاحقاً أو من جهاز آخر». فقدته؟ اطلب رمزاً جديداً من مقدم الورشة.')}</small>
   <button className="btn primary full-width" disabled={busy||value.replace(/[^A-Za-z0-9٠-٩۰-۹]/g,'').length<6}>{busy?t('Checking…','جارٍ التحقق…'):t('Continue where I left off','تابع من حيث توقفت')} <ArrowRight size={17}/></button>
   {error&&<div role="alert" className="error">{error}</div>}
  </form>
 </details>;
}

/** Presenter dashboard: a participant lost their code (or their phone). A new code replaces the old one; read it out or let them scan it. */
export function PresenterReissue({workshop,participant,nickname,lang}:{workshop:string;participant:string;nickname:string;lang:Language}){
 const t=translator(lang);const [code,setCode]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[confirm,setConfirm]=useState(false);
 async function reissue(){setBusy(true);setError('');try{const r=await action({action:'reissueCode',code:workshop,participant}) as {returnCode?:string};setCode(r.returnCode||'');setConfirm(false)}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
 return <section className="return-code-card presenter-reissue" aria-label={t('Return code','رمز العودة')}>
  <h4><KeyRound size={16}/>{t('Return code','رمز العودة')}</h4>
  {code?<><p>{t(`New code for ${nickname}. Read it out or let them scan it; the old code no longer works.`,`رمز جديد لـ ${nickname}. اقرأه له أو دعه يمسحه؛ الرمز القديم لم يعد يعمل.`)}</p><output className="return-code" dir="ltr">{code}</output><div className="qr return-qr"><QRCodeSVG value={returnLink(code)} size={180} level="M" bgColor="#fff" fgColor="#101216" marginSize={2} title={t('Scan to come back','امسح للعودة')}/></div></>
  :confirm?<div className="my-room-confirm"><p>{t(`Issue a new return code for ${nickname}? Their current code stops working.`,`إصدار رمز عودة جديد لـ ${nickname}؟ سيتوقف رمزه الحالي عن العمل.`)}</p><div className="actions"><button type="button" className="btn small primary" disabled={busy} onClick={()=>void reissue()}><RefreshCw size={15}/>{t('Issue new code','أصدر رمزاً جديداً')}</button><button type="button" className="btn small secondary" onClick={()=>setConfirm(false)}>{t('Cancel','إلغاء')}</button></div></div>
  :<><p className="inline-help">{t('Lost their code or changed device? Give them a new one.','فقد رمزه أو غيّر جهازه؟ امنحه رمزاً جديداً.')}</p><button type="button" className="btn small secondary" onClick={()=>setConfirm(true)}><KeyRound size={15}/>{t('New return code','رمز عودة جديد')}</button></>}
  {error&&<div role="alert" className="error">{error}</div>}
 </section>;
}
