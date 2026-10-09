import {useMemo, useState} from 'react';
import {ArrowLeft, Command, Save, RotateCcw, KeyRound, Eye, EyeOff, Palette, UserCog, Check, ExternalLink} from 'lucide-react';
import {Modal, useToast} from '../lib/client';
import {useAppInfo, setAppInfo} from '../lib/app-info-client';
import {defaultAppInfo, sanitizeAppInfo, type AppInfo} from '../lib/app-info';
import {tx, translateError, type UiLang} from '../lib/i18n';
import {appUrl} from '../lib/urls';

async function post(path: string, body: unknown, lang: UiLang) {
  const r = await fetch(appUrl(path), {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)});
  let d: {error?: string; info?: AppInfo; username?: string} = {};
  try { d = await r.json(); } catch { /* empty body */ }
  if (!r.ok) throw new Error(translateError(d.error || 'Unable to save. Please retry.', lang));
  return d;
}

export default function AdminSettings({lang, username, onBack, onUsername}: {lang: UiLang; username: string; onBack: () => void; onUsername: (u: string) => void}) {
  const t = (en: string, ar: string) => tx(lang, en, ar);
  const [tab, setTab] = useState<'app' | 'account'>('app');
  return <section className="admin-settings">
    <button className="btn small ghost back-link" onClick={onBack}><ArrowLeft size={16} />{t('Back to your workshops', 'العودة إلى ورشك')}</button>
    <div className="dashboard-head"><div><span className="eyebrow">{t('ADMINISTRATION', 'الإدارة')}</span><h1>{t('Settings', 'الإعدادات')}</h1><p className="muted">{t('Branding, About page and your administrator account.', 'الهوية وصفحة «عن التطبيق» وحساب المسؤول.')}</p></div></div>
    <div className="seg settings-tabs" role="tablist"><button role="tab" aria-selected={tab === 'app'} className={tab === 'app' ? 'active' : ''} onClick={() => setTab('app')}><Palette size={16} />{t('Application & About', 'التطبيق وصفحة «عن التطبيق»')}</button><button role="tab" aria-selected={tab === 'account'} className={tab === 'account' ? 'active' : ''} onClick={() => setTab('account')}><UserCog size={16} />{t('Admin account', 'حساب المسؤول')}</button></div>
    {tab === 'app' ? <AppForm lang={lang} /> : <AccountForm lang={lang} username={username} onUsername={onUsername} />}
  </section>;
}

function AppForm({lang}: {lang: UiLang}) {
  const t = (en: string, ar: string) => tx(lang, en, ar);
  const saved = useAppInfo();
  const [form, setForm] = useState<AppInfo>(saved);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [confirmReset, setConfirmReset] = useState(false);
  const {toast, notify} = useToast();
  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(saved), [form, saved]);
  const set = (key: keyof AppInfo) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm(f => ({...f, [key]: e.target.value}));
  async function save(e: React.FormEvent) {
    e.preventDefault(); setError('');
    const check = sanitizeAppInfo(form);
    if (check.error) { setError(translateError(check.error, lang)); return; }
    setBusy(true);
    try { const d = await post('/api/app', {action: 'update', info: check.info}, lang); setAppInfo(d.info!); setForm(d.info!); notify(t('Settings saved — visible to everyone now', 'تم الحفظ — التغييرات ظاهرة للجميع الآن')); }
    catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }
  async function reset() {
    setBusy(true); setError('');
    try { await post('/api/app', {action: 'reset'}, lang); setAppInfo(defaultAppInfo); setForm(defaultAppInfo); setConfirmReset(false); notify(t('Default branding restored', 'تمت استعادة الهوية الافتراضية')); }
    catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }
  const field = (key: keyof AppInfo, en: string, ar: string, opts: {area?: boolean; dir?: 'ltr' | 'rtl' | 'auto'; type?: string; help?: [string, string]; max?: number; placeholder?: string} = {}) =>
    <label className={opts.area ? 'field full' : 'field'}>{t(en, ar)}{opts.area
      ? <textarea dir={opts.dir || 'auto'} value={form[key]} maxLength={opts.max} onChange={set(key)} rows={6} />
      : <input dir={opts.dir || 'auto'} type={opts.type || 'text'} value={form[key]} maxLength={opts.max} placeholder={opts.placeholder} onChange={set(key)} />}
      {opts.help && <small className="inline-help">{t(...opts.help)}</small>}</label>;
  return <form className="settings-layout" onSubmit={save}>
    <div className="stack">
      <fieldset className="panel settings-group"><legend>{t('Logo', 'الشعار')}</legend>
        <div className="logo-preview" aria-label={t('Logo preview', 'معاينة الشعار')}><span className="brand-icon"><Command size={22} /></span><span className="brand">{form.logoText}{form.logoText && form.logoAccent ? ' ' : ''}{form.logoAccent && <b>{form.logoAccent}</b>}</span></div>
        <div className="form-grid">{field('logoText', 'Logo text', 'نص الشعار', {max: 24, dir: 'ltr'})}{field('logoAccent', 'Highlighted part', 'الجزء المميّز', {max: 12, dir: 'ltr', help: ['Shown in the accent colour after the logo text.', 'يظهر بلون مميز بعد نص الشعار.']})}</div>
      </fieldset>
      <fieldset className="panel settings-group"><legend>{t('Name & version', 'الاسم والإصدار')}</legend>
        <div className="form-grid">{field('name', 'Application name (English)', 'اسم التطبيق (بالإنجليزية)', {max: 80, dir: 'ltr'})}{field('nameAr', 'Application name (Arabic)', 'اسم التطبيق (بالعربية)', {max: 80, dir: 'rtl'})}{field('tagline', 'Tagline (English)', 'الشعار النصي (بالإنجليزية)', {max: 120, dir: 'ltr'})}{field('taglineAr', 'Tagline (Arabic)', 'الشعار النصي (بالعربية)', {max: 120, dir: 'rtl'})}{field('version', 'Version', 'الإصدار', {max: 24, dir: 'ltr', placeholder: '2.0.0', help: ['For example 2.0.0 or 2.1-beta.', 'مثل 2.0.0 أو 2.1-beta.']})}{field('updatedOn', 'Release date of this version', 'تاريخ إصدار هذه النسخة', {type: 'date', dir: 'ltr'})}{field('created', 'Date created', 'تاريخ الإنشاء', {type: 'date', dir: 'ltr'})}</div>
      </fieldset>
      <fieldset className="panel settings-group"><legend>{t('About page', 'صفحة «عن التطبيق»')}</legend>
        <div className="form-grid">{field('description', 'Description (English)', 'الوصف (بالإنجليزية)', {area: true, max: 2000, dir: 'ltr', help: ['Leave a blank line between paragraphs.', 'اترك سطراً فارغاً بين الفقرات.']})}{field('descriptionAr', 'Description (Arabic)', 'الوصف (بالعربية)', {area: true, max: 2000, dir: 'rtl'})}{field('organization', 'Organization (English)', 'الجهة (بالإنجليزية)', {max: 160, dir: 'ltr'})}{field('organizationAr', 'Organization (Arabic)', 'الجهة (بالعربية)', {max: 160, dir: 'rtl'})}{field('developer', 'Developed by (optional)', 'تطوير (اختياري)', {max: 160})}{field('contact', 'Contact email (optional)', 'بريد التواصل (اختياري)', {type: 'email', max: 120, dir: 'ltr'})}{field('website', 'Website (optional)', 'الموقع الإلكتروني (اختياري)', {type: 'url', max: 200, dir: 'ltr', placeholder: 'https://'})}</div>
      </fieldset>
    </div>
    <aside className="settings-side">
      <div className="panel settings-actions">
        <p className="muted">{dirty ? t('You have unsaved changes.', 'لديك تغييرات غير محفوظة.') : t('Everything is saved.', 'تم حفظ كل شيء.')}</p>
        {error && <div className="error" role="alert">{error}</div>}
        <button className="btn primary full-width" disabled={busy || !dirty}><Save size={17} />{busy ? t('Saving…', 'جارٍ الحفظ…') : t('Save settings', 'حفظ الإعدادات')}</button>
        <button type="button" className="btn secondary full-width" disabled={busy || !dirty} onClick={() => setForm(saved)}>{t('Discard changes', 'تجاهل التغييرات')}</button>
        <a className="btn ghost full-width" href={appUrl('/about')} target="_blank" rel="noreferrer"><ExternalLink size={16} />{t('View About page', 'عرض صفحة «عن التطبيق»')}</a>
        <button type="button" className="btn ghost full-width" disabled={busy} onClick={() => setConfirmReset(true)}><RotateCcw size={16} />{t('Restore defaults', 'استعادة الافتراضي')}</button>
      </div>
    </aside>
    {confirmReset && <Modal title={t('Restore the default branding?', 'استعادة الهوية الافتراضية؟')} onClose={() => setConfirmReset(false)}><p className="muted">{t('The logo, name, version and About text return to their original values. Workshops are not affected.', 'يعود الشعار والاسم والإصدار ونص «عن التطبيق» إلى القيم الأصلية. لا تتأثر الورش.')}</p><div className="actions"><button className="btn danger" disabled={busy} onClick={() => void reset()}>{t('Restore defaults', 'استعادة الافتراضي')}</button><button className="btn secondary" onClick={() => setConfirmReset(false)}>{t('Cancel', 'إلغاء')}</button></div></Modal>}
    {toast && <div className="toast" role="status">{toast}</div>}
  </form>;
}

function strengthOf(p: string) {
  if (p.length < 10) return 0; // shorter passwords are rejected by the server
  let s = 0;
  if (p.length >= 10) s++;
  if (p.length >= 14) s++;
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s++;
  if (/\d/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  return Math.min(4, s);
}

function AccountForm({lang, username, onUsername}: {lang: UiLang; username: string; onUsername: (u: string) => void}) {
  const t = (en: string, ar: string) => tx(lang, en, ar);
  const [form, setForm] = useState({username, currentPassword: '', newPassword: '', confirm: ''});
  const [show, setShow] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState(''), [done, setDone] = useState('');
  const strength = strengthOf(form.newPassword);
  const labels: [string, string][] = [['Too weak', 'ضعيفة جداً'], ['Weak', 'ضعيفة'], ['Fair', 'مقبولة'], ['Good', 'جيدة'], ['Strong', 'قوية']];
  const mismatch = !!form.confirm && form.confirm !== form.newPassword;
  const changingName = form.username.trim() !== username, changingPassword = !!form.newPassword;
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(''); setDone('');
    if (mismatch) { setError(t('The new passwords do not match.', 'كلمتا المرور الجديدتان غير متطابقتين.')); return; }
    setBusy(true);
    try {
      const d = await post('/api/account', {action: 'updateCredentials', currentPassword: form.currentPassword, username: form.username.trim(), newPassword: form.newPassword}, lang);
      onUsername(d.username || form.username.trim());
      setForm({username: d.username || form.username.trim(), currentPassword: '', newPassword: '', confirm: ''});
      setDone(t('Your account is updated. Other devices have been signed out; this one stays signed in.', 'تم تحديث حسابك. سُجّل الخروج من الأجهزة الأخرى، ويبقى هذا الجهاز مسجلاً.'));
    } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }
  const pw = (key: 'currentPassword' | 'newPassword' | 'confirm', en: string, ar: string, auto: string) => <label>{t(en, ar)}<span className="password-field"><input type={show ? 'text' : 'password'} dir="ltr" autoComplete={auto} value={form[key]} onChange={e => setForm(f => ({...f, [key]: e.target.value}))} required={key === 'currentPassword'} /><button type="button" className="icon-action" onClick={() => setShow(!show)} aria-label={show ? t('Hide passwords', 'إخفاء كلمات المرور') : t('Show passwords', 'إظهار كلمات المرور')}>{show ? <EyeOff size={16} /> : <Eye size={16} />}</button></span></label>;
  return <form className="settings-layout" onSubmit={submit}>
    <div className="panel stack account-form">
      <div className="account-head"><span className="account-avatar"><KeyRound size={22} /></span><div><strong dir="ltr">{username}</strong><p className="muted">{t('Administrator of this application', 'مسؤول هذا التطبيق')}</p></div></div>
      <label>{t('Username', 'اسم المستخدم')}<input dir="ltr" autoComplete="username" value={form.username} maxLength={40} onChange={e => setForm(f => ({...f, username: e.target.value}))} required /><small className="inline-help">{t('3–40 characters: letters, numbers, dot, dash, underscore or @.', 'من 3 إلى 40 حرفاً: حروف أو أرقام أو نقطة أو شرطة أو @.')}</small></label>
      {pw('newPassword', 'New password (leave empty to keep the current one)', 'كلمة المرور الجديدة (اتركها فارغة للإبقاء على الحالية)', 'new-password')}
      {form.newPassword && <div className={'quality-meter q' + strength} aria-live="polite"><div className="quality-bar" aria-hidden="true">{[0, 1, 2, 3].map(i => <span key={i} className={i < strength ? 'on' : ''} />)}</div><strong>{t(...labels[strength])}</strong><ul><li className={form.newPassword.length >= 10 ? 'ok' : ''}>{form.newPassword.length >= 10 ? <Check size={13} /> : <span className="todo-dot" />}{t('At least 10 characters', '10 أحرف على الأقل')}</li><li className={/\d/.test(form.newPassword) && /[^A-Za-z0-9]/.test(form.newPassword) ? 'ok' : ''}>{/\d/.test(form.newPassword) && /[^A-Za-z0-9]/.test(form.newPassword) ? <Check size={13} /> : <span className="todo-dot" />}{t('A number and a symbol', 'رقم ورمز')}</li></ul></div>}
      {form.newPassword && pw('confirm', 'Confirm new password', 'تأكيد كلمة المرور الجديدة', 'new-password')}
      {mismatch && <p className="error">{t('The new passwords do not match.', 'كلمتا المرور الجديدتان غير متطابقتين.')}</p>}
      {pw('currentPassword', 'Current password (required to save)', 'كلمة المرور الحالية (مطلوبة للحفظ)', 'current-password')}
      {error && <div className="error" role="alert">{error}</div>}
      {done && <div className="success" role="status">{done}</div>}
      <button className="btn primary" disabled={busy || (!changingName && !changingPassword) || !form.currentPassword || mismatch || (changingPassword && form.newPassword.length < 10)}><Save size={17} />{busy ? t('Saving…', 'جارٍ الحفظ…') : t('Update account', 'تحديث الحساب')}</button>
    </div>
    <aside className="settings-side"><div className="panel settings-actions"><h3>{t('How sign-in works', 'كيف يعمل تسجيل الدخول')}</h3><ul className="settings-notes"><li>{t('Passwords are stored only as a salted scrypt hash, never in plain text.', 'تُخزَّن كلمات المرور كبصمة scrypt مملّحة فقط، ولا تُحفظ كنص أبداً.')}</li><li>{t('Changing your details signs out every other device.', 'يؤدي تغيير بياناتك إلى تسجيل الخروج من جميع الأجهزة الأخرى.')}</li><li>{t('Sessions last 12 hours. Ten wrong passwords lock sign-in for 15 minutes.', 'تستمر الجلسة 12 ساعة، وتؤدي عشر محاولات خاطئة إلى إيقاف الدخول 15 دقيقة.')}</li><li>{t('Students never need an account.', 'لا يحتاج الطلاب إلى حساب أبداً.')}</li></ul></div></aside>
  </form>;
}
