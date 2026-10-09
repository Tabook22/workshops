import {useEffect,useMemo,useState} from 'react';
import {LogIn} from 'lucide-react';
import WorkshopDashboard,{type Session} from './workshop-dashboard';
import Presenter from '../app/presenter/page';
import {Brand,ThemeSwitch,UiLanguageSwitch,AccountContext,SignOutButton} from '../lib/client';
import {useUiLang,tx,translateError,getUiLang} from '../lib/i18n';
import {appUrl} from '../lib/urls';


export default function PresenterAccount(){
 const lang=useUiLang();const t=(en:string,ar:string)=>tx(lang,en,ar);const dir=lang==='ar'?'rtl':'ltr';
 const [account,setAccount]=useState<{enabled:boolean;authenticated:boolean;sessions:Session[]}|null>(null),[username,setUsername]=useState(''),[password,setPassword]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[create,setCreate]=useState(false);
 async function refresh(){const r=await fetch(appUrl('/api/account'),{cache:'no-store'});if(!r.ok)throw Error(translateError('Login service unavailable.',getUiLang()));setAccount(await r.json());}
 useEffect(()=>{void refresh().catch(e=>setError(e.message));},[]);
 async function login(e:React.FormEvent){e.preventDefault();setBusy(true);setError('');try{const r=await fetch(appUrl('/api/account'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password})});const j=await r.json() as {error?:string};if(!r.ok)throw Error(translateError(j.error||'',getUiLang()));setPassword('');await refresh();}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
 const signOut=useMemo(()=>({signOut:async()=>{await fetch(appUrl('/api/account'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'logout'})});location.href=appUrl('/presenter');}}),[]);
 const top=<div className="page-top"><Brand/><div className="actions"><UiLanguageSwitch/><ThemeSwitch/><SignOutButton/></div></div>;
 if(!account)return <main className="center-page" dir={dir}><Brand/><p className="connecting">{error||<><span className="spinner"/>{t('Loading presenter login…','جارٍ تحميل تسجيل الدخول…')}</>}</p></main>;
 if(!account.enabled)return <Presenter/>;
 if(!account.authenticated)return <main className="center-page" dir={dir} lang={lang}>{top}<span className="eyebrow">{t('PRESENTER CONTROL CENTER','مركز تحكم مقدم الورشة')}</span><h1>{t('Presenter login','دخول مقدم الورشة')}</h1><p>{t('Sign in to create and manage your workshops.','سجّل الدخول لإنشاء ورشك وإدارتها.')}</p><form className="panel stack" onSubmit={login}><label>{t('Username','اسم المستخدم')}<input required autoComplete="username" dir="ltr" value={username} onChange={e=>setUsername(e.target.value)}/></label><label>{t('Password','كلمة المرور')}<input required type="password" autoComplete="current-password" dir="ltr" value={password} onChange={e=>setPassword(e.target.value)}/></label>{error&&<div className="error" role="alert">{error}</div>}<button className="btn primary full-width" disabled={busy}><LogIn size={17}/>{busy?t('Signing in…','جارٍ تسجيل الدخول…'):t('Sign in','تسجيل الدخول')}</button></form><a className="muted" href={appUrl('/join')}>{t('Joining as a student? Enter here.','تنضم كطالب؟ ادخل من هنا.')}</a></main>;
 const code=new URLSearchParams(location.search).get('code');
 return <AccountContext.Provider value={signOut}>{code?<Presenter/>:create?<Presenter initialMode="create"/>:<main className="dashboard" dir={dir} lang={lang}>{top}<WorkshopDashboard sessions={account.sessions} lang={lang} onCreate={()=>setCreate(true)} reload={refresh}/></main>}</AccountContext.Provider>;
}
