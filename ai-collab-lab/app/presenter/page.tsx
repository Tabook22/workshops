"use client";

import {appUrl} from "../../lib/urls";
import {useState,useEffect} from 'react';
import {Plus,ArrowUpRight,KeyRound,LogIn} from 'lucide-react';
import {Brand,ThemeSwitch,UiLanguageSwitch,SignOutButton,action} from '../../lib/client';
import {defaults,type Config} from '../../lib/workshop';
import {challengeQuestion} from '../../lib/learning';
import {useUiLang,tx} from '../../lib/i18n';
import {Settings} from '../../lib/settings';
import Console from '../../lib/console';

/** [English name, Arabic name, Arabic noun phrase used inside the challenge question, icon] */
const challenges:[string,string,string,string][]=[
 ['Your Healthcare Assistant','مساعدك الصحي','مساعد صحي','🩺'],['Smart Campus','الحرم الجامعي الذكي','حرم جامعي ذكي','🏫'],['AI Study Assistant','مساعد الدراسة الذكي','مساعد دراسي ذكي','📚'],['Environmental Assistant','المساعد البيئي','مساعد بيئي','🌱'],['Tourism Assistant','المساعد السياحي','مساعد سياحي','🧭'],['Career Assistant','المساعد المهني','مساعد مهني','💼'],['Agriculture Assistant','المساعد الزراعي','مساعد زراعي','🌾'],['Safety Assistant','مساعد السلامة','مساعد للسلامة','🛡️'],['Custom Challenge','تحدٍّ مخصص','','✏️']];
const healthAr='كيف يمكننا استخدام التقنية والذكاء الاصطناعي لإنشاء مساعد صحي مفيد لطلاب الجامعة؟';

export default function Presenter({initialMode="login"}:{initialMode?:string}={}){
 const lang=useUiLang();const t=(en:string,ar:string)=>tx(lang,en,ar);
 const [code,setCode]=useState(''),[entry,setEntry]=useState(''),[key,setKey]=useState(''),[mode,setMode]=useState(initialMode),[form,setForm]=useState<Config>(()=>lang==='ar'?{...defaults,name:'مختبر التعاون بالذكاء الاصطناعي',challenge:challenges[0][1],question:healthAr,description:'فكّر • شارك • حسّن • صوّت • ابنِ',language:'ar'}:{...defaults}),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{const q=new URLSearchParams(location.search).get('code');if(q)setCode(q.toUpperCase());try{const last=localStorage.getItem('lastPresenterCode');if(last)setEntry(last)}catch{}},[]);
 async function submit(){setBusy(true);setError('');try{if(mode==='create'){const r=await action({action:'create',...form});sessionStorage.setItem('newPresenterKey',r.key);try{localStorage.setItem('lastPresenterCode',r.code)}catch{}location.href=appUrl('/presenter?code=')+r.code;}else{const c=entry.trim().toUpperCase();await action({action:'unlock',code:c,key});try{localStorage.setItem('lastPresenterCode',c)}catch{}location.href=appUrl('/presenter?code=')+c;}}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
 const arabicWorkshop=form.language==='ar';
 const selected=challenges.find(c=>c[0]===form.challenge||c[1]===form.challenge);
 const generated=(c:typeof challenges[number],ar:boolean)=>{const [en,arName,phrase]=c;return {challenge:ar?arName:en,question:en==='Custom Challenge'?'':ar?(en==='Your Healthcare Assistant'?healthAr:`كيف يمكننا استخدام التقنية والذكاء الاصطناعي لإنشاء ${phrase} مفيد لطلاب الجامعة؟`):en==='Your Healthcare Assistant'?defaults.question:challengeQuestion(en)}};
 function pickChallenge(c:typeof challenges[number]){setForm({...form,...generated(c,arabicWorkshop)})}
 // Switching the workshop language also translates the challenge text, unless the presenter has edited it.
 function updateForm(next:Config){if(next.language!==form.language&&selected){const before=generated(selected,form.language==='ar');if(next.challenge===before.challenge&&next.question===before.question){setForm({...next,...generated(selected,next.language==='ar')});return}}setForm(next)}
 if(code)return <Console code={code}/>;
 return <main className={'center-page'+(mode==='create'?' wide-page':'')} dir={lang==='ar'?'rtl':'ltr'} lang={lang}><div className="page-top"><Brand/><div className="actions"><UiLanguageSwitch/><ThemeSwitch/><SignOutButton/></div></div><span className="eyebrow">{t('PRESENTER CONTROL CENTER','مركز تحكم مقدم الورشة')}</span><h1>{mode==='create'?t('Create your workshop','أنشئ ورشتك'):t('Let’s lead something great.','لنقُد شيئاً رائعاً.')}</h1><p>{mode==='create'?t('Choose a challenge. Your students will do the rest.','اختر تحدياً، وسيتولى طلابك الباقي.'):t('Open an existing session with your presenter key, or start a fresh workshop.','افتح جلسة قائمة بمفتاح مقدم الورشة، أو ابدأ ورشة جديدة.')}</p>
  <div className="tabs segmented"><button className={mode==='login'?'active':''} onClick={()=>setMode('login')}><LogIn size={14}/> {t('Open workshop','فتح ورشة')}</button><button className={mode==='create'?'active':''} onClick={()=>setMode('create')}><Plus size={14}/> {t('Create workshop','إنشاء ورشة')}</button></div>
  <form className="panel stack" onSubmit={e=>{e.preventDefault();void submit()}}>{mode==='create'?<><fieldset className="challenge-picker"><legend>{t('Start from a challenge','ابدأ من تحدٍّ')}</legend><div className="challenge-options">{challenges.map(c=><button type="button" key={c[0]} aria-pressed={selected===c} className={'challenge-option'+(selected===c?' active':'')} onClick={()=>pickChallenge(c)}><span>{c[3]}</span>{t(c[0],c[1])}</button>)}{!selected&&form.challenge&&<button type="button" aria-pressed className="challenge-option active"><span>⭐</span>{form.challenge}</button>}</div><p className="inline-help">{t('Challenge text is created in the workshop language you choose below. You can edit every field.','يُنشأ نص التحدي بلغة الورشة التي تختارها أدناه، ويمكنك تعديل كل حقل.')}</p></fieldset><Settings value={form} onChange={updateForm}/></>:<><label>{t('Workshop code','رمز الورشة')}<input value={entry} onChange={e=>setEntry(e.target.value.toUpperCase())} required placeholder="UTAS-123456" className="code-input" autoComplete="off" spellCheck={false} dir="ltr"/></label><label>{t('Presenter key','مفتاح مقدم الورشة')}<input value={key} onChange={e=>setKey(e.target.value)} required type="password" placeholder={t('Your private presenter key','مفتاحك الخاص')} autoComplete="current-password" dir="ltr"/></label><p className="inline-help"><KeyRound size={14}/> {t('Your key is provided when you create a workshop. Keep it private.','يُعطى لك المفتاح عند إنشاء الورشة. احتفظ به سرّاً.')}</p></>}{error&&<div className="error" role="alert">{error}</div>}<button disabled={busy} className="btn primary full-width btn-lg">{busy?t('Opening…','جارٍ الفتح…'):mode==='create'?t('Start workshop','ابدأ الورشة'):t('Open control center','افتح مركز التحكم')} <ArrowUpRight size={18}/></button></form><a className="muted" href={appUrl("/join")}>{t('Joining as a student? Enter here.','تنضم كطالب؟ ادخل من هنا.')}</a></main>;
}
