"use client";
/** First-time visitor introduction: a short welcome on the landing page and a light banner on the join page. Shown once per device. */
import {useState} from 'react';
import {Sparkles, BookOpen, X, Check} from 'lucide-react';
import {Modal} from './client';
import {intro} from './intro';
import {useAppInfo} from './app-info-client';
import {defaultAppInfo} from './app-info';
import {tx} from './i18n';
import {appUrl} from './urls';

const SEEN = 'ai-collab-intro-seen';
const seen = () => { try { return localStorage.getItem(SEEN) === '1'; } catch { return true; } };
const markSeen = () => { try { localStorage.setItem(SEEN, '1'); } catch { /* private mode */ } };

export function WelcomeIntro({lang}: {lang: string}) {
  const [open, setOpen] = useState(() => typeof window !== 'undefined' && !seen());
  const info = useAppInfo();
  if (!open) return null;
  const t = (pair: readonly [string, string]) => tx(lang, pair[0], pair[1]);
  const close = () => { markSeen(); setOpen(false); };
  const name = tx(lang, info.name, info.nameAr || info.name);
  return <Modal title={t(intro.welcomeTitle)} onClose={close}>
    <div className="welcome-intro">
      <span className="welcome-badge"><Sparkles size={26} /></span>
      <p className="welcome-lead">{tx(lang, `${name} in 30 seconds:`, `${name} في 30 ثانية:`)}</p>
      <ul>{intro.welcome.map((pair, i) => <li key={i}><Check size={16} />{t(pair).split(defaultAppInfo.name).join(info.name)}</li>)}</ul>
      <div className="actions"><a className="btn primary" href={appUrl('/about#what')} onClick={markSeen}><BookOpen size={17} />{tx(lang, 'Read the 1-minute guide', 'اقرأ الدليل في دقيقة')}</a><button className="btn secondary" onClick={close}>{tx(lang, 'Got it, let’s start', 'فهمت، لنبدأ')}</button></div>
    </div>
  </Modal>;
}

export function NewHereBanner({lang}: {lang: string}) {
  const [show, setShow] = useState(() => typeof window !== 'undefined' && !seen());
  if (!show) return null;
  const close = () => { markSeen(); setShow(false); };
  return <div className="new-here" role="note"><Sparkles size={16} /><span>{tx(lang, 'New here? Learn how it works in one minute.', 'جديد هنا؟ تعرّف على طريقة الاستخدام في دقيقة.')}</span><a href={appUrl('/about#guide')} target="_blank" rel="noreferrer" onClick={markSeen}>{tx(lang, 'Open the guide', 'افتح الدليل')}</a><button type="button" className="icon-action" aria-label={tx(lang, 'Dismiss', 'إغلاق')} onClick={close}><X size={15} /></button></div>;
}
