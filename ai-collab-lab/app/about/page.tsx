"use client";
import {appUrl} from '../../lib/urls';
import {Command, Tag, CalendarDays, CalendarCheck, Building2, UserRound, Mail, Globe, ArrowUpRight, Megaphone, Briefcase, Bot, Languages, Rocket, Smartphone, Presentation, Lightbulb, Quote} from 'lucide-react';
import {BrandText, ThemeSwitch, UiLanguageSwitch} from '../../lib/client';
import {useAppInfo} from '../../lib/app-info-client';
import {defaultAppInfo} from '../../lib/app-info';
import {intro} from '../../lib/intro';
import {useUiLang, tx} from '../../lib/i18n';

const whyIcons = [Megaphone, Briefcase, Bot, Languages, Rocket];

export default function About() {
  const info = useAppInfo(), lang = useUiLang(), ar = lang === 'ar';
  const t = (en: string, arabic: string) => tx(lang, en, arabic);
  // The introduction mentions the app by its default name; show the name the admin chose instead.
  const name = t(info.name, info.nameAr || info.name);
  const fill = (text: string) => text.split(defaultAppInfo.name).join(info.name).split(defaultAppInfo.nameAr).join(info.nameAr || info.name);
  const p = (pair: readonly [string, string]) => fill(t(pair[0], pair[1]));
  const date = (d: string) => { if (!d) return ''; const v = new Date(d + 'T00:00:00'); return Number.isNaN(v.getTime()) ? d : v.toLocaleDateString(ar ? 'ar-OM-u-nu-latn' : 'en-GB', {day: 'numeric', month: 'long', year: 'numeric'}); };
  const facts: [typeof Tag, string, React.ReactNode][] = [
    [Tag, t('Version', 'الإصدار'), <span dir="ltr" key="v">{info.version}</span>],
    [CalendarCheck, t('Current release', 'تاريخ الإصدار الحالي'), date(info.updatedOn)],
    [CalendarDays, t('Created', 'تاريخ الإنشاء'), date(info.created)],
    [Building2, t('Organization', 'الجهة'), t(info.organization, info.organizationAr || info.organization)],
    ...(info.developer ? [[UserRound, t('Developed by', 'تطوير'), info.developer] as [typeof Tag, string, React.ReactNode]] : []),
    ...(info.contact ? [[Mail, t('Contact', 'التواصل'), <a key="c" href={'mailto:' + info.contact} dir="ltr">{info.contact}</a>] as [typeof Tag, string, React.ReactNode]] : []),
    ...(info.website ? [[Globe, t('Website', 'الموقع'), <a key="w" href={info.website} target="_blank" rel="noreferrer" dir="ltr">{info.website.replace(/^https?:\/\//, '')}</a>] as [typeof Tag, string, React.ReactNode]] : []),
  ];
  const description = t(info.description, info.descriptionAr || info.description);
  const defaultDescription = t(defaultAppInfo.description, defaultAppInfo.descriptionAr);
  return <main className="about-page" dir={ar ? 'rtl' : 'ltr'} lang={lang}>
    <header className="brand-header"><a className="brand" href={appUrl('/')}><span className="brand-icon"><Command size={22} /></span><BrandText /></a><div className="actions"><UiLanguageSwitch /><ThemeSwitch /></div></header>
    <section className="about-hero">
      <span className="about-logo" aria-hidden="true"><Command size={40} /></span>
      <div><span className="eyebrow">{t('ABOUT THE APPLICATION', 'عن التطبيق')}</span><h1>{name}</h1><p className="about-tagline">{t(info.tagline, info.taglineAr || info.tagline)}</p><span className="version-badge" dir="ltr">v{info.version}</span></div>
    </section>
    <nav className="about-toc" aria-label={t('On this page', 'في هذه الصفحة')}>{[['what', intro.title], ['why', intro.whyTitle], ['steps', intro.stepsTitle], ['guide', intro.useTitle]].map(([id, label]) => <a key={id as string} href={'#' + id}>{p(label as [string, string]).replace(/\?.*$/, '?').replace(/؟.*$/, '؟')}</a>)}</nav>

    <section className="about-grid" id="what">
      <article className="about-card about-description"><h2>{p(intro.title)}</h2>{intro.what.map((pair, i) => <p key={i}>{p(pair)}</p>)}<div className="actions"><a className="btn primary" href={appUrl('/join')}>{t('Join a workshop', 'انضم إلى ورشة')} <ArrowUpRight size={17} /></a><a className="btn secondary" href={appUrl('/presenter')}>{t('Presenter login', 'دخول مقدم الورشة')}</a></div></article>
      <aside className="about-card about-facts" aria-label={t('Application details', 'تفاصيل التطبيق')}><h2>{t('Details', 'التفاصيل')}</h2><dl>{facts.map(([Icon, label, value]) => <div key={label}><dt><Icon size={16} />{label}</dt><dd>{value || '—'}</dd></div>)}</dl></aside>
    </section>

    <section id="why"><h2 className="about-section-title">{p(intro.whyTitle)}</h2><div className="about-features">{intro.why.map(([head, body], i) => { const Icon = whyIcons[i]; return <div key={i} className="about-feature"><Icon size={22} /><h3>{p(head)}</h3><p>{p(body)}</p></div>; })}</div></section>

    <section id="steps"><h2 className="about-section-title">{p(intro.stepsTitle)}</h2><ol className="about-steps">{intro.steps.map(([head, body], i) => <li key={i}><span className="about-step-num">{i + 1}</span><div><strong>{p(head)}</strong><p>{p(body)}</p></div></li>)}</ol></section>

    <section id="guide"><h2 className="about-section-title">{p(intro.useTitle)}</h2><div className="about-guide">
      <article className="about-card"><h3><Smartphone size={20} />{p(intro.student.title)}</h3><ol>{intro.student.steps.map((s, i) => <li key={i}>{p(s)}</li>)}</ol><p className="about-tip"><Lightbulb size={16} />{p(intro.student.tip)}</p></article>
      <article className="about-card"><h3><Presentation size={20} />{p(intro.presenter.title)}</h3><ol>{intro.presenter.steps.map((s, i) => <li key={i}>{p(s)}</li>)}</ol></article>
    </div></section>

    <section className="about-oneline"><Quote size={26} /><div><span className="eyebrow">{p(intro.oneLineTitle)}</span><p>{p(intro.oneLine)}</p></div></section>

    {description.trim() && description !== defaultDescription && <section className="about-card about-more"><h2>{t('More about this platform', 'المزيد عن هذه المنصة')}</h2>{description.split(/\n{2,}/).map((para, i) => <p key={i}>{para}</p>)}</section>}

    <footer className="about-footer"><span>© {(info.created || '').slice(0, 4) || new Date().getFullYear()}{new Date().getFullYear() > Number((info.created || '').slice(0, 4)) ? '–' + new Date().getFullYear() : ''} {t(info.organization, info.organizationAr || info.organization)}</span><span dir="ltr">{info.name} v{info.version}</span></footer>
  </main>;
}
