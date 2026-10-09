"use client";
import {useSyncExternalStore} from 'react';
import {appUrl} from './urls';
import {defaultAppInfo, sanitizeAppInfo, type AppInfo} from './app-info';
import {defaultLanding, sanitizeLanding, type LandingContent} from './landing-content';

/* Branding is fetched once per page load, cached for instant paint next time,
   and pushed to every subscriber when the admin saves new settings. */
const CACHE = 'ai-collab-app-info';
const listeners = new Set<() => void>();
let info: AppInfo = defaultAppInfo;
let landing: LandingContent = defaultLanding;
const LANDING_CACHE = 'ai-collab-landing';
let loaded = false, requested = false;

function fromCache() {
  if (loaded) return;
  loaded = true;
  try { const c = localStorage.getItem(CACHE); if (c) info = sanitizeAppInfo(JSON.parse(c)).info; } catch { /* use defaults */ }
  try { const l = localStorage.getItem(LANDING_CACHE); if (l) landing = sanitizeLanding(JSON.parse(l)); } catch { /* use defaults */ }
}
function applyTitle() {
  if (typeof document !== 'undefined') document.title = `${info.name} · ${info.tagline}`;
}
export function setAppInfo(next: AppInfo) {
  info = next;
  try { localStorage.setItem(CACHE, JSON.stringify(next)); } catch { /* private mode */ }
  applyTitle();
  listeners.forEach(l => l());
}
async function fetchInfo() {
  if (requested) return;
  requested = true;
  try {
    const r = await fetch(appUrl('/api/app'), {cache: 'no-store'});
    if (r.ok) { const d = await r.json() as {info?: unknown; landing?: unknown}; if (d.landing) setLanding(sanitizeLanding(d.landing)); setAppInfo(sanitizeAppInfo(d.info).info); }
  } catch { /* offline: keep cached branding */ }
}
function subscribe(listener: () => void) { listeners.add(listener); void fetchInfo(); return () => { listeners.delete(listener); }; }
export function setLanding(next: LandingContent) {
  landing = next;
  try { localStorage.setItem(LANDING_CACHE, JSON.stringify(next)); } catch { /* private mode */ }
  listeners.forEach(l => l());
}
/** Home-page wording chosen by the admin (defaults until the server answers). */
export function useLanding(): LandingContent {
  return useSyncExternalStore(subscribe, () => { fromCache(); return landing; }, () => defaultLanding);
}
export function useAppInfo(): AppInfo {
  return useSyncExternalStore(subscribe, () => { fromCache(); return info; }, () => defaultAppInfo);
}
