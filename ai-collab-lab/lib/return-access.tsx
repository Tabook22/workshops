"use client";
/* Coming back to a workshop: "Welcome back" on the same device, the "My room" area (enter, switch, leave),
   and the list of workshops this browser already joined. Every string is bilingual; layout follows dir. */
import {useEffect,useState} from 'react';
import {DoorOpen,ArrowRight,LogOut,Repeat,Lock,Users,Sparkles} from 'lucide-react';
import {localizeNumbers} from './localization';
import {action} from './client';
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
 useEffect(()=>{let live=true;fetch(appUrl('/api/workshop?mine=1'),{cache:'no-store'}).then(r=>r.ok?r.json() as Promise<{workshops?:Mine[]}>:{workshops:[]}).then(r=>{if(live)setList((r.workshops||[]).filter(w=>!w.ended))}).catch(()=>{});return ()=>{live=false}},[]);
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
