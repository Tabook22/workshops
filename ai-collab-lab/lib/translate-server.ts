/**
 * Server-side machine translation of workshop content (challenge, ideas, comments) between
 * Arabic and English, so Arabic and English speakers can take part equally.
 *
 * - Provider and key are configured by the admin (app_settings key "translation"); keys never leave the server.
 * - Every translation is cached in the `translations` table and shared by all viewers.
 * - Identical concurrent requests share one provider call; a per-workshop daily character budget caps cost.
 */
import Anthropic from '@anthropic-ai/sdk';
import { database, hash } from '../db/server';

export type Provider = 'off' | 'deepl' | 'google' | 'libretranslate' | 'claude';
export type Target = 'en' | 'ar';
export type TranslationConfig = { provider: Provider; apiKey: string; endpoint: string; model: string; dailyLimit: number };
export const defaultTranslationConfig: TranslationConfig = { provider: 'off', apiKey: '', endpoint: '', model: 'claude-opus-5-5', dailyLimit: 300000 };

export async function readTranslationConfig(): Promise<TranslationConfig> {
  const row = await database().prepare('SELECT value FROM app_settings WHERE key=?').bind('translation').first<{ value: string }>();
  if (!row) return defaultTranslationConfig;
  try { return { ...defaultTranslationConfig, ...JSON.parse(row.value) as Partial<TranslationConfig> }; } catch { return defaultTranslationConfig; }
}

/** Validates admin input. An empty apiKey keeps the stored key unless clearKey is set. */
export function mergeTranslationConfig(current: TranslationConfig, input: Record<string, unknown>): { config: TranslationConfig; error?: string } {
  const provider = String(input.provider || 'off') as Provider;
  if (!['off', 'deepl', 'google', 'libretranslate', 'claude'].includes(provider)) return { config: current, error: 'Choose a translation service.' };
  const apiKey = input.clearKey ? '' : typeof input.apiKey === 'string' && input.apiKey.trim() ? input.apiKey.trim().slice(0, 300) : provider === current.provider ? current.apiKey : '';
  const endpoint = typeof input.endpoint === 'string' ? input.endpoint.trim().replace(/\/+$/, '').slice(0, 200) : current.endpoint;
  const model = typeof input.model === 'string' && /^[a-z0-9.-]{3,60}$/.test(input.model.trim()) ? input.model.trim() : current.model || defaultTranslationConfig.model;
  const dailyLimit = Number.isInteger(input.dailyLimit) && Number(input.dailyLimit) >= 1000 && Number(input.dailyLimit) <= 10000000 ? Number(input.dailyLimit) : current.dailyLimit;
  const config = { provider, apiKey, endpoint, model, dailyLimit };
  if (provider === 'libretranslate' && !/^https?:\/\/[^\s]+$/i.test(endpoint)) return { config, error: 'Enter the LibreTranslate server address (https://…).' };
  if ((provider === 'deepl' || provider === 'google' || provider === 'claude') && !apiKey) return { config, error: 'Enter the API key for this service.' };
  return { config };
}

/** Mostly Arabic letters → 'ar'; mostly Latin letters → 'en'; otherwise 'other' (numbers, emoji, codes). */
export function detectLang(text: string): Target | 'other' {
  const ar = (text.match(/[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/g) || []).length;
  const en = (text.match(/[A-Za-z]/g) || []).length;
  if (ar + en < 2) return 'other';
  return ar >= en ? 'ar' : 'en';
}

const SYSTEM = 'You translate short contributions from a live university innovation workshop. Translate each input string into the requested language, faithfully and naturally, keeping the meaning, tone, names, numbers, emoji and line breaks. Keep technical terms commonly used in that language. If a string is already in the target language, return it unchanged. Return exactly one translation per input, in the same order. Respond directly without preamble.';

async function callProvider(cfg: TranslationConfig, texts: string[], target: Target): Promise<string[]> {
  if (cfg.provider === 'deepl') {
    const host = cfg.apiKey.endsWith(':fx') ? 'https://api-free.deepl.com' : 'https://api.deepl.com';
    const r = await fetch(host + '/v2/translate', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'DeepL-Auth-Key ' + cfg.apiKey }, body: JSON.stringify({ text: texts, target_lang: target === 'ar' ? 'AR' : 'EN-GB' }) });
    if (!r.ok) throw new Error('DeepL ' + r.status);
    return ((await r.json()) as { translations: { text: string }[] }).translations.map(t => t.text);
  }
  if (cfg.provider === 'google') {
    const r = await fetch('https://translation.googleapis.com/language/translate/v2?key=' + encodeURIComponent(cfg.apiKey), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ q: texts, target, format: 'text' }) });
    if (!r.ok) throw new Error('Google ' + r.status);
    return ((await r.json()) as { data: { translations: { translatedText: string }[] } }).data.translations.map(t => t.translatedText);
  }
  if (cfg.provider === 'libretranslate') {
    const r = await fetch(cfg.endpoint + '/translate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ q: texts, source: 'auto', target, format: 'text', ...(cfg.apiKey ? { api_key: cfg.apiKey } : {}) }) });
    if (!r.ok) throw new Error('LibreTranslate ' + r.status);
    const out = ((await r.json()) as { translatedText: string | string[] }).translatedText;
    return Array.isArray(out) ? out : [out];
  }
  if (cfg.provider === 'claude') {
    const client = new Anthropic({ apiKey: cfg.apiKey, maxRetries: 2, timeout: 60_000 });
    const response = await client.beta.messages.create({
      model: cfg.model || 'claude-opus-5-5',
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: SYSTEM,
      output_config: {
        effort: 'low',
        format: { type: 'json_schema', schema: { type: 'object', properties: { translations: { type: 'array', items: { type: 'string' } } }, required: ['translations'], additionalProperties: false } },
      },
      messages: [{ role: 'user', content: JSON.stringify({ target_language: target === 'ar' ? 'Arabic' : 'English', texts }) }],
    });
    if (response.stop_reason === 'refusal') throw new Error('Claude declined to translate');
    const block = response.content.find((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text');
    const parsed = JSON.parse(block?.text || '{}') as { translations?: unknown };
    if (!Array.isArray(parsed.translations)) throw new Error('Claude returned no translations');
    return parsed.translations.map(t => String(t));
  }
  throw new Error('Translation is turned off');
}

/** Admin check of a service and key before saving: translates one sample sentence. */
export async function testProvider(cfg: TranslationConfig) {
  const [ar] = await callProvider(cfg, ['Welcome to the team! Share your best idea.'], 'ar');
  return ar;
}

const inflight = new Map<string, Promise<string | null>>();
const budget = new Map<string, { day: string; used: number }>();
function spend(code: string, chars: number, limit: number) {
  const day = new Date().toISOString().slice(0, 10);
  const b = budget.get(code);
  const state = b && b.day === day ? b : { day, used: 0 };
  if (state.used + chars > limit) return false;
  state.used += chars; budget.set(code, state); return true;
}

/** Translates texts (already validated as workshop content) into target; returns only those it could translate. */
export async function translateTexts(code: string, texts: string[], target: Target): Promise<Record<string, string>> {
  const cfg = await readTranslationConfig();
  if (cfg.provider === 'off') return {};
  const db = database();
  const wanted = [...new Set(texts)].filter(t => detectLang(t) !== target && detectLang(t) !== 'other');
  const keys = await Promise.all(wanted.map(t => hash(target + '\n' + t)));
  const result: Record<string, string> = {};
  const misses: { text: string; key: string }[] = [];
  for (let i = 0; i < wanted.length; i += 50) {
    const slice = keys.slice(i, i + 50);
    const [rows] = await db.batch([db.prepare(`SELECT key, text FROM translations WHERE key IN (${slice.map(() => '?').join(',')})`).bind(...slice)]);
    const found = new Map(((rows.results || []) as { key: string; text: string }[]).map(r => [r.key, r.text]));
    slice.forEach((k, j) => { const text = wanted[i + j]; const hit = found.get(k); if (hit !== undefined) result[text] = hit; else misses.push({ text, key: k }); });
  }
  // Group misses into provider batches (≤25 texts, ≤8000 characters); join any batch already in flight.
  const pending: Promise<void>[] = [];
  let batch: { text: string; key: string; resolve: (v: string | null) => void }[] = [], size = 0;
  const flush = () => {
    if (!batch.length) return;
    const items = batch; batch = []; size = 0;
    pending.push((async () => {
      try {
        const out = await callProvider(cfg, items.map(i => i.text), target);
        if (out.length !== items.length) throw new Error('Translation count mismatch');
        await db.batch(items.map((item, n) => db.prepare('INSERT OR REPLACE INTO translations(key,target,text,provider,created) VALUES(?,?,?,?,?)').bind(item.key, target, out[n].slice(0, 4000), cfg.provider, Date.now())));
        items.forEach((item, n) => item.resolve(out[n]));
      } catch (e) { console.error('Translation failed', (e as Error).message); items.forEach(item => item.resolve(null)); }
    })());
  };
  const waits: Promise<void>[] = [];
  for (const miss of misses) {
    const existing = inflight.get(miss.key);
    if (existing) { waits.push(existing.then(v => { if (v !== null) result[miss.text] = v; })); continue; }
    if (!spend(code, miss.text.length, cfg.dailyLimit)) continue;
    let resolve!: (v: string | null) => void;
    const promise = new Promise<string | null>(r => { resolve = r; });
    inflight.set(miss.key, promise);
    promise.then(v => { inflight.delete(miss.key); if (v !== null) result[miss.text] = v; });
    if (batch.length >= 25 || size + miss.text.length > 8000) flush();
    batch.push({ ...miss, resolve }); size += miss.text.length;
    waits.push(promise.then(() => undefined));
  }
  flush();
  await Promise.all([...pending, ...waits]);
  return result;
}
