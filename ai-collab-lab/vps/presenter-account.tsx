import {useEffect,useMemo,useState} from 'react';
import {Plus,Users,Lightbulb,ArrowUpRight,Search,LogIn} from 'lucide-react';
import Presenter from '../app/presenter/page';
import {Brand,ThemeSwitch,AccountContext,SignOutButton} from '../lib/client';
import {stages} from '../lib/workshop';
import {appUrl} from '../lib/urls';

type Session={code:string;name:string;challenge?:string;stage?:number;ended:boolean;created?:number;participants?:number;ideas?:number};

export default function PresenterAccount(){
 const [account,setAccount]=useState<{enabled:boolean;authenticated:boolean;sessions:Session[]}|null>(null),[username,setUsername]=useState(''),[password,setPassword]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[create,setCreate]=useState(false),[query,setQuery]=useState('');
 async function refresh(){const r=await fetch(appUrl('/api/account'),{cache:'no-store'});if(!r.ok)throw Error('Login service unavailable.');setAccount(await r.json());}
 useEffect(()=>{void refresh().catch(e=>setError(e.message));},[]);
 async function login(e:React.FormEvent){e.preventDefault();setBusy(true);setError('');try{const r=await fetch(appUrl('/api/account'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password})});const j=await r.json() as {error?:string};if(!r.ok)throw Error(j.error);setPassword('');await refresh();}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
 const signOut=useMemo(()=>({signOut:async()=>{await fetch(appUrl('/api/account'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'logout'})});location.href=appUrl('/presenter');}}),[]);
 if(!account)return <main className="center-page"><Brand/><p className="connecting">{error||<><span className="spinner"/>Loading presenter login…</>}</p></main>;
 if(!account.enabled)return <Presenter/>;
 if(!account.authenticated)return <main className="center-page"><div className="page-top"><Brand/><ThemeSwitch/></div><span className="eyebrow">PRESENTER CONTROL CENTER</span><h1>Presenter login</h1><p>Sign in to create and manage your workshops.</p><form className="panel stack" onSubmit={login}><label>Username<input required autoComplete="username" value={username} onChange={e=>setUsername(e.target.value)}/></label><label>Password<input required type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)}/></label>{error&&<div className="error" role="alert">{error}</div>}<button className="btn primary full-width" disabled={busy}><LogIn size={17}/>{busy?'Signing in…':'Sign in'}</button></form><a className="muted" href={appUrl('/join')}>Joining as a student? Enter here.</a></main>;
 const code=new URLSearchParams(location.search).get('code');
 const sessions=account.sessions.filter(s=>!query||(s.name+' '+(s.challenge||'')+' '+s.code).toLowerCase().includes(query.toLowerCase()));
 const live=account.sessions.filter(s=>!s.ended).length;
 return <AccountContext.Provider value={signOut}>{code?<Presenter/>:create?<Presenter initialMode="create"/>:<main className="dashboard"><div className="page-top"><Brand/><div className="actions"><ThemeSwitch/><SignOutButton/></div></div>
  <section className="dashboard-head"><div><span className="eyebrow">PRESENTER CONTROL CENTER</span><h1>Your workshops</h1><p className="muted">{account.sessions.length} workshops · {live} active</p></div><button className="btn primary btn-lg" onClick={()=>setCreate(true)}><Plus size={18}/>Create workshop</button></section>
  {account.sessions.length>4&&<label className="wall-search"><Search size={18}/><input aria-label="Search workshops" placeholder="Search by name, challenge or code…" value={query} onChange={e=>setQuery(e.target.value)}/></label>}
  {account.sessions.length?<div className="session-grid">{sessions.map(s=><a className="session-card" key={s.code} href={appUrl('/presenter?code=')+s.code}><div className="session-card-top"><span className={'status '+(s.ended?'off':'')}>{s.ended?'ENDED':'ACTIVE'}</span><span className="pill" dir="ltr">{s.code}</span></div><h3>{s.challenge||s.name}</h3><p className="muted">{s.name}{typeof s.stage==='number'&&!s.ended?` · ${stages[s.stage]}`:''}</p><div className="session-card-foot"><span><Users size={14}/>{s.participants??0}</span><span><Lightbulb size={14}/>{s.ideas??0}</span>{s.created&&<span>{new Date(s.created).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}</span>}<ArrowUpRight size={16} className="session-open"/></div></a>)}</div>
  :<div className="empty"><span className="empty-icon"><Plus size={26}/></span><h3>No workshops yet</h3>Create your first session — it takes under a minute.<div className="actions" style={{justifyContent:'center',marginTop:16}}><button className="btn primary" onClick={()=>setCreate(true)}><Plus size={16}/>Create workshop</button></div></div>}
 </main>}</AccountContext.Provider>;
}
