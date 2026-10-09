import {useEffect, useState} from 'react';
import {Save, FlaskConical, Languages, ShieldCheck} from 'lucide-react';
import {useToast} from '../lib/client';
import {tx, translateError, type UiLang} from '../lib/i18n';
import {appUrl} from '../lib/urls';

type Provider = 'off' | 'deepl' | 'google' | 'libretranslate' | 'claude';
type Stored = {provider: Provider; endpoint: string; model: string; dailyLimit: number; hasKey: boolean; keyHint: string};
const providers: [Provider, string, string, string, string][] = [
  ['off', 'Off', 'متوقف', 'Contributions stay in the language they were written in.', 'تبقى المشاركات باللغة التي كُتبت بها.'],
  ['deepl', 'DeepL (recommended)', 'DeepL (موصى به)', 'High-quality Arabic ↔ English. The free plan (500,000 characters a month) is plenty for workshops. Free keys end in “:fx”.', 'ترجمة عالية الجودة بين العربية والإنجليزية. الخطة المجانية (500,000 حرف شهرياً) تكفي للورش. تنتهي المفاتيح المجانية بـ «:fx».'],
  ['google', 'Google Cloud Translation', 'ترجمة Google السحابية', 'Reliable and widely used; requires a Google Cloud project with billing (500,000 free characters a month).', 'موثوقة وواسعة الاستخدام؛ تتطلب مشروع Google Cloud مع الفوترة (500,000 حرف مجاناً شهرياً).'],
  ['libretranslate', 'LibreTranslate (self-hosted)', 'LibreTranslate (استضافة ذاتية)', 'Open source; contributions never leave servers you control. Quality is lower than DeepL or Claude.', 'مفتوح المصدر؛ لا تغادر المشاركات خوادمك. الجودة أقل من DeepL أو Claude.'],
  ['claude', 'Claude (Anthropic)', 'Claude (Anthropic)', 'Context-aware translation that keeps tone and technical terms. Uses an Anthropic API key; billed per use.', 'ترجمة تراعي السياق وتحافظ على النبرة والمصطلحات التقنية. تستخدم مفتاح Anthropic API وتُحتسب حسب الاستخدام.'],
];

async function post(body: unknown, lang: UiLang) {
  const r = await fetch(appUrl('/api/app'), {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)});
  const d = await r.json().catch(() => ({})) as {error?: string; sample?: string};
  if (!r.ok) throw new Error(translateError(d.error || 'Unable to save. Please retry.', lang));
  return d;
}

export default function TranslationSettings({lang}: {lang: UiLang}) {
  const t = (en: string, ar: string) => tx(lang, en, ar);
  const [stored, setStored] = useState<Stored | null>(null);
  const [form, setForm] = useState({provider: 'off' as Provider, apiKey: '', endpoint: '', model: 'claude-opus-5-5', dailyLimit: 300000});
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [sample, setSample] = useState('');
  const {toast, notify} = useToast();
  useEffect(() => { void (async () => {
    const r = await fetch(appUrl('/api/app'), {cache: 'no-store'}); const d = await r.json() as {translation?: Stored};
    if (d.translation) { setStored(d.translation); setForm(f => ({...f, provider: d.translation!.provider, endpoint: d.translation!.endpoint, model: d.translation!.model || f.model, dailyLimit: d.translation!.dailyLimit || f.dailyLimit})); }
  })(); }, []);
  const payload = () => ({provider: form.provider, apiKey: form.apiKey, endpoint: form.endpoint, model: form.model, dailyLimit: Number(form.dailyLimit)});
  async function test() { setBusy(true); setError(''); setSample(''); try { const d = await post({action: 'testTranslation', translation: payload()}, lang); setSample(d.sample || ''); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } }
  async function save(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError('');
    try { await post({action: 'translation', translation: payload()}, lang); setStored(s => ({...(s || {} as Stored), provider: form.provider, endpoint: form.endpoint, model: form.model, dailyLimit: form.dailyLimit, hasKey: form.provider === 'off' ? !!s?.hasKey : !!form.apiKey || !!s?.hasKey, keyHint: form.apiKey ? '…' + form.apiKey.slice(-4) : s?.keyHint || ''})); setForm(f => ({...f, apiKey: ''})); notify(form.provider === 'off' ? t('Automatic translation turned off', 'تم إيقاف الترجمة التلقائية') : t('Automatic translation is on for everyone', 'الترجمة التلقائية مفعّلة للجميع')); }
    catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }
  const current = providers.find(p => p[0] === form.provider)!;
  const needsKey = form.provider === 'deepl' || form.provider === 'google' || form.provider === 'claude';
  const keySaved = stored?.hasKey && stored.provider === form.provider;
  return <form className="settings-layout" onSubmit={save}>
    <div className="panel stack">
      <div className="account-head"><span className="account-avatar"><Languages size={22} /></span><div><strong>{t('Automatic translation', 'الترجمة التلقائية')}</strong><p className="muted">{t('Shows everything people write — the challenge, ideas and comments — in each viewer’s chosen language, so Arabic and English speakers take part equally.', 'تعرض كل ما يكتبه المشاركون — التحدي والأفكار والتعليقات — بلغة كل مشاهد، ليشارك متحدثو العربية والإنجليزية بالتساوي.')}</p></div></div>
      <fieldset className="provider-options"><legend>{t('Translation service', 'خدمة الترجمة')}</legend>{providers.map(([value, en, ar, den, dar]) => <label key={value} className={'provider-option' + (form.provider === value ? ' active' : '')}><input type="radio" name="provider" value={value} checked={form.provider === value} onChange={() => { setForm(f => ({...f, provider: value, apiKey: ''})); setSample(''); setError(''); }} /><span><strong>{t(en, ar)}</strong><small>{t(den, dar)}</small></span></label>)}</fieldset>
      {form.provider === 'libretranslate' && <label>{t('Server address', 'عنوان الخادم')}<input dir="ltr" type="url" placeholder="https://translate.example.org" value={form.endpoint} onChange={e => setForm(f => ({...f, endpoint: e.target.value}))} required /></label>}
      {(needsKey || form.provider === 'libretranslate') && <label>{t('API key', 'مفتاح API')}{form.provider === 'libretranslate' ? t(' (if your server requires one)', ' (إن كان خادمك يتطلبه)') : ''}<input dir="ltr" type="password" autoComplete="off" spellCheck={false} placeholder={keySaved ? t(`Saved (${stored!.keyHint}) — leave empty to keep it`, `محفوظ (${stored!.keyHint}) — اتركه فارغاً للإبقاء عليه`) : t('Paste your key', 'الصق المفتاح')} value={form.apiKey} onChange={e => setForm(f => ({...f, apiKey: e.target.value}))} /></label>}
      {form.provider === 'claude' && <label>{t('Model', 'النموذج')}<input dir="ltr" value={form.model} onChange={e => setForm(f => ({...f, model: e.target.value}))} /><small className="inline-help">{t('Default: claude-opus-5-5 (highest quality). claude-haiku-5-5 is faster and costs less.', 'الافتراضي: claude-opus-5-5 (أعلى جودة). النموذج claude-haiku-5-5 أسرع وأقل تكلفة.')}</small></label>}
      {form.provider !== 'off' && <label>{t('Daily limit per workshop (characters)', 'الحد اليومي لكل ورشة (بالأحرف)')}<input dir="ltr" type="number" min={1000} max={10000000} step={1000} value={form.dailyLimit} onChange={e => setForm(f => ({...f, dailyLimit: Number(e.target.value)}))} /><small className="inline-help">{t('Each text is translated once and then reused for everyone, so a typical workshop uses 10,000–50,000 characters.', 'تُترجم كل عبارة مرة واحدة ثم يُعاد استخدامها للجميع، لذا تستهلك الورشة عادةً 10,000–50,000 حرف.')}</small></label>}
      {error && <div className="error" role="alert">{error}</div>}
      {sample && <div className="success" role="status"><strong>{t('It works. Sample: ', 'تعمل الخدمة. مثال: ')}</strong><span dir="rtl" lang="ar">{sample}</span></div>}
      <div className="actions">{form.provider !== 'off' && <button type="button" className="btn secondary" disabled={busy || (needsKey && !form.apiKey && !keySaved)} onClick={() => void test()}><FlaskConical size={16} />{busy ? t('Testing…', 'جارٍ الاختبار…') : t('Test', 'اختبار')}</button>}<button className="btn primary" disabled={busy || (needsKey && !form.apiKey && !keySaved)}><Save size={16} />{t('Save', 'حفظ')}</button></div>
      <p className="inline-help">{t(`Selected: ${current[1]}.`, `المختار: ${current[2]}.`)}</p>
    </div>
    <aside className="settings-side"><div className="panel settings-actions"><h3><ShieldCheck size={16} /> {t('Privacy & cost', 'الخصوصية والتكلفة')}</h3><ul className="settings-notes"><li>{t('When translation is on, the challenge text and approved ideas and comments are sent to the chosen service. Pending ideas are not sent.', 'عند تفعيل الترجمة، يُرسل نص التحدي والأفكار والتعليقات المعتمدة إلى الخدمة المختارة، ولا تُرسل الأفكار قيد المراجعة.')}</li><li>{t('Keys are stored only on your server and are never shown to anyone.', 'تُحفظ المفاتيح على خادمك فقط ولا تُعرض لأحد.')}</li><li>{t('Originals are never changed. Everyone can switch to “Show original”.', 'لا تتغير النصوص الأصلية أبداً، ويمكن للجميع اختيار «عرض الأصل».')}</li><li>{t('Machine translation can make mistakes — remind students to check meaning with the author.', 'قد تخطئ الترجمة الآلية — ذكّر الطلاب بالتحقق من المعنى مع صاحب الفكرة.')}</li></ul></div></aside>
    {toast && <div className="toast" role="status">{toast}</div>}
  </form>;
}
