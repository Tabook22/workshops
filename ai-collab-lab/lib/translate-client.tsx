"use client";
/**
 * Shows workshop content (challenge, question, ideas, comments) in the viewer's language.
 * The server translates and caches; this hook swaps translations in for display only and keeps
 * the author's original text on `idea.orig` / `snapshot.original` for editing and exports.
 */
import {useEffect, useMemo, useState, useSyncExternalStore} from 'react';
import {Languages} from 'lucide-react';
import {appUrl} from './urls';
import type {Language, Snapshot} from './workshop';

type Target = 'en' | 'ar';
const cache = new Map<string, string>();          // target + \u0000 + text -> translation
const requested = new Set<string>();             // keys already asked for (success or not)
let disabled = false;                            // server reported translation is off
const listeners = new Set<() => void>();
let version = 0;
const bump = () => { version++; listeners.forEach(l => l()); };

const SHOW_ORIGINAL = 'ai-collab-show-original';
function readShowOriginal() { try { return localStorage.getItem(SHOW_ORIGINAL) === '1'; } catch { return false; } }
let showOriginal = typeof window !== 'undefined' && readShowOriginal();
export function setShowOriginal(v: boolean) { showOriginal = v; try { localStorage.setItem(SHOW_ORIGINAL, v ? '1' : '0'); } catch { /* private */ } bump(); }
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
const useVersion = () => useSyncExternalStore(subscribe, () => version, () => 0);
export const useShowOriginal = () => { useVersion(); return showOriginal; };

/** Same rule as the server: which language a text is mostly written in. */
export function detectLang(text: string): Target | 'other' {
  const ar = (text.match(/[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/g) || []).length;
  const en = (text.match(/[A-Za-z]/g) || []).length;
  if (ar + en < 2) return 'other';
  return ar >= en ? 'ar' : 'en';
}
const needs = (text: string, target: Target) => !!text && detectLang(text) !== 'other' && detectLang(text) !== target;
const key = (target: Target, text: string) => target + '\u0000' + text;

async function fetchBatch(code: string, target: Target, texts: string[]) {
  texts.forEach(t => requested.add(key(target, t)));
  try {
    const r = await fetch(appUrl('/api/translate'), {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({code, target, texts})});
    const d = await r.json() as {enabled?: boolean; translations?: Record<string, string>; error?: string};
    if (d.enabled === false) { disabled = true; bump(); return; }
    // Texts that failed temporarily may be retried on a later update.
    if (d.error) texts.forEach(t => requested.delete(key(target, t)));
    for (const [source, translated] of Object.entries(d.translations || {})) cache.set(key(target, source), translated);
    bump();
  } catch { texts.forEach(t => requested.delete(key(target, t))); }
}

/** Returns the snapshot with content shown in `lang` (English or Arabic). Bilingual mode shows originals. */
export function useTranslatedSnapshot(data: Snapshot | null, lang: Language): Snapshot | null {
  const v = useVersion();
  const target: Target | null = lang === 'ar' || lang === 'en' ? lang : null;
  const [tick, setTick] = useState(0);
  const texts = useMemo(() => {
    if (!data || !target) return [];
    const c = data.config, out = [c.name, c.challenge, c.question, c.description];
    for (const i of data.ideas) if (i.status === 'approved') out.push(i.title, i.text);
    return [...new Set(out.filter(t => needs(t, target)))];
  }, [data, target]);
  // Ask the server for anything not yet translated (debounced, in small batches).
  useEffect(() => {
    if (!data || !target || disabled) return;
    const missing = texts.filter(t => !cache.has(key(target, t)) && !requested.has(key(target, t)));
    if (!missing.length) return;
    const timer = setTimeout(() => { for (let i = 0; i < missing.length; i += 60) void fetchBatch(data.code, target, missing.slice(i, i + 60)); }, 250);
    return () => clearTimeout(timer);
  }, [texts, target, data?.code, tick, v]);
  // Retry failed texts occasionally (e.g. the service was briefly unavailable).
  useEffect(() => { const t = setInterval(() => setTick(n => n + 1), 30000); return () => clearInterval(t); }, []);
  return useMemo(() => {
    if (!data || !target || disabled || showOriginal) return data;
    const tr = (t: string) => (needs(t, target) && cache.get(key(target, t))) || t;
    const c = data.config;
    const config = {...c, name: tr(c.name), challenge: tr(c.challenge), question: tr(c.question), description: tr(c.description)};
    const changedConfig = config.name !== c.name || config.challenge !== c.challenge || config.question !== c.question || config.description !== c.description;
    const ideas = data.ideas.map(i => { if (i.status !== 'approved') return i; const title = tr(i.title), text = tr(i.text); return title === i.title && text === i.text ? i : {...i, title, text, orig: {title: i.title, text: i.text}}; });
    return {...data, config, ideas, ...(changedConfig ? {original: {name: c.name, challenge: c.challenge, question: c.question, description: c.description}} : {})};
  }, [data, target, v]);
}

/** Small notice with a switch between translated and original content. Hidden when nothing is translated. */
export function TranslationNotice({data, lang}: {data: Snapshot | null; lang: Language}) {
  const original = useShowOriginal();
  const translated = !!data && (!!data.original || data.ideas.some(i => i.orig));
  if (!data || (!translated && !original) || disabled) return null;
  const ar = lang === 'ar';
  return <div className="translation-notice" role="status"><Languages size={15} /><span>{original ? (ar ? 'تُعرض المشاركات بلغتها الأصلية.' : 'Showing contributions in their original language.') : (ar ? 'تُرجمت المشاركات المكتوبة بالإنجليزية تلقائياً إلى العربية.' : 'Contributions written in Arabic are automatically translated to English.')}</span><button type="button" className="link-button" onClick={() => setShowOriginal(!original)}>{original ? (ar ? 'عرض الترجمة' : 'Show translation') : (ar ? 'عرض الأصل' : 'Show original')}</button></div>;
}

/** Inline marker for one translated item, with the original available on hover/focus. */
export function TranslatedMark({orig, lang}: {orig?: {title: string; text: string}; lang: Language}) {
  if (!orig) return null;
  return <span className="translated-mark" title={(lang === 'ar' ? 'النص الأصلي: ' : 'Original: ') + orig.title + '\n' + orig.text} tabIndex={0}><Languages size={12} />{lang === 'ar' ? 'مترجم' : 'Translated'}</span>;
}
