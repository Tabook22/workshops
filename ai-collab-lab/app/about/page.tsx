"use client";
import {appUrl} from '../../lib/urls';
import {Command, Tag, CalendarDays, CalendarCheck, Building2, UserRound, Mail, Globe, Languages, ShieldCheck, Smartphone, GraduationCap, Sparkles, MonitorSmartphone, ArrowUpRight} from 'lucide-react';
import {BrandText, ThemeSwitch, UiLanguageSwitch} from '../../lib/client';
import {useAppInfo} from '../../lib/app-info-client';
import {useUiLang, tx} from '../../lib/i18n';

const features = [
  [GraduationCap, 'Guided five-step journey', 'رحلة موجهة من خمس خطوات', 'From a real problem to a product brief and an AI build prompt.', 'من مشكلة حقيقية إلى ملخص منتج وتعليمات بناء بالذكاء الاصطناعي.'],
  [Smartphone, 'Students join from their phones', 'انضمام الطلاب من هواتفهم', 'Scan a QR code — no accounts, no installs, nicknames only.', 'امسح رمز QR — بلا حسابات ولا تثبيت، بأسماء مستعارة فقط.'],
  [Sparkles, 'Built-in learning coach', 'مدرب تعلّم مدمج', 'Sentence starters, examples, a quality meter and an AI-literacy activity.', 'بدايات جمل وأمثلة ومقياس جودة ونشاط للوعي بالذكاء الاصطناعي.'],
  [Languages, 'Arabic & English', 'العربية والإنجليزية', 'Full right-to-left layout, chosen per person or per workshop.', 'تخطيط كامل من اليمين إلى اليسار، يختاره كل شخص أو كل ورشة.'],
  [MonitorSmartphone, 'Dark & light templates', 'قالبان داكن وفاتح', 'Readable on projectors in bright rooms and on phones at night.', 'واضح على أجهزة العرض في القاعات المضيئة وعلى الهواتف ليلاً.'],
  [ShieldCheck, 'Privacy & safety by design', 'الخصوصية والسلامة أولاً', 'Moderation, no personal data, and human oversight of AI.', 'إشراف على المشاركات، دون بيانات شخصية، مع رقابة بشرية على الذكاء الاصطناعي.'],
] as const;

export default function About() {
  const info = useAppInfo(), lang = useUiLang(), t = (en: string, ar: string) => tx(lang, en, ar);
  const date = (d: string) => { if (!d) return ''; const v = new Date(d + 'T00:00:00'); return Number.isNaN(v.getTime()) ? d : v.toLocaleDateString(lang === 'ar' ? 'ar-OM-u-nu-latn' : 'en-GB', {day: 'numeric', month: 'long', year: 'numeric'}); };
  const name = t(info.name, info.nameAr || info.name);
  const facts: [typeof Tag, string, React.ReactNode][] = [
    [Tag, t('Version', 'الإصدار'), <span dir="ltr" key="v">{info.version}</span>],
    [CalendarCheck, t('Current release', 'تاريخ الإصدار الحالي'), date(info.updatedOn)],
    [CalendarDays, t('Created', 'تاريخ الإنشاء'), date(info.created)],
    [Building2, t('Organization', 'الجهة'), t(info.organization, info.organizationAr || info.organization)],
    ...(info.developer ? [[UserRound, t('Developed by', 'تطوير'), info.developer] as [typeof Tag, string, React.ReactNode]] : []),
    ...(info.contact ? [[Mail, t('Contact', 'التواصل'), <a key="c" href={'mailto:' + info.contact} dir="ltr">{info.contact}</a>] as [typeof Tag, string, React.ReactNode]] : []),
    ...(info.website ? [[Globe, t('Website', 'الموقع'), <a key="w" href={info.website} target="_blank" rel="noreferrer" dir="ltr">{info.website.replace(/^https?:\/\//, '')}</a>] as [typeof Tag, string, React.ReactNode]] : []),
  ];
  return <main className="about-page" dir={lang === 'ar' ? 'rtl' : 'ltr'} lang={lang}>
    <header className="brand-header"><a className="brand" href={appUrl('/')}><span className="brand-icon"><Command size={22} /></span><BrandText /></a><div className="actions"><UiLanguageSwitch /><ThemeSwitch /></div></header>
    <section className="about-hero">
      <span className="about-logo" aria-hidden="true"><Command size={40} /></span>
      <div><span className="eyebrow">{t('ABOUT THE APPLICATION', 'عن التطبيق')}</span><h1>{name}</h1><p className="about-tagline">{t(info.tagline, info.taglineAr || info.tagline)}</p><span className="version-badge" dir="ltr">v{info.version}</span></div>
    </section>
    <section className="about-grid">
      <article className="about-card about-description"><h2>{t('What it is', 'ما هو التطبيق')}</h2>{t(info.description, info.descriptionAr || info.description).split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>)}<div className="actions"><a className="btn primary" href={appUrl('/join')}>{t('Join a workshop', 'انضم إلى ورشة')} <ArrowUpRight size={17} /></a><a className="btn secondary" href={appUrl('/presenter')}>{t('Presenter login', 'دخول مقدم الورشة')}</a></div></article>
      <aside className="about-card about-facts" aria-label={t('Application details', 'تفاصيل التطبيق')}><h2>{t('Details', 'التفاصيل')}</h2><dl>{facts.map(([Icon, label, value]) => <div key={label}><dt><Icon size={16} />{label}</dt><dd>{value || '—'}</dd></div>)}</dl></aside>
    </section>
    <section><h2 className="about-section-title">{t('Highlights', 'أبرز المزايا')}</h2><div className="about-features">{features.map(([Icon, en, ar, den, dar]) => <div key={en} className="about-feature"><Icon size={22} /><h3>{t(en, ar)}</h3><p>{t(den, dar)}</p></div>)}</div></section>
    <footer className="about-footer"><span>© {(info.created || '').slice(0, 4) || new Date().getFullYear()}{new Date().getFullYear() > Number((info.created || '').slice(0, 4)) ? '–' + new Date().getFullYear() : ''} {t(info.organization, info.organizationAr || info.organization)}</span><span dir="ltr">{info.name} v{info.version}</span></footer>
  </main>;
}
