"use client";

import {appUrl} from "../lib/urls";
import {useState} from "react";
import {ArrowUpRight,Sparkles,Users,Lightbulb,Layers3,Vote,Command,Globe2,ShieldCheck,Languages,WifiOff} from "lucide-react";
import {ThemeSwitch} from "../lib/client";
import {skills,skillIcons} from "../lib/workshop";

const phases=[
 [Lightbulb,'Think','Name a real problem worth solving — before jumping to solutions.'],
 [Users,'Share','Everyone contributes from their phone. Every voice is visible.'],
 [Layers3,'Improve','Build on teammates’ ideas, find weaknesses, and make them stronger.'],
 [Vote,'Vote','Decide together using value, feasibility and responsibility.'],
 [Sparkles,'Build','Turn the winning ideas into a product brief and an AI build prompt.'],
] as const;
const orbs=[['Reminders','problem'],['Arabic voice','idea'],['Clinic map','solution'],['Privacy first','improvement'],['Study plan','suggestion'],['Peer support','idea']];

export default function Home(){const [code,setCode]=useState("");return <main className="landing">
 <header className="brand-header"><a className="brand" href={appUrl("/")}><span className="brand-icon"><Command size={22}/></span>AI COLLAB <b>LAB</b></a><div className="actions"><span className="muted header-meta">AI at Work · UTAS · Oman</span><ThemeSwitch/></div></header>
 <section className="hero"><div className="hero-copy"><span className="eyebrow"><span className="pulse"/> THE NEXT IDEA STARTS WITH YOU</span><h1>Many minds.<br/>One <span>better idea.</span></h1><p className="hero-subtitle">From Idea to AI Product</p><p className="hero-description">A live collaborative innovation experience where students think, share, improve, vote and build together with AI — and learn the workplace skills that make AI useful.</p><div className="hero-actions"><a className="btn primary btn-lg" href={appUrl("/join")}>Join workshop <ArrowUpRight size={19}/></a><a className="btn secondary btn-lg" href={appUrl("/presenter")}>Presenter login <Command size={18}/></a></div><div className="journey">{phases.map(([Icon,label],i)=><span key={label}>{i>0&&<i/>}<Icon/>{label}</span>)}</div></div>
  <div className="hero-visual" aria-hidden="true"><div className="hero-hub"><Sparkles size={22}/><strong>One product</strong><small>built by the whole room</small></div>{orbs.map(([label,tone],i)=><span key={label} className={'hero-orb t-'+tone} style={{'--i':i} as React.CSSProperties}>{label}</span>)}<svg viewBox="0 0 400 400"><circle cx="200" cy="200" r="150"/><circle cx="200" cy="200" r="95"/></svg></div>
 </section>
 <section className="how-it-works" aria-labelledby="how-title"><div className="section-intro"><span className="eyebrow">HOW A WORKSHOP FLOWS</span><h2 id="how-title">Five steps from a problem to a prototype</h2><p className="muted">The presenter guides the room; students follow automatically on their phones. No accounts, no installs.</p></div><ol className="phase-grid">{phases.map(([Icon,label,text],i)=><li key={label} className="phase-card"><span className="phase-num">0{i+1}</span><Icon size={22}/><h3>{label}</h3><p>{text}</p></li>)}</ol></section>
 <section className="skills-strip" aria-label="Skills students practise"><span className="eyebrow">WHAT STUDENTS PRACTISE</span><div>{skills.map((s,i)=><span key={s}>{skillIcons[i]} {s}</span>)}</div></section>
 <section className="trust-row"><div><Languages size={20}/><span><strong>Arabic & English</strong> with true right-to-left layout</span></div><div><ShieldCheck size={20}/><span><strong>Privacy by design</strong> — nicknames only, no student accounts</span></div><div><WifiOff size={20}/><span><strong>Resilient</strong> — drafts and contributions survive reconnects</span></div></section>
 <section className="landing-bottom"><div><Globe2 size={20}/><span>Built for a room full of possibility.</span></div><form onSubmit={e=>{e.preventDefault();location.href=appUrl('/join?code=')+encodeURIComponent(code.trim())}}><input aria-label="Workshop code" placeholder="Have a workshop code?" value={code} onChange={e=>setCode(e.target.value.toUpperCase())} required spellCheck={false}/><button className="btn small primary">Join <ArrowUpRight size={16}/></button></form></section>
 <footer>HUMAN CREATIVITY. COLLECTIVE INTELLIGENCE. AI POSSIBILITY.</footer>
</main>}
