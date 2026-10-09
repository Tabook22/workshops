"use client";

import {appUrl} from "../../lib/urls";
import {useState,useEffect} from 'react';
import {Plus,ArrowUpRight,KeyRound,LogIn} from 'lucide-react';
import {Brand,ThemeSwitch,SignOutButton,action} from '../../lib/client';
import {defaults,type Config} from '../../lib/workshop';
import {challengeQuestion} from '../../lib/learning';
import {Settings} from '../../lib/settings';
import Console from '../../lib/console';

const challenges:[string,string][]=[['Your Healthcare Assistant','🩺'],['Smart Campus','🏫'],['AI Study Assistant','📚'],['Environmental Assistant','🌱'],['Tourism Assistant','🧭'],['Career Assistant','💼'],['Agriculture Assistant','🌾'],['Safety Assistant','🛡️'],['Custom Challenge','✏️']];

export default function Presenter({initialMode="login"}:{initialMode?:string}={}){
 const [code,setCode]=useState(''),[entry,setEntry]=useState(''),[key,setKey]=useState(''),[mode,setMode]=useState(initialMode),[form,setForm]=useState<Config>({...defaults}),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{const q=new URLSearchParams(location.search).get('code');if(q)setCode(q.toUpperCase());try{const last=localStorage.getItem('lastPresenterCode');if(last)setEntry(last)}catch{}},[]);
 async function submit(){setBusy(true);setError('');try{if(mode==='create'){const r=await action({action:'create',...form});sessionStorage.setItem('newPresenterKey',r.key);try{localStorage.setItem('lastPresenterCode',r.code)}catch{}location.href=appUrl('/presenter?code=')+r.code;}else{const c=entry.trim().toUpperCase();await action({action:'unlock',code:c,key});try{localStorage.setItem('lastPresenterCode',c)}catch{}location.href=appUrl('/presenter?code=')+c;}}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
 function pickChallenge(challenge:string){setForm({...form,challenge,question:challenge==='Your Healthcare Assistant'?defaults.question:challenge==='Custom Challenge'?'':challengeQuestion(challenge)})}
 if(code)return <Console code={code}/>;
 return <main className={'center-page'+(mode==='create'?' wide-page':'')}><div className="page-top"><Brand/><div className="actions"><ThemeSwitch/><SignOutButton/></div></div><span className="eyebrow">PRESENTER CONTROL CENTER</span><h1>{mode==='create'?'Create your workshop':'Let’s lead something great.'}</h1><p>{mode==='create'?'Choose a challenge. Your students will do the rest.':'Open an existing session with your presenter key, or start a fresh workshop.'}</p>
  <div className="tabs segmented"><button className={mode==='login'?'active':''} onClick={()=>setMode('login')}><LogIn size={14}/> Open workshop</button><button className={mode==='create'?'active':''} onClick={()=>setMode('create')}><Plus size={14}/> Create workshop</button></div>
  <form className="panel stack" onSubmit={e=>{e.preventDefault();void submit()}}>{mode==='create'?<><fieldset className="challenge-picker"><legend>Start from a challenge</legend><div className="challenge-options">{[...challenges,...(!challenges.some(([c])=>c===form.challenge)&&form.challenge?[[form.challenge,'⭐'] as [string,string]]:[])].map(([c,icon])=><button type="button" key={c} aria-pressed={form.challenge===c} className={'challenge-option'+(form.challenge===c?' active':'')} onClick={()=>pickChallenge(c)}><span>{icon}</span>{c}</button>)}</div></fieldset><Settings value={form} onChange={setForm}/></>:<><label>Workshop code<input value={entry} onChange={e=>setEntry(e.target.value.toUpperCase())} required placeholder="UTAS-123456" className="code-input" autoComplete="off" spellCheck={false}/></label><label>Presenter key<input value={key} onChange={e=>setKey(e.target.value)} required type="password" placeholder="Your private presenter key" autoComplete="current-password"/></label><p className="inline-help"><KeyRound size={14}/> Your key is provided when you create a workshop. Keep it private.</p></>}{error&&<div className="error" role="alert">{error}</div>}<button disabled={busy} className="btn primary full-width btn-lg">{busy?'Opening…':mode==='create'?'Start workshop':'Open control center'} <ArrowUpRight size={18}/></button></form><a className="muted" href={appUrl("/join")}>Joining as a student? Enter here.</a></main>;
}
