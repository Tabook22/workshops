import {useEffect, useMemo, useState} from 'react';
import {Save, RotateCcw, ExternalLink, Search, Users, Briefcase, GraduationCap, Undo2} from 'lucide-react';
import {Modal, useToast} from '../lib/client';
import {useLanding, setLanding} from '../lib/app-info-client';
import {defaultLanding, landingPresets, landingSections, presetContent, type LandingContent, type LandingKey} from '../lib/landing-content';
import {tx, translateError, type UiLang} from '../lib/i18n';
import {appUrl} from '../lib/urls';

type Preset = keyof typeof landingPresets;
const presetIcons: Record<Preset, typeof Users> = {students: GraduationCap, employees: Briefcase, public: Users};

async function post(body: unknown, lang: UiLang) {
  const r = await fetch(appUrl('/api/app'), {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)});
  const d = await r.json().catch(() => ({})) as {error?: string; landing?: LandingContent};
  if (!r.ok) throw new Error(translateError(d.error || 'Unable to save. Please retry.', lang));
  return d;
}

export default function LandingSettings({lang}: {lang: UiLang}) {
  const t = (en: string, ar: string) => tx(lang, en, ar);
  const saved = useLanding();
  const [form, setForm] = useState<LandingContent>(saved);
  // When the saved wording arrives (or changes elsewhere), adopt it unless the admin has started editing.
  const [base, setBase] = useState(saved);
  useEffect(() => { setForm(f => JSON.stringify(f) === JSON.stringify(base) ? saved : f); setBase(saved); }, [saved]);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [confirm, setConfirm] = useState<Preset | 'reset' | null>(null);
  const {toast, notify} = useToast();
  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(saved), [form, saved]);
  const edited = (Object.keys(defaultLanding) as LandingKey[]).filter(k => form[k].en !== defaultLanding[k].en || form[k].ar !== defaultLanding[k].ar).length;
  const set = (key: LandingKey, side: 'en' | 'ar', value: string) => setForm(f => ({...f, [key]: {...f[key], [side]: value}}));
  const matches = (key: LandingKey, label: {en: string; ar: string}) => !query || [label.en, label.ar, form[key].en, form[key].ar].join(' ').toLowerCase().includes(query.toLowerCase());

  async function save(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError('');
    try { const d = await post({action: 'landing', landing: form}, lang); setLanding(d.landing!); setForm(d.landing!); notify(t('Home page saved — visible to everyone now', 'تم حفظ الصفحة الرئيسية — ظاهرة للجميع الآن')); }
    catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }
  async function restore() {
    setBusy(true); setError('');
    try { await post({action: 'resetLanding'}, lang); setLanding(defaultLanding); setForm(defaultLanding); setConfirm(null); notify(t('Original wording restored', 'تمت استعادة النص الأصلي')); }
    catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }

  return <form className="settings-layout" onSubmit={save}>
    <div className="stack">
      <section className="panel stack">
        <div><h3 className="settings-subtitle">{t('Who is your audience?', 'من هو جمهورك؟')}</h3><p className="inline-help">{t('Start from ready-made wording, then adjust anything below. Nothing changes for visitors until you click Save.', 'ابدأ من نص جاهز ثم عدّل ما تشاء أدناه. لا يتغير شيء للزوار حتى تضغط «حفظ».')}</p></div>
        <div className="preset-options">{(Object.keys(landingPresets) as Preset[]).map(p => { const Icon = presetIcons[p]; const preset = landingPresets[p]; return <button type="button" key={p} className="preset-option" onClick={() => setConfirm(p)}><Icon size={22} /><strong>{t(preset.label.en, preset.label.ar)}</strong><small>{t(preset.hint.en, preset.hint.ar)}</small></button>; })}</div>
      </section>
      <label className="wall-search landing-search"><Search size={18} /><input aria-label={t('Find a text', 'ابحث عن نص')} placeholder={t('Find a text… (for example “students”)', 'ابحث عن نص… (مثلاً «الطلاب»)')} value={query} onChange={e => setQuery(e.target.value)} /></label>
      {landingSections.map(section => { const fields = section.fields.filter(([key, label]) => matches(key, label)); if (!fields.length) return null; return <fieldset key={section.title.en} className="panel settings-group landing-group"><legend>{t(section.title.en, section.title.ar)}</legend>
        <div className="landing-head" aria-hidden="true"><span /><span>English</span><span>العربية</span></div>
        {fields.map(([key, label, long]) => { const changed = form[key].en !== defaultLanding[key].en || form[key].ar !== defaultLanding[key].ar; return <div key={key} className={'landing-row' + (changed ? ' changed' : '')}>
          <div className="landing-label"><span>{t(label.en, label.ar)}</span>{changed && <><span className="edited-dot">{t('Edited', 'معدّل')}</span><button type="button" className="link-button small-link" onClick={() => setForm(f => ({...f, [key]: defaultLanding[key]}))}><Undo2 size={12} />{t('Reset', 'استعادة')}</button></>}</div>
          {(['en', 'ar'] as const).map(side => long
            ? <textarea key={side} dir={side === 'ar' ? 'rtl' : 'ltr'} lang={side} rows={3} maxLength={400} aria-label={t(label.en, label.ar) + (side === 'ar' ? ' (العربية)' : ' (English)')} value={form[key][side]} onChange={e => set(key, side, e.target.value)} />
            : <input key={side} dir={side === 'ar' ? 'rtl' : 'ltr'} lang={side} maxLength={400} aria-label={t(label.en, label.ar) + (side === 'ar' ? ' (العربية)' : ' (English)')} value={form[key][side]} onChange={e => set(key, side, e.target.value)} />)}
        </div>; })}
      </fieldset>; })}
    </div>
    <aside className="settings-side">
      <div className="panel settings-actions">
        <p className="muted">{dirty ? t('You have unsaved changes.', 'لديك تغييرات غير محفوظة.') : t('Everything is saved.', 'تم حفظ كل شيء.')}</p>
        <p className="inline-help">{t(`${edited} texts differ from the original wording.`, `${edited} نصاً مختلفاً عن النص الأصلي.`)}</p>
        {error && <div className="error" role="alert">{error}</div>}
        <button className="btn primary full-width" disabled={busy || !dirty}><Save size={17} />{busy ? t('Saving…', 'جارٍ الحفظ…') : t('Save home page', 'حفظ الصفحة الرئيسية')}</button>
        <button type="button" className="btn secondary full-width" disabled={busy || !dirty} onClick={() => setForm(saved)}>{t('Discard changes', 'تجاهل التغييرات')}</button>
        <a className="btn ghost full-width" href={appUrl('/')} target="_blank" rel="noreferrer"><ExternalLink size={16} />{t('View home page', 'عرض الصفحة الرئيسية')}</a>
        <button type="button" className="btn ghost full-width" disabled={busy} onClick={() => setConfirm('reset')}><RotateCcw size={16} />{t('Restore original wording', 'استعادة النص الأصلي')}</button>
        <p className="inline-help">{t('The logo, application name and tagline are edited in “Application & About”.', 'يُعدَّل الشعار واسم التطبيق والشعار النصي من «التطبيق وصفحة عن التطبيق».')}</p>
      </div>
    </aside>
    {confirm && confirm !== 'reset' && <Modal title={t(`Use the “${landingPresets[confirm].label.en}” wording?`, `استخدام نص «${landingPresets[confirm].label.ar}»؟`)} onClose={() => setConfirm(null)}><p className="muted">{t('The form will be filled with wording for this audience. Your current edits in the form are replaced, but nothing is published until you click Save.', 'سيُملأ النموذج بنص مناسب لهذا الجمهور، وتُستبدل تعديلاتك الحالية في النموذج، ولن يُنشر شيء حتى تضغط «حفظ».')}</p><div className="actions"><button type="button" className="btn primary" onClick={() => { setForm(presetContent(confirm)); setConfirm(null); }}>{t('Fill the form', 'املأ النموذج')}</button><button type="button" className="btn secondary" onClick={() => setConfirm(null)}>{t('Cancel', 'إلغاء')}</button></div></Modal>}
    {confirm === 'reset' && <Modal title={t('Restore the original wording?', 'استعادة النص الأصلي؟')} onClose={() => setConfirm(null)}><p className="muted">{t('Every text on the home page returns to its original version, for everyone, straight away.', 'تعود كل نصوص الصفحة الرئيسية إلى نسختها الأصلية، للجميع، فوراً.')}</p><div className="actions"><button type="button" className="btn danger" disabled={busy} onClick={() => void restore()}>{t('Restore', 'استعادة')}</button><button type="button" className="btn secondary" onClick={() => setConfirm(null)}>{t('Cancel', 'إلغاء')}</button></div></Modal>}
    {toast && <div className="toast" role="status">{toast}</div>}
  </form>;
}
