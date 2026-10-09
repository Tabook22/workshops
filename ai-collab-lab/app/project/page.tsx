"use client";

import {appUrl} from "../../lib/urls";
import {useState,useEffect} from 'react';
import Console from '../../lib/console';
import {Brand,UiLanguageSwitch} from '../../lib/client';
import {useUiLang,tx} from '../../lib/i18n';
export default function Project(){const lang=useUiLang();const [code,setCode]=useState('');useEffect(()=>setCode(new URLSearchParams(location.search).get('code')?.toUpperCase()||''),[]);return code?<Console code={code} publicProjector/>:<main className="center-page" dir={lang==='ar'?'rtl':'ltr'}><div className="page-top"><Brand/><UiLanguageSwitch/></div><h1>{tx(lang,'Open a workshop display','افتح شاشة عرض الورشة')}</h1><p>{tx(lang,'Use the projector link from your presenter control center.','استخدم رابط العرض من مركز تحكم مقدم الورشة.')}</p><a className="btn primary" href={appUrl("/presenter")}>{tx(lang,'Presenter login','دخول مقدم الورشة')}</a></main>}
