import {useEffect, useMemo, useRef, useState} from 'react';
import {Plus, Users, Lightbulb, ArrowUpRight, Search, LayoutGrid, List, GripVertical, Pencil, Trash2, Download, Power, RotateCcw, CheckSquare, Square, X, ArrowUpDown} from 'lucide-react';
import {Modal, action, download, useToast} from '../lib/client';
import {stages, stageArabic, type Language} from '../lib/workshop';
import {tx, type UiLang} from '../lib/i18n';
import {appUrl} from '../lib/urls';

export type Session = {code: string; name: string; challenge?: string; question?: string; description?: string; language?: Language; stage?: number; ended: boolean; created?: number; participants?: number; ideas?: number};
type View = 'cards' | 'list';
type Sort = 'custom' | 'newest' | 'oldest' | 'name' | 'participants' | 'ideas' | 'status';
type Filter = 'all' | 'active' | 'ended';

/* Dashboard preferences are per browser: they never change what students see. */
const PREFS = 'ai-collab-dashboard-v1';
type Prefs = {view: View; sort: Sort; filter: Filter; order: string[]};
function readPrefs(): Prefs {
  const fallback: Prefs = {view: 'cards', sort: 'newest', filter: 'all', order: []};
  try {
    const p = JSON.parse(localStorage.getItem(PREFS) || 'null');
    if (!p || typeof p !== 'object') return fallback;
    return {
      view: p.view === 'list' ? 'list' : 'cards',
      sort: ['custom', 'newest', 'oldest', 'name', 'participants', 'ideas', 'status'].includes(p.sort) ? p.sort : 'newest',
      filter: ['all', 'active', 'ended'].includes(p.filter) ? p.filter : 'all',
      order: Array.isArray(p.order) ? p.order.filter((c: unknown) => typeof c === 'string').slice(0, 1000) : [],
    };
  } catch { return fallback; }
}

const sorters: Record<Exclude<Sort, 'custom'>, (a: Session, b: Session) => number> = {
  newest: (a, b) => (b.created || 0) - (a.created || 0),
  oldest: (a, b) => (a.created || 0) - (b.created || 0),
  name: (a, b) => (a.challenge || a.name).localeCompare(b.challenge || b.name, undefined, {sensitivity: 'base'}),
  participants: (a, b) => (b.participants || 0) - (a.participants || 0),
  ideas: (a, b) => (b.ideas || 0) - (a.ideas || 0),
  status: (a, b) => Number(a.ended) - Number(b.ended) || (b.created || 0) - (a.created || 0),
};

export default function WorkshopDashboard({sessions, lang, onCreate, reload}: {sessions: Session[]; lang: UiLang; onCreate: () => void; reload: () => Promise<void>}) {
  const t = (en: string, ar: string) => tx(lang, en, ar);
  const [prefs, setPrefs] = useState<Prefs>(readPrefs);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [editing, setEditing] = useState<Session | null>(null);
  const [deleting, setDeleting] = useState<Session[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState<string | null>(null);
  const {toast, notify} = useToast();
  useEffect(() => { try { localStorage.setItem(PREFS, JSON.stringify(prefs)); } catch { /* private mode */ } }, [prefs]);
  const update = (patch: Partial<Prefs>) => setPrefs(p => ({...p, ...patch}));

  // Full ordering (all workshops), then filtering for display.
  const ordered = useMemo(() => {
    if (prefs.sort !== 'custom') return [...sessions].sort(sorters[prefs.sort]);
    const rank = new Map(prefs.order.map((c, i) => [c, i]));
    // Workshops created after the custom order was saved appear first, newest first.
    return [...sessions].sort((a, b) => (rank.get(a.code) ?? -1e9 + -(a.created || 0) / 1e6) - (rank.get(b.code) ?? -1e9 + -(b.created || 0) / 1e6));
  }, [sessions, prefs.sort, prefs.order]);
  const visible = ordered.filter(s => (prefs.filter === 'all' || (prefs.filter === 'ended') === s.ended)
    && (!query || [s.name, s.challenge, s.code].join(' ').toLowerCase().includes(query.toLowerCase())));
  const counts = {all: sessions.length, active: sessions.filter(s => !s.ended).length, ended: sessions.filter(s => s.ended).length};
  const allVisibleSelected = visible.length > 0 && visible.every(s => selected.includes(s.code));
  useEffect(() => { setSelected(sel => sel.filter(c => sessions.some(s => s.code === c))); }, [sessions]);

  /* ---------- Drag to reorder (pointer events: mouse, pen and touch) ---------- */
  const orderRef = useRef<string[]>([]);
  function beginReorder() {
    // Dragging always works: it switches to Custom order, starting from what is on screen now.
    const base = ordered.map(s => s.code);
    orderRef.current = base;
    if (prefs.sort !== 'custom') update({sort: 'custom', order: base});
  }
  function moveTo(code: string, target: string, after: boolean) {
    const list = orderRef.current.filter(c => c !== code);
    const index = list.indexOf(target);
    if (index < 0) return;
    list.splice(after ? index + 1 : index, 0, code);
    if (list.join() !== orderRef.current.join()) { orderRef.current = list; update({sort: 'custom', order: list}); }
  }
  function onHandleDown(e: React.PointerEvent<HTMLButtonElement>, code: string) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    beginReorder();
    setDragging(code);
  }
  function onHandleMove(e: React.PointerEvent<HTMLButtonElement>) {
    if (!dragging) return;
    const over = (document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null)?.closest<HTMLElement>('[data-workshop]');
    const target = over?.dataset.workshop;
    if (!over || !target || target === dragging) return;
    const r = over.getBoundingClientRect();
    const after = prefs.view === 'list' ? e.clientY > r.top + r.height / 2 : (e.clientY > r.bottom - r.height / 3 || (e.clientY > r.top + r.height / 3 && (lang === 'ar' ? e.clientX < r.left + r.width / 2 : e.clientX > r.left + r.width / 2)));
    moveTo(dragging, target, after);
  }
  function onHandleUp(e: React.PointerEvent<HTMLButtonElement>) {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    if (dragging) notify(t('Order saved on this device', 'تم حفظ الترتيب على هذا الجهاز'));
    setDragging(null);
  }
  function onHandleKey(e: React.KeyboardEvent, code: string) {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown' && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    beginReorder();
    const back = e.key === 'ArrowUp' || (e.key === 'ArrowLeft') !== (lang === 'ar');
    const i = visible.findIndex(s => s.code === code), neighbour = visible[back ? i - 1 : i + 1];
    if (neighbour) { moveTo(code, neighbour.code, !back); requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-workshop="${code}"] .drag-handle`)?.focus()); }
  }

  /* ---------- Actions ---------- */
  async function run(task: () => Promise<unknown>, success: string) {
    setBusy(true); setError('');
    try { await task(); await reload(); notify(success); return true; }
    catch (e) { setError((e as Error).message); return false; }
    finally { setBusy(false); }
  }
  const setEnded = (s: Session, ended: boolean) => run(() => action({action: 'control', code: s.code, patch: ended ? {ended: true} : {ended: false, paused: false, submissionsOpen: true}}), ended ? t('Workshop ended', 'تم إنهاء الورشة') : t('Workshop reopened', 'أُعيد فتح الورشة'));
  async function backup(list: Session[]) {
    setBusy(true); setError('');
    try {
      const records = await Promise.all(list.map(async s => { const r = await fetch(appUrl('/api/workshop?code=') + encodeURIComponent(s.code), {cache: 'no-store'}); const d = await r.json() as {ideas?: Record<string, unknown>[]} & Record<string, unknown>; return {...d, ideas: (d.ideas || []).map(({participant: _p, ...rest}: Record<string, unknown>) => rest)}; }));
      const stamp = new Date().toISOString().slice(0, 10);
      download(list.length === 1 ? `workshop-${list[0].code}.json` : `workshops-backup-${stamp}.json`, JSON.stringify(list.length === 1 ? records[0] : records, null, 2), 'application/json');
    } catch { setError(t('The backup could not be downloaded. Please retry.', 'تعذّر تنزيل النسخة الاحتياطية. يرجى المحاولة مجدداً.')); }
    finally { setBusy(false); }
  }
  const toggle = (code: string) => setSelected(sel => sel.includes(code) ? sel.filter(c => c !== code) : [...sel, code]);
  const stageLabel = (s: Session) => typeof s.stage === 'number' ? (lang === 'ar' ? stageArabic[s.stage] : stages[s.stage]) : '';
  const date = (s: Session) => s.created ? new Date(s.created).toLocaleDateString(lang === 'ar' ? 'ar-OM-u-nu-latn' : 'en-GB', {day: 'numeric', month: 'short', year: 'numeric'}) : '';

  const sortOptions: [Sort, string, string][] = [['custom', 'My order (drag)', 'ترتيبي (بالسحب)'], ['newest', 'Newest first', 'الأحدث أولاً'], ['oldest', 'Oldest first', 'الأقدم أولاً'], ['name', 'Name A–Z', 'الاسم أبجدياً'], ['participants', 'Most participants', 'الأكثر مشاركين'], ['ideas', 'Most ideas', 'الأكثر أفكاراً'], ['status', 'Active first', 'النشطة أولاً']];

  const handle = (s: Session) => <button type="button" className="drag-handle" aria-label={t(`Reorder ${s.challenge || s.name}. Drag, or use the arrow keys.`, `إعادة ترتيب ${s.challenge || s.name}. اسحب أو استخدم مفاتيح الأسهم.`)} title={t('Drag to reorder', 'اسحب لإعادة الترتيب')} onPointerDown={e => onHandleDown(e, s.code)} onPointerMove={onHandleMove} onPointerUp={onHandleUp} onPointerCancel={onHandleUp} onKeyDown={e => onHandleKey(e, s.code)}><GripVertical size={18} /></button>;
  const check = (s: Session) => <button type="button" role="checkbox" aria-checked={selected.includes(s.code)} className={'select-box' + (selected.includes(s.code) ? ' on' : '')} aria-label={t('Select ', 'تحديد ') + (s.challenge || s.name)} onClick={() => toggle(s.code)}>{selected.includes(s.code) ? <CheckSquare size={18} /> : <Square size={18} />}</button>;
  const actions = (s: Session) => <div className="session-actions">
    <button type="button" className="icon-action" title={t('Edit details', 'تعديل التفاصيل')} aria-label={t('Edit ', 'تعديل ') + (s.challenge || s.name)} onClick={() => setEditing(s)} disabled={busy}><Pencil size={16} /></button>
    <button type="button" className="icon-action" title={s.ended ? t('Reopen workshop', 'إعادة فتح الورشة') : t('End workshop', 'إنهاء الورشة')} aria-label={(s.ended ? t('Reopen ', 'إعادة فتح ') : t('End ', 'إنهاء ')) + (s.challenge || s.name)} onClick={() => void setEnded(s, !s.ended)} disabled={busy}>{s.ended ? <RotateCcw size={16} /> : <Power size={16} />}</button>
    <button type="button" className="icon-action" title={t('Download backup (JSON)', 'تنزيل نسخة احتياطية (JSON)')} aria-label={t('Download backup of ', 'تنزيل نسخة احتياطية من ') + (s.challenge || s.name)} onClick={() => void backup([s])} disabled={busy}><Download size={16} /></button>
    <button type="button" className="icon-action danger-action" title={t('Delete workshop', 'حذف الورشة')} aria-label={t('Delete ', 'حذف ') + (s.challenge || s.name)} onClick={() => setDeleting([s])} disabled={busy}><Trash2 size={16} /></button>
  </div>;
  const status = (s: Session) => <span className={'status ' + (s.ended ? 'off' : '')}>{s.ended ? t('ENDED', 'انتهت') : t('ACTIVE', 'نشطة')}</span>;
  const href = (s: Session) => appUrl('/presenter?code=') + s.code;

  return <section className={'workshop-dashboard' + (dragging ? ' is-dragging' : '')}>
    <section className="dashboard-head"><div><span className="eyebrow">{t('PRESENTER CONTROL CENTER', 'مركز تحكم مقدم الورشة')}</span><h1>{t('Your workshops', 'ورشك')}</h1><p className="muted">{t(`${counts.all} workshops · ${counts.active} active`, `${counts.all} ورشة · ${counts.active} نشطة`)}</p></div><button className="btn primary btn-lg" onClick={onCreate}><Plus size={18} />{t('Create workshop', 'إنشاء ورشة')}</button></section>

    <div className="dashboard-toolbar">
      <label className="wall-search dashboard-search"><Search size={18} /><input aria-label={t('Search workshops', 'ابحث في الورش')} placeholder={t('Search by name, challenge or code…', 'ابحث بالاسم أو التحدي أو الرمز…')} value={query} onChange={e => setQuery(e.target.value)} /></label>
      <div className="seg" role="group" aria-label={t('Show', 'عرض')}>{(['all', 'active', 'ended'] as Filter[]).map(f => <button key={f} aria-pressed={prefs.filter === f} className={prefs.filter === f ? 'active' : ''} onClick={() => update({filter: f})}>{f === 'all' ? t('All', 'الكل') : f === 'active' ? t('Active', 'النشطة') : t('Ended', 'المنتهية')}<span className="seg-count">{counts[f]}</span></button>)}</div>
      <label className="sort-select"><ArrowUpDown size={16} /><span className="sr-only">{t('Sort by', 'الترتيب حسب')}</span><select aria-label={t('Sort by', 'الترتيب حسب')} value={prefs.sort} onChange={e => update({sort: e.target.value as Sort})}>{sortOptions.map(([v, en, ar]) => <option key={v} value={v}>{t(en, ar)}</option>)}</select></label>
      <div className="seg" role="group" aria-label={t('Layout', 'طريقة العرض')}><button aria-pressed={prefs.view === 'cards'} className={prefs.view === 'cards' ? 'active' : ''} onClick={() => update({view: 'cards'})} title={t('Cards', 'بطاقات')}><LayoutGrid size={16} /><span className="seg-label">{t('Cards', 'بطاقات')}</span></button><button aria-pressed={prefs.view === 'list'} className={prefs.view === 'list' ? 'active' : ''} onClick={() => update({view: 'list'})} title={t('List', 'قائمة')}><List size={16} /><span className="seg-label">{t('List', 'قائمة')}</span></button></div>
    </div>

    <div className="dashboard-subbar">
      <button className="btn small ghost" onClick={() => setSelected(allVisibleSelected ? selected.filter(c => !visible.some(s => s.code === c)) : [...new Set([...selected, ...visible.map(s => s.code)])])} disabled={!visible.length}>{allVisibleSelected ? <CheckSquare size={16} /> : <Square size={16} />}{allVisibleSelected ? t('Clear selection', 'إلغاء التحديد') : t('Select all shown', 'تحديد المعروض')}</button>
      <span className="muted drag-hint"><GripVertical size={14} />{t('Drag the handle to arrange your workshops. Your order is saved on this device.', 'اسحب المقبض لترتيب ورشك. يُحفظ الترتيب على هذا الجهاز.')}</span>
    </div>

    {error && <div className="error" role="alert">{error}</div>}

    {!sessions.length ? <div className="empty"><span className="empty-icon"><Plus size={26} /></span><h3>{t('No workshops yet', 'لا توجد ورش بعد')}</h3>{t('Create your first session — it takes under a minute.', 'أنشئ جلستك الأولى — يستغرق الأمر أقل من دقيقة.')}<div className="actions" style={{justifyContent: 'center', marginTop: 16}}><button className="btn primary" onClick={onCreate}><Plus size={16} />{t('Create workshop', 'إنشاء ورشة')}</button></div></div>
    : !visible.length ? <div className="empty"><span className="empty-icon"><Search size={26} /></span><h3>{t('No matching workshops', 'لا توجد ورش مطابقة')}</h3>{t('Try another search or show all workshops.', 'جرّب بحثاً آخر أو اعرض كل الورش.')}</div>
    : prefs.view === 'cards' ? <div className="session-grid">{visible.map(s => <article key={s.code} data-workshop={s.code} className={'session-card' + (selected.includes(s.code) ? ' selected' : '') + (dragging === s.code ? ' dragging' : '')}>
        <div className="session-card-top">{handle(s)}{check(s)}{status(s)}<span className="pill" dir="ltr">{s.code}</span></div>
        <h3 dir="auto"><a className="session-link" href={href(s)}>{s.challenge || s.name}</a></h3>
        <p className="muted" dir="auto">{s.name}{!s.ended && stageLabel(s) ? ` · ${stageLabel(s)}` : ''}</p>
        <div className="session-card-foot"><span title={t('Participants', 'المشاركون')}><Users size={14} />{s.participants ?? 0}</span><span title={t('Ideas', 'الأفكار')}><Lightbulb size={14} />{s.ideas ?? 0}</span><span>{date(s)}</span>{actions(s)}</div>
      </article>)}</div>
    : <div className="session-list" role="table" aria-label={t('Workshops', 'الورش')}>
        <div className="session-row session-row-head" role="row"><span role="columnheader" /><span role="columnheader" /><span role="columnheader">{t('Workshop', 'الورشة')}</span><span role="columnheader">{t('Status', 'الحالة')}</span><span role="columnheader">{t('Code', 'الرمز')}</span><span role="columnheader" className="num">{t('People', 'المشاركون')}</span><span role="columnheader" className="num">{t('Ideas', 'الأفكار')}</span><span role="columnheader">{t('Created', 'التاريخ')}</span><span role="columnheader" /></div>
        {visible.map(s => <div key={s.code} role="row" data-workshop={s.code} className={'session-row' + (selected.includes(s.code) ? ' selected' : '') + (dragging === s.code ? ' dragging' : '')}>
          <span role="cell">{handle(s)}</span><span role="cell">{check(s)}</span>
          <span role="cell" className="session-row-title"><a className="session-link" href={href(s)} dir="auto">{s.challenge || s.name}</a><small className="muted" dir="auto">{s.name}{!s.ended && stageLabel(s) ? ` · ${stageLabel(s)}` : ''}</small></span>
          <span role="cell">{status(s)}</span><span role="cell"><span className="pill" dir="ltr">{s.code}</span></span>
          <span role="cell" className="num"><Users size={14} />{s.participants ?? 0}</span><span role="cell" className="num"><Lightbulb size={14} />{s.ideas ?? 0}</span>
          <span role="cell" className="muted">{date(s)}</span><span role="cell">{actions(s)}</span>
        </div>)}
      </div>}

    {selected.length > 0 && <div className="bulk-bar" role="region" aria-label={t('Selected workshops', 'الورش المحددة')}><strong>{t(`${selected.length} selected`, `${selected.length} محددة`)}</strong><button className="btn small secondary" disabled={busy} onClick={() => void backup(sessions.filter(s => selected.includes(s.code)))}><Download size={15} />{t('Download backup', 'تنزيل نسخة احتياطية')}</button><button className="btn small secondary" disabled={busy} onClick={() => void run(() => Promise.all(sessions.filter(s => selected.includes(s.code) && !s.ended).map(s => action({action: 'control', code: s.code, patch: {ended: true}}))), t('Selected workshops ended', 'تم إنهاء الورش المحددة'))}><Power size={15} />{t('End', 'إنهاء')}</button><button className="btn small danger" disabled={busy} onClick={() => setDeleting(sessions.filter(s => selected.includes(s.code)))}><Trash2 size={15} />{t('Delete', 'حذف')}</button><button className="btn small ghost icon-btn" aria-label={t('Clear selection', 'إلغاء التحديد')} onClick={() => setSelected([])}><X size={16} /></button></div>}

    {editing && <EditWorkshop session={editing} lang={lang} busy={busy} onClose={() => setEditing(null)} onSave={patch => run(() => action({action: 'control', code: editing.code, patch}), t('Workshop details saved', 'تم حفظ تفاصيل الورشة')).then(ok => { if (ok) setEditing(null); })} />}
    {deleting && <DeleteWorkshops list={deleting} lang={lang} busy={busy} onClose={() => setDeleting(null)} onBackup={() => void backup(deleting)} onConfirm={async () => { const list = deleting; const ok = await run(async () => { for (const s of list) await action({action: 'deleteWorkshop', code: s.code, confirm: s.code}); }, list.length === 1 ? t('Workshop deleted', 'تم حذف الورشة') : t(`${list.length} workshops deleted`, `تم حذف ${list.length} ورش`)); if (ok) { setDeleting(null); setSelected(sel => sel.filter(c => !list.some(s => s.code === c))); } }} />}
    {toast && <div className="toast" role="status">{toast}</div>}
  </section>;
}

function EditWorkshop({session, lang, busy, onClose, onSave}: {session: Session; lang: UiLang; busy: boolean; onClose: () => void; onSave: (patch: Record<string, unknown>) => void}) {
  const t = (en: string, ar: string) => tx(lang, en, ar);
  const [form, setForm] = useState({name: session.name || '', challenge: session.challenge || '', question: session.question || '', description: session.description || '', language: session.language || 'en'});
  const dir = form.language === 'ar' ? 'rtl' : 'auto';
  return <Modal title={t('Edit workshop details', 'تعديل تفاصيل الورشة')} onClose={onClose}>
    <form className="stack" onSubmit={e => { e.preventDefault(); onSave(form); }}>
      <p className="inline-help">{t('Changes appear immediately for the presenter, projector and students. Contributions and votes are not affected.', 'تظهر التغييرات فوراً لمقدم الورشة وشاشة العرض والطلاب، دون التأثير على المشاركات أو الأصوات.')} <span dir="ltr">{session.code}</span></p>
      <label>{t('Challenge name', 'اسم التحدي')}<input dir={dir} required maxLength={100} value={form.challenge} onChange={e => setForm({...form, challenge: e.target.value})} /></label>
      <label>{t('Workshop name', 'اسم الورشة')}<input dir={dir} required maxLength={100} value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></label>
      <label>{t('Challenge question', 'سؤال التحدي')}<textarea dir={dir} required maxLength={1000} value={form.question} onChange={e => setForm({...form, question: e.target.value})} /></label>
      <label>{t('Description', 'الوصف')}<input dir={dir} maxLength={1000} value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></label>
      <label>{t('Workshop language', 'لغة الورشة')}<select value={form.language} onChange={e => setForm({...form, language: e.target.value as Language})}><option value="en">English</option><option value="ar">العربية</option><option value="both">{t('Bilingual (English + Arabic)', 'ثنائي اللغة (العربية + الإنجليزية)')}</option></select></label>
      <div className="actions"><button className="btn primary" disabled={busy}>{busy ? t('Saving…', 'جارٍ الحفظ…') : t('Save changes', 'حفظ التغييرات')}</button><button type="button" className="btn secondary" onClick={onClose}>{t('Cancel', 'إلغاء')}</button><a className="btn ghost" href={appUrl('/presenter?code=') + session.code}><ArrowUpRight size={16} />{t('Open workshop', 'فتح الورشة')}</a></div>
    </form>
  </Modal>;
}

function DeleteWorkshops({list, lang, busy, onClose, onBackup, onConfirm}: {list: Session[]; lang: UiLang; busy: boolean; onClose: () => void; onBackup: () => void; onConfirm: () => void}) {
  const t = (en: string, ar: string) => tx(lang, en, ar);
  const single = list.length === 1;
  // Typing the code (or the word DELETE for several) prevents accidental permanent deletion.
  const expected = single ? list[0].code : (lang === 'ar' ? 'حذف' : 'DELETE');
  const [typed, setTyped] = useState('');
  const totals = list.reduce((n, s) => ({people: n.people + (s.participants || 0), ideas: n.ideas + (s.ideas || 0)}), {people: 0, ideas: 0});
  const active = list.filter(s => !s.ended).length;
  return <Modal title={single ? t('Delete this workshop?', 'حذف هذه الورشة؟') : t(`Delete ${list.length} workshops?`, `حذف ${list.length} ورش؟`)} onClose={onClose}>
    <div className="stack">
      <div className="delete-summary">
        <ul>{list.slice(0, 6).map(s => <li key={s.code}><strong dir="auto">{s.challenge || s.name}</strong> <span className="pill" dir="ltr">{s.code}</span></li>)}{list.length > 6 && <li className="muted">{t(`and ${list.length - 6} more`, `و${list.length - 6} أخرى`)}</li>}</ul>
        <p>{t(`This permanently removes ${totals.ideas} contributions and ${totals.people} participants, including comments, votes, reflections and the product brief. It cannot be undone.`, `سيؤدي هذا إلى الحذف النهائي لـ ${totals.ideas} مشاركة و${totals.people} مشاركاً، بما في ذلك التعليقات والأصوات والتأملات وملخص المنتج. لا يمكن التراجع عن ذلك.`)}</p>
        {active > 0 && <p className="warn">{t(`${active === 1 && single ? 'This workshop is still active' : `${active} of these workshops are still active`} — anyone joined will lose access.`, `${active === 1 && single ? 'هذه الورشة ما زالت نشطة' : `${active} من هذه الورش ما زالت نشطة`} — سيفقد المنضمون إليها الوصول.`)}</p>}
      </div>
      <button type="button" className="btn secondary" disabled={busy} onClick={onBackup}><Download size={16} />{t('Download a backup first (recommended)', 'نزّل نسخة احتياطية أولاً (موصى به)')}</button>
      <label>{single ? t('Type the workshop code to confirm', 'اكتب رمز الورشة للتأكيد') : t('Type DELETE to confirm', 'اكتب «حذف» للتأكيد')} <code dir="ltr">{expected}</code><input dir={single ? 'ltr' : 'auto'} autoComplete="off" spellCheck={false} value={typed} onChange={e => setTyped(e.target.value)} placeholder={expected} /></label>
      <div className="actions"><button className="btn danger" disabled={busy || typed.trim().toUpperCase() !== expected.toUpperCase()} onClick={onConfirm}><Trash2 size={16} />{busy ? t('Deleting…', 'جارٍ الحذف…') : single ? t('Delete permanently', 'حذف نهائي') : t(`Delete ${list.length} permanently`, `حذف ${list.length} نهائياً`)}</button><button className="btn secondary" onClick={onClose}>{single ? t('Keep it', 'الاحتفاظ بها') : t('Keep them', 'الاحتفاظ بها')}</button></div>
    </div>
  </Modal>;
}
