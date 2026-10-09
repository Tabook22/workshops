"use client";
import {useEffect, useMemo, useState} from 'react';
import {Lightbulb, Sparkles, Target, MessageSquareQuote, Clock, GraduationCap, Check, X, RotateCcw, Users, Bot, Handshake, Activity} from 'lucide-react';
import type {Idea, Language} from './workshop';
import {skills, skillArabic, skillIcons} from './workshop';
import {coach, assessContribution, facilitation, roleQuiz, skillPractice, themes, promptChecks, typeMeta, type Pair, type Role} from './learning';
import {lessonSteps} from './lesson';

const pick = (lang: Language, pair: Pair | readonly [string, string, ...unknown[]]) => (lang === 'ar' ? pair[1] : pair[0]) as string;

/** Five-step journey indicator shown to students so they always know where the class is. */
export function Journey({step, lang}: {step: number; lang: Language}) {
  return <ol className="journey-track" aria-label={lang === 'ar' ? 'مراحل الورشة' : 'Workshop journey'}>
    {lessonSteps.map((s, i) => <li key={s[0]} className={i < step ? 'done' : i === step ? 'current' : ''} aria-current={i === step ? 'step' : undefined}>
      <span className="journey-dot">{i < step ? <Check size={12} /> : i + 1}</span>
      <span className="journey-label">{pick(lang, s)}</span>
    </li>)}
  </ol>;
}

/** Stage-specific scaffolding: a goal, sentence starters, a worked example and a deeper-thinking prompt. */
export function Coach({stage, lang, onStarter}: {stage: number; lang: Language; onStarter: (text: string) => void}) {
  const [example, setExample] = useState(false);
  const c = coach[stage];
  if (!c) return null;
  return <aside className="coach" aria-label={lang === 'ar' ? 'مدرب الأفكار' : 'Idea coach'}>
    <div className="coach-head"><span className="coach-badge"><GraduationCap size={16} /></span><div><strong>{lang === 'ar' ? 'هدفك' : 'Your goal'}</strong><p>{pick(lang, c.goal)}</p></div></div>
    <div className="coach-starters"><small>{lang === 'ar' ? 'ابدأ بجملة:' : 'Try a sentence starter:'}</small>
      <div>{c.starters.map(s => <button type="button" key={s[0]} className="starter-chip" onClick={() => onStarter(pick(lang, s).split('…')[0].trimEnd() + ' ')}>{pick(lang, s)}</button>)}</div>
    </div>
    <button type="button" className="coach-toggle" aria-expanded={example} onClick={() => setExample(!example)}><Lightbulb size={15} />{example ? (lang === 'ar' ? 'إخفاء المثال' : 'Hide example') : (lang === 'ar' ? 'شاهد مثالاً جيداً' : 'See a strong example')}</button>
    {example && <blockquote className="coach-example">{pick(lang, c.example)}</blockquote>}
    <p className="coach-think"><Sparkles size={14} /> {pick(lang, c.think)}</p>
  </aside>;
}

const strength: Pair[] = [['Just getting started', 'بداية'], ['Getting there', 'في الطريق'], ['Good start', 'بداية جيدة'], ['Strong', 'قوية'], ['Excellent — ready to share', 'ممتازة — جاهزة للمشاركة']];
/** Live, rule-based feedback while typing. Encourages clearer contributions without blocking anyone. */
export function QualityMeter({text, lang}: {text: string; lang: Language}) {
  const checks = useMemo(() => assessContribution(text), [text]);
  if (!text.trim()) return null;
  const score = checks.filter(c => c.ok).length;
  return <div className={'quality-meter q' + score} aria-live="polite">
    <div className="quality-bar" aria-hidden="true">{checks.map((c, i) => <span key={c.key} className={i < score ? 'on' : ''} />)}</div>
    <strong>{pick(lang, strength[score])}</strong>
    <ul>{checks.map(c => <li key={c.key} className={c.ok ? 'ok' : ''}>{c.ok ? <Check size={13} /> : <span className="todo-dot" />}{pick(lang, c.label)}</li>)}</ul>
  </div>;
}

/** Brief celebratory burst after a contribution. Hidden for reduced-motion users via CSS. */
export function Celebrate({run}: {run: number}) {
  const [finished, setFinished] = useState(0);
  useEffect(() => { if (!run) return; const t = setTimeout(() => setFinished(run), 1800); return () => clearTimeout(t); }, [run]);
  if (!run || finished === run) return null;
  const active = run;
  return <div className="confetti" aria-hidden="true">{Array.from({length: 28}, (_, i) => <i key={active + '-' + i} style={{'--x': `${(i * 37) % 100}%`, '--d': `${(i % 7) * 70}ms`, '--r': `${(i * 53) % 360}deg`, '--c': `var(--c${i % 5})`} as React.CSSProperties} />)}</div>;
}

const roleIcon = {human: Users, ai: Bot, both: Handshake};
const roleLabel: Record<Role, Pair> = {human: ['Human', 'الإنسان'], ai: ['AI', 'الذكاء الاصطناعي'], both: ['Together', 'معاً']};
/** AI-literacy activity: sort tasks into Human / AI / Together, with an explanation for each answer. */
export function HumanAiQuiz({lang}: {lang: Language}) {
  const [index, setIndex] = useState(0), [answer, setAnswer] = useState<Role | null>(null), [score, setScore] = useState(0);
  const done = index >= roleQuiz.length, item = roleQuiz[index];
  function choose(role: Role) { if (answer) return; setAnswer(role); if (role === item.answer) setScore(s => s + 1); }
  function next() { setAnswer(null); setIndex(i => i + 1); }
  return <section className="quiz" aria-label={lang === 'ar' ? 'من يقوم بالمهمة؟' : 'Who should do it?'}>
    <div className="quiz-head"><span className="eyebrow">{lang === 'ar' ? 'نشاط · الوعي بالذكاء الاصطناعي' : 'ACTIVITY · AI LITERACY'}</span><span className="pill">{Math.min(index + 1, roleQuiz.length)}/{roleQuiz.length}</span></div>
    {done ? <div className="quiz-done"><h3>{lang === 'ar' ? `أحسنت! ${score} من ${roleQuiz.length}` : `Nice work! ${score} of ${roleQuiz.length}`}</h3><p>{lang === 'ar' ? 'القاعدة: الإنسان يحدد الهدف ويتحمل المسؤولية، والذكاء الاصطناعي يسرّع العمل، والإنسان يتحقق.' : 'The pattern: humans set direction and stay accountable, AI speeds up the work, humans verify.'}</p><button className="btn secondary small" onClick={() => { setIndex(0); setScore(0); setAnswer(null); }}><RotateCcw size={15} />{lang === 'ar' ? 'أعد المحاولة' : 'Play again'}</button></div> : <>
      <h3 className="quiz-task">{pick(lang, item.task)}</h3>
      <p className="muted">{lang === 'ar' ? 'من يجب أن يقوم بهذه المهمة؟' : 'Who should own this task?'}</p>
      <div className="quiz-options">{(['human', 'ai', 'both'] as Role[]).map(role => { const Icon = roleIcon[role]; const state = !answer ? '' : role === item.answer ? ' correct' : role === answer ? ' wrong' : ' dim'; return <button key={role} className={'quiz-option' + state} disabled={!!answer} onClick={() => choose(role)}><Icon size={22} />{pick(lang, roleLabel[role])}</button>; })}</div>
      {answer && <div className={'quiz-feedback ' + (answer === item.answer ? 'good' : 'bad')} role="status">{answer === item.answer ? <Check size={18} /> : <X size={18} />}<p><strong>{answer === item.answer ? (lang === 'ar' ? 'صحيح.' : 'Correct.') : (lang === 'ar' ? `الأفضل: ${pick(lang, roleLabel[item.answer])}.` : `Best answer: ${pick(lang, roleLabel[item.answer])}.`)}</strong> {pick(lang, item.why)}</p><button className="btn primary small" onClick={next}>{lang === 'ar' ? 'التالي' : 'Next'}</button></div>}
    </>}
  </section>;
}

/** Word cloud of recurring words. Counting is local and transparent — no AI "analysis" is claimed. */
export function ThemeCloud({ideas, lang, compact = false}: {ideas: Idea[]; lang: Language; compact?: boolean}) {
  const list = useMemo(() => themes(ideas.filter(i => i.type !== 'comment'), compact ? 12 : 20), [ideas, compact]);
  if (list.length < 3) return null;
  const max = Math.max(...list.map(t => t.count)), min = Math.min(...list.map(t => t.count));
  return <section className={'theme-cloud' + (compact ? ' compact' : '')}>
    <div className="theme-cloud-head"><span className="eyebrow">{lang === 'ar' ? 'ما الذي تقوله القاعة' : 'WHAT THE ROOM IS SAYING'}</span><small className="muted">{lang === 'ar' ? 'الكلمات الأكثر تكراراً في المشاركات' : 'Most repeated words across contributions'}</small></div>
    <div className="theme-words" dir="auto">{list.map((t, i) => { const w = max === min ? .5 : (t.count - min) / (max - min); return <span key={t.word} style={{'--w': w, '--c': `var(--c${i % 5})`} as React.CSSProperties} title={`${t.count}×`}>{t.word}</span>; })}</div>
  </section>;
}

function ago(ms: number, lang: Language) {
  const min = Math.floor((Date.now() - ms) / 60000);
  if (min < 1) return lang === 'ar' ? 'الآن' : 'just now';
  if (min < 60) return lang === 'ar' ? `قبل ${min} د` : `${min} min ago`;
  return new Date(ms).toLocaleTimeString(lang === 'ar' ? 'ar-OM' : 'en-GB', {hour: '2-digit', minute: '2-digit'});
}
/** Latest contributions — makes participation visible and keeps the room's energy up. */
export function ActivityFeed({ideas, lang, limit = 5}: {ideas: Idea[]; lang: Language; limit?: number}) {
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick(n => n + 1), 30000); return () => clearInterval(t); }, []);
  const latest = [...ideas].filter(i => i.status === 'approved').sort((a, b) => b.created - a.created).slice(0, limit);
  if (!latest.length) return null;
  return <section className="activity-feed" aria-label={lang === 'ar' ? 'أحدث المشاركات' : 'Latest contributions'}>
    <span className="eyebrow"><Activity size={14} />{lang === 'ar' ? 'مباشر الآن' : 'LIVE ACTIVITY'}</span>
    <ul>{latest.map(i => <li key={i.id}><span className={'feed-dot t-' + (typeMeta[i.type]?.tone || 'idea')} /><div><strong>{i.nickname}</strong> {i.type === 'comment' ? (lang === 'ar' ? 'علّق' : 'commented') : (lang === 'ar' ? 'شارك' : 'shared')} <em>{i.type === 'comment' ? i.text.slice(0, 60) : i.title}</em></div><small>{ago(i.created, lang)}</small></li>)}</ul>
  </section>;
}

/** Shows which ingredients of a good AI prompt are present — prompt writing as a learnable skill. */
export function PromptChecklist({prompt, lang}: {prompt: string; lang: Language}) {
  const checks = useMemo(() => promptChecks(prompt), [prompt]);
  const score = checks.filter(c => c.ok).length;
  return <div className="prompt-check">
    <div className="prompt-check-head"><strong>{lang === 'ar' ? 'جودة التعليمات' : 'Prompt quality'}</strong><span className={'pill ' + (score === checks.length ? 'lime' : '')}>{score}/{checks.length}</span></div>
    <p className="inline-help">{lang === 'ar' ? 'التعليمات الجيدة لأداة الذكاء الاصطناعي تحتوي على هذه العناصر. احذف أحدها وستلاحظ الفرق في النتيجة.' : 'Strong prompts for AI tools contain these ingredients. Remove one and the result usually gets worse.'}</p>
    <ul>{checks.map(c => <li key={c.key} className={c.ok ? 'ok' : ''}>{c.ok ? <Check size={14} /> : <X size={14} />}{pick(lang, c.label)}</li>)}</ul>
  </div>;
}

/** Presenter-only teaching notes for the current guided step. */
export function FacilitatorNotes({step, lang}: {step: number; lang: Language}) {
  const f = facilitation[step];
  if (!f) return null;
  return <aside className="facilitator" aria-label={lang === 'ar' ? 'ملاحظات الميسّر' : 'Facilitator notes'}>
    <div className="facilitator-row"><Target size={17} /><div><small>{lang === 'ar' ? 'هدف التعلم' : 'Learning goal'}</small><p>{pick(lang, f.goal)}</p></div></div>
    <div className="facilitator-row"><MessageSquareQuote size={17} /><div><small>{lang === 'ar' ? 'اسأل القاعة' : 'Ask the room'}</small><p className="facilitator-ask">{pick(lang, f.ask)}</p></div></div>
    <div className="facilitator-row"><Lightbulb size={17} /><div><small>{lang === 'ar' ? 'نصيحة' : 'Facilitation tip'}</small><p>{pick(lang, f.tip)}</p></div></div>
    <div className="facilitator-foot"><span className="pill"><Clock size={13} /> {pick(lang, f.time)}</span>{f.skills.map(i => <span className="pill skill-pill" key={i}>{skillIcons[i]} {lang === 'ar' ? skillArabic[i] : skills[i]}</span>)}</div>
  </aside>;
}

export function ReflectionInsight({skill, lang}: {skill: string; lang: Language}) {
  const text = skillPractice[skill];
  if (!text) return null;
  const i = skills.indexOf(skill);
  return <div className="reflection-insight" role="status"><span className="reflection-icon">{skillIcons[i]}</span><div><strong>{lang === 'ar' ? `كيف مارست ${skillArabic[i]} اليوم` : `How you practised ${skill} today`}</strong><p>{pick(lang, text)}</p></div></div>;
}
