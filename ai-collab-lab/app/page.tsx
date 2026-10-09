"use client";

import {appUrl} from "../lib/urls";
import {useState} from "react";
import {ArrowUpRight,Sparkles,Users,Lightbulb,Layers3,Vote,Command,Globe2,ShieldCheck,Languages,WifiOff} from "lucide-react";
import {Brand,ThemeSwitch,UiLanguageSwitch} from "../lib/client";
import {useAppInfo} from "../lib/app-info-client";
import {useUiLang,tx} from "../lib/i18n";
import {skills,skillArabic,skillIcons} from "../lib/workshop";

const phases=[
 [Lightbulb,'Think','فكّر','Name a real problem worth solving — before jumping to solutions.','حدّد مشكلة حقيقية تستحق الحل — قبل القفز إلى الحلول.'],
 [Users,'Share','شارك','Everyone contributes from their phone. Every voice is visible.','يشارك الجميع من هواتفهم. وكل صوت مسموع.'],
 [Layers3,'Improve','حسّن','Build on teammates’ ideas, find weaknesses, and make them stronger.','طوّر أفكار زملائك، واكتشف نقاط الضعف، واجعلها أقوى.'],
 [Vote,'Vote','صوّت','Decide together using value, feasibility and responsibility.','قرّروا معاً وفق القيمة وقابلية التنفيذ والمسؤولية.'],
 [Sparkles,'Build','ابنِ','Turn the winning ideas into a product brief and an AI build prompt.','حوّل الأفكار الفائزة إلى ملخص منتج وتعليمات بناء بالذكاء الاصطناعي.'],
] as const;
const orbs=[['Reminders','تذكيرات','problem'],['Arabic voice','صوت عربي','idea'],['Clinic map','خريطة العيادة','solution'],['Privacy first','الخصوصية أولاً','improvement'],['Study plan','خطة دراسية','suggestion'],['Peer support','دعم الزملاء','idea']];

export default function Home(){const [code,setCode]=useState("");const lang=useUiLang();const info=useAppInfo();const t=(en:string,ar:string)=>tx(lang,en,ar);
 return <main className="landing" dir={lang==='ar'?'rtl':'ltr'} lang={lang}>
 <header className="brand-header"><Brand size={22}/><div className="actions"><a className="muted header-meta header-link" href={appUrl('/about')}>{t('About','عن التطبيق')}</a><UiLanguageSwitch/><ThemeSwitch/></div></header>
 <section className="hero"><div className="hero-copy"><span className="eyebrow"><span className="pulse"/> {t('THE NEXT IDEA STARTS WITH YOU','الفكرة القادمة تبدأ منك')}</span>{lang==='ar'?<h1>عقولٌ كثيرة.<br/><span>فكرةٌ أفضل.</span></h1>:<h1>Many minds.<br/>One <span>better idea.</span></h1>}<p className="hero-subtitle">{t(info.tagline,info.taglineAr||info.tagline)}</p><p className="hero-description">{t('A live collaborative innovation experience where students think, share, improve, vote and build together with AI — and learn the workplace skills that make AI useful.','تجربة ابتكار تعاونية مباشرة يفكّر فيها الطلاب ويشاركون ويحسّنون ويصوّتون ويبنون معاً بالذكاء الاصطناعي — ويتعلمون مهارات العمل التي تجعل الذكاء الاصطناعي مفيداً.')}</p><div className="hero-actions"><a className="btn primary btn-lg" href={appUrl("/join")}>{t('Join workshop','انضم إلى الورشة')} <ArrowUpRight size={19}/></a><a className="btn secondary btn-lg" href={appUrl("/presenter")}>{t('Presenter login','دخول مقدم الورشة')} <Command size={18}/></a></div><div className="journey">{phases.map(([Icon,en,ar],i)=><span key={en}>{i>0&&<i/>}<Icon/>{t(en,ar)}</span>)}</div></div>
  <div className="hero-visual" aria-hidden="true"><div className="hero-hub"><Sparkles size={22}/><strong>{t('One product','منتج واحد')}</strong><small>{t('built by the whole room','تبنيه القاعة كلها')}</small></div>{orbs.map(([en,ar,tone],i)=><span key={en} className={'hero-orb t-'+tone} style={{'--i':i} as React.CSSProperties}>{t(en,ar)}</span>)}<svg viewBox="0 0 400 400"><circle cx="200" cy="200" r="150"/><circle cx="200" cy="200" r="95"/></svg></div>
 </section>
 <section className="how-it-works" aria-labelledby="how-title"><div className="section-intro"><span className="eyebrow">{t('HOW A WORKSHOP FLOWS','كيف تسير الورشة')}</span><h2 id="how-title">{t('Five steps from a problem to a prototype','خمس خطوات من المشكلة إلى النموذج الأولي')}</h2><p className="muted">{t('The presenter guides the room; students follow automatically on their phones. No accounts, no installs.','يقود مقدم الورشة القاعة، ويتابع الطلاب تلقائياً على هواتفهم. بلا حسابات ولا تثبيت.')}</p></div><ol className="phase-grid">{phases.map(([Icon,en,ar,den,dar],i)=><li key={en} className="phase-card"><span className="phase-num">0{i+1}</span><Icon size={22}/><h3>{t(en,ar)}</h3><p>{t(den,dar)}</p></li>)}</ol></section>
 <section className="skills-strip" aria-label={t('Skills students practise','المهارات التي يمارسها الطلاب')}><span className="eyebrow">{t('WHAT STUDENTS PRACTISE','ما يمارسه الطلاب')}</span><div>{skills.map((s,i)=><span key={s}>{skillIcons[i]} {t(s,skillArabic[i])}</span>)}</div></section>
 <section className="trust-row"><div><Languages size={20}/><span>{lang==='ar'?<><strong>العربية والإنجليزية</strong> مع تخطيط حقيقي من اليمين إلى اليسار</>:<><strong>Arabic & English</strong> with true right-to-left layout</>}</span></div><div><ShieldCheck size={20}/><span>{lang==='ar'?<><strong>الخصوصية أولاً</strong> — أسماء مستعارة فقط، بلا حسابات للطلاب</>:<><strong>Privacy by design</strong> — nicknames only, no student accounts</>}</span></div><div><WifiOff size={20}/><span>{lang==='ar'?<><strong>موثوقية عالية</strong> — المسودات والمشاركات محفوظة رغم انقطاع الاتصال</>:<><strong>Resilient</strong> — drafts and contributions survive reconnects</>}</span></div></section>
 <section className="landing-bottom"><div><Globe2 size={20}/><span>{t('Built for a room full of possibility.','صُمّمت لقاعة مليئة بالإمكانات.')}</span></div><form onSubmit={e=>{e.preventDefault();location.href=appUrl('/join?code=')+encodeURIComponent(code.trim())}}><input aria-label={t('Workshop code','رمز الورشة')} placeholder={t('Have a workshop code?','لديك رمز ورشة؟')} value={code} onChange={e=>setCode(e.target.value.toUpperCase())} required spellCheck={false} dir="ltr"/><button className="btn small primary">{t('Join','انضم')} <ArrowUpRight size={16}/></button></form></section>
 <footer className="landing-footer"><span>{t('HUMAN CREATIVITY. COLLECTIVE INTELLIGENCE. AI POSSIBILITY.','إبداع الإنسان. ذكاء الجماعة. إمكانات الذكاء الاصطناعي.')}</span><span className="footer-meta"><a href={appUrl('/about')}>{t('About','عن التطبيق')} {t(info.name,info.nameAr||info.name)}</a> · <span dir="ltr">v{info.version}</span></span></footer>
</main>}
