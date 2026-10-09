"use client";

import {appUrl} from "../lib/urls";
import {useState} from "react";
import {ArrowUpRight,Sparkles,Users,Lightbulb,Layers3,Vote,Command,Globe2,ShieldCheck,Languages,WifiOff} from "lucide-react";
import {Brand,ThemeSwitch,UiLanguageSwitch} from "../lib/client";
import {useAppInfo,useLanding} from "../lib/app-info-client";
import {WelcomeIntro} from "../lib/first-visit";
import {useUiLang,tx} from "../lib/i18n";
import {skills,skillArabic,skillIcons} from "../lib/workshop";
import type {LandingKey} from "../lib/landing-content";

/* All wording on this page is editable by the admin (Settings → Home page); icons and layout are fixed. */
const stepIcons=[Lightbulb,Users,Layers3,Vote,Sparkles];
const orbTones=['problem','idea','solution','improvement','suggestion','idea'];
const trustIcons=[Languages,ShieldCheck,WifiOff];

export default function Home(){const [code,setCode]=useState("");const lang=useUiLang();const info=useAppInfo();const content=useLanding();const t=(en:string,ar:string)=>tx(lang,en,ar);
 // Arabic falls back to English if the admin left the Arabic version empty (except optional parts).
 const c=(key:LandingKey,optional=false)=>{const v=content[key];return lang==='ar'?(v.ar||(optional?'':v.en)):v.en};
 const steps=[1,2,3,4,5].map(n=>[c(`step${n}Title` as LandingKey),c(`step${n}Text` as LandingKey)]);
 const line2=c('heroTitle2',true);
 return <main className="landing" dir={lang==='ar'?'rtl':'ltr'} lang={lang}>
 <header className="brand-header"><Brand size={22}/><div className="actions"><a className="muted header-meta header-link" href={appUrl('/about')}>{t('About','عن التطبيق')}</a><UiLanguageSwitch/><ThemeSwitch/></div></header>
 <section className="hero"><div className="hero-copy"><span className="eyebrow"><span className="pulse"/> {c('heroEyebrow')}</span><h1>{c('heroTitle1')}<br/>{line2&&<>{line2} </>}<span>{c('heroAccent')}</span></h1><p className="hero-subtitle">{t(info.tagline,info.taglineAr||info.tagline)}</p><p className="hero-description">{c('heroDescription')}</p><div className="hero-actions"><a className="btn primary btn-lg" href={appUrl("/join")}>{c('joinButton')} <ArrowUpRight size={19}/></a><a className="btn secondary btn-lg" href={appUrl("/presenter")}>{c('presenterButton')} <Command size={18}/></a></div><div className="journey">{steps.map(([title],i)=>{const Icon=stepIcons[i];return <span key={i}>{i>0&&<i/>}<Icon/>{title}</span>})}</div></div>
  <div className="hero-visual" aria-hidden="true"><div className="hero-hub"><Sparkles size={22}/><strong>{c('hubTitle')}</strong><small>{c('hubText')}</small></div>{orbTones.map((tone,i)=><span key={i} className={'hero-orb t-'+tone} style={{'--i':i} as React.CSSProperties}>{c(`orb${i+1}` as LandingKey)}</span>)}<svg viewBox="0 0 400 400"><circle cx="200" cy="200" r="150"/><circle cx="200" cy="200" r="95"/></svg></div>
 </section>
 <section className="how-it-works" aria-labelledby="how-title"><div className="section-intro"><span className="eyebrow">{c('howEyebrow')}</span><h2 id="how-title">{c('howTitle')}</h2><p className="muted">{c('howText')}</p></div><ol className="phase-grid">{steps.map(([title,text],i)=>{const Icon=stepIcons[i];return <li key={i} className="phase-card"><span className="phase-num">0{i+1}</span><Icon size={22}/><h3>{title}</h3><p>{text}</p></li>})}</ol></section>
 <section className="skills-strip" aria-label={c('skillsEyebrow')}><span className="eyebrow">{c('skillsEyebrow')}</span><div>{skills.map((s,i)=><span key={s}>{skillIcons[i]} {t(s,skillArabic[i])}</span>)}</div></section>
 <section className="trust-row">{trustIcons.map((Icon,i)=><div key={i}><Icon size={20}/><span><strong>{c(`trust${i+1}Title` as LandingKey)}</strong> {c(`trust${i+1}Text` as LandingKey,true)}</span></div>)}</section>
 <section className="landing-bottom"><div><Globe2 size={20}/><span>{c('bottomText')}</span></div><form onSubmit={e=>{e.preventDefault();location.href=appUrl('/join?code=')+encodeURIComponent(code.trim())}}><input aria-label={t('Workshop code','رمز الورشة')} placeholder={c('codePlaceholder')} value={code} onChange={e=>setCode(e.target.value.toUpperCase())} required spellCheck={false} dir="ltr"/><button className="btn small primary">{t('Join','انضم')} <ArrowUpRight size={16}/></button></form></section>
 <section className="intro-cta"><div><span className="eyebrow">{c('guideEyebrow')}</span><h2>{c('guideTitle')}</h2><p className="muted">{c('guideText')}</p></div><a className="btn primary btn-lg" href={appUrl('/about#what')}>{c('guideButton')} <ArrowUpRight size={18}/></a></section>
 <WelcomeIntro lang={lang}/>
 <footer className="landing-footer"><span>{c('footerText')}</span><span className="footer-meta"><a href={appUrl('/about')}>{t('About','عن التطبيق')} {t(info.name,info.nameAr||info.name)}</a> · <span dir="ltr">v{info.version}</span></span></footer>
</main>}
