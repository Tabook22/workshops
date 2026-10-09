import {useEffect,useMemo,useState} from 'react';
import {Plus,Users,Lightbulb,ArrowUpRight,Search,LogIn} from 'lucide-react';
import Presenter from '../app/presenter/page';
import {Brand,ThemeSwitch,UiLanguageSwitch,AccountContext,SignOutButton} from '../lib/client';
import {stages,stageArabic} from '../lib/workshop';
import {useUiLang,tx,translateError,getUiLang} from '../lib/i18n';
import {appUrl} from '../lib/urls';

type Session={code:string;name:string;challenge?:string;stage?:number;ended:boolean;created?:number;participants?:number;ideas?:number};

export default function PresenterAccount(){
 const lang=useUiLang();const t=(en:string,ar:string)=>tx(lang,en,ar);const dir=lang==='ar'?'rtl':'ltr';
 const [account,setAccount]=useState<{enabled:boolean;authenticated:boolean;sessions:Session[]}|null>(null),[username,setUsername]=useState(''),[password,setPassword]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[create,setCreate]=useState(false),[query,setQuery]=useState('');
 async function refresh(){const r=await fetch(appUrl('/api/account'),{cache:'no-store'});if(!r.ok)throw Error(translateError('Login service unavailable.',getUiLang()));setAccount(await r.json());}
 useEffect(()=>{void refresh().catch(e=>setError(e.message));},[]);
 async function login(e:React.FormEvent){e.preventDefault();setBusy(true);setError('');try{const r=await fetch(appUrl('/api/account'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password})});const j=await r.json() as {error?:string};if(!r.ok)throw Error(translateError(j.error||'',getUiLang()));setPassword('');await refresh();}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
 const signOut=useMemo(()=>({signOut:async()=>{await fetch(appUrl('/api/account'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'logout'})});location.href=appUrl('/presenter');}}),[]);
 const top=<div className="page-top"><Brand/><div className="actions"><UiLanguageSwitch/><ThemeSwitch/><SignOutButton/></div></div>;
 if(!account)return <main className="center-page" dir={dir}><Brand/><p className="connecting">{error||<><span className="spinner"/>{t('Loading presenter login…','جارٍ تحميل تسجيل الدخول…')}</>}</p></main>;
 if(!account.enabled)return <Presenter/>;
 if(!account.authenticated)return <main className="center-page" dir={dir} lang={lang}>{top}<span className="eyebrow">{t('PRESENTER CONTROL CENTER','مركز تحكم مقدم الورشة')}</span><h1>{t('Presenter login','دخول مقدم الورشة')}</h1><p>{t('Sign in to create and manage your workshops.','سجّل الدخول لإنشاء ورشك وإدارتها.')}</p><form className="panel stack" onSubmit={login}><label>{t('Username','اسم المستخدم')}<input required autoComplete="username" dir="ltr" value={username} onChange={e=>setUsername(e.target.value)}/></label><label>{t('Password','كلمة المرور')}<input required type="password" autoComplete="current-password" dir="ltr" value={password} onChange={e=>setPassword(e.target.value)}/></label>{error&&<div className="error" role="alert">{error}</div>}<button className="btn primary full-width" disabled={busy}><LogIn size={17}/>{busy?t('Signing in…','جارٍ تسجيل الدخول…'):t('Sign in','تسجيل الدخول')}</button></form><a className="muted" href={appUrl('/join')}>{t('Joining as a student? Enter here.','تنضم كطالب؟ ادخل من هنا.')}</a></main>;
 const code=new URLSearchParams(location.search).get('code');
 const sessions=account.sessions.filter(s=>!query||(s.name+' '+(s.challenge||'')+' '+s.code).toLowerCase().includes(query.toLowerCase()));
 const live=account.sessions.filter(s=>!s.ended).length;
 return <AccountContext.Provider value={signOut}>{code?<Presenter/>:create?<Presenter initialMode="create"/>:<main className="dashboard" dir={dir} lang={lang}>{top}
  <section className="dashboard-head"><div><span className="eyebrow">{t('PRESENTER CONTROL CENTER','مركز تحكم مقدم الورشة')}</span><h1>{t('Your workshops','ورشك')}</h1><p className="muted">{t(`${account.sessions.length} workshops · ${live} active`,`${account.sessions.length} ورشة · ${live} نشطة`)}</p></div><button className="btn primary btn-lg" onClick={()=>setCreate(true)}><Plus size={18}/>{t('Create workshop','إنشاء ورشة')}</button></section>
  {account.sessions.length>4&&<label className="wall-search"><Search size={18}/><input aria-label={t('Search workshops','ابحث في الورش')} placeholder={t('Search by name, challenge or code…','ابحث بالاسم أو التحدي أو الرمز…')} value={query} onChange={e=>setQuery(e.target.value)}/></label>}
  {account.sessions.length?<div className="session-grid">{sessions.map(s=><a className="session-card" key={s.code} href={appUrl('/presenter?code=')+s.code}><div className="session-card-top"><span className={'status '+(s.ended?'off':'')}>{s.ended?t('ENDED','انتهت'):t('ACTIVE','نشطة')}</span><span className="pill" dir="ltr">{s.code}</span></div><h3 dir="auto">{s.challenge||s.name}</h3><p className="muted" dir="auto">{s.name}{typeof s.stage==='number'&&!s.ended?` · ${lang==='ar'?stageArabic[s.stage]:stages[s.stage]}`:''}</p><div className="session-card-foot"><span title={t('Participants','المشاركون')}><Users size={14}/>{s.participants??0}</span><span title={t('Ideas','الأفكار')}><Lightbulb size={14}/>{s.ideas??0}</span>{s.created&&<span>{new Date(s.created).toLocaleDateString(lang==='ar'?'ar-OM-u-nu-latn':'en-GB',{day:'numeric',month:'short',year:'numeric'})}</span>}<ArrowUpRight size={16} className="session-open"/></div></a>)}</div>
  :<div className="empty"><span className="empty-icon"><Plus size={26}/></span><h3>{t('No workshops yet','لا توجد ورش بعد')}</h3>{t('Create your first session — it takes under a minute.','أنشئ جلستك الأولى — يستغرق الأمر أقل من دقيقة.')}<div className="actions" style={{justifyContent:'center',marginTop:16}}><button className="btn primary" onClick={()=>setCreate(true)}><Plus size={16}/>{t('Create workshop','إنشاء ورشة')}</button></div></div>}
 </main>}</AccountContext.Provider>;
}
