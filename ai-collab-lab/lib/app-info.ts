/**
 * Application identity: logo text, name, version and About page content.
 * Stored server-side (app_settings table, key "app") and editable by the presenter admin.
 * Shared by the API (validation) and the browser (display).
 */
export type AppInfo = {
  logoText: string;      // main logo text, e.g. "AI COLLAB"
  logoAccent: string;    // highlighted part, e.g. "LAB"
  name: string;          // application name in English
  nameAr: string;        // application name in Arabic
  tagline: string;
  taglineAr: string;
  version: string;
  created: string;       // YYYY-MM-DD
  updatedOn: string;     // YYYY-MM-DD, date of the current version
  description: string;   // About text (English)
  descriptionAr: string; // About text (Arabic)
  organization: string;
  organizationAr: string;
  developer: string;     // credits / author
  contact: string;       // email address
  website: string;       // https URL
};

export const defaultAppInfo: AppInfo = {
  logoText: 'AI COLLAB',
  logoAccent: 'LAB',
  name: 'AI Collab Lab',
  nameAr: 'مختبر التعاون بالذكاء الاصطناعي',
  tagline: 'From Idea to AI Product',
  taglineAr: 'من الفكرة إلى منتج بالذكاء الاصطناعي',
  version: '2.0.0',
  created: '2026-10-06',
  updatedOn: '2026-10-09',
  description: 'AI Collab Lab is a live, bilingual workshop platform where students think, share, improve, vote and build together. A presenter guides the room through five steps — from defining a real problem to a product brief and an AI build prompt — while students take part from their phones, with no accounts or installs. Along the way they practise the workplace skills that make AI useful: problem solving, creativity, collaboration, critical thinking, decision making and AI literacy.',
  descriptionAr: 'مختبر التعاون بالذكاء الاصطناعي منصة ورش عمل مباشرة ثنائية اللغة، يفكّر فيها الطلاب ويشاركون ويحسّنون ويصوّتون ويبنون معاً. يقود مقدم الورشة القاعة عبر خمس خطوات — من تحديد مشكلة حقيقية إلى ملخص منتج وتعليمات بناء بالذكاء الاصطناعي — بينما يشارك الطلاب من هواتفهم دون حسابات أو تثبيت. ويمارسون خلال ذلك مهارات العمل التي تجعل الذكاء الاصطناعي مفيداً: حل المشكلات والإبداع والتعاون والتفكير النقدي واتخاذ القرار والوعي بالذكاء الاصطناعي.',
  organization: 'AI at Work · UTAS · Sultanate of Oman',
  organizationAr: 'الذكاء الاصطناعي في العمل · جامعة التقنية والعلوم التطبيقية · سلطنة عُمان',
  developer: '',
  contact: '',
  website: '',
};

const limits: Record<keyof AppInfo, number> = {
  logoText: 24, logoAccent: 12, name: 80, nameAr: 80, tagline: 120, taglineAr: 120, version: 24, created: 10, updatedOn: 10,
  description: 2000, descriptionAr: 2000, organization: 160, organizationAr: 160, developer: 160, contact: 120, website: 200,
};

/** Accepts only known fields, trims and length-limits them, and rejects malformed values. */
export function sanitizeAppInfo(input: unknown, base: AppInfo = defaultAppInfo): {info: AppInfo; error?: string} {
  const source = input && typeof input === 'object' ? input as Record<string, unknown> : {};
  const info = {...base};
  for (const key of Object.keys(limits) as (keyof AppInfo)[]) {
    if (typeof source[key] === 'string') info[key] = (source[key] as string).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, limits[key]);
  }
  if (!info.logoText && !info.logoAccent) return {info, error: 'The logo needs some text.'};
  if (!info.name) return {info, error: 'The application name is required.'};
  if (!/^[0-9A-Za-z][0-9A-Za-z.+_-]{0,23}$/.test(info.version)) return {info, error: 'Use a version such as 2.0.0 or 2.1-beta.'};
  for (const key of ['created', 'updatedOn'] as const) if (info[key] && !/^\d{4}-\d{2}-\d{2}$/.test(info[key])) return {info, error: 'Dates must look like 2026-10-09.'};
  if (info.contact && !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(info.contact)) return {info, error: 'Enter a valid contact email or leave it empty.'};
  if (info.website && !/^https?:\/\/[^\s<>"]+$/i.test(info.website)) return {info, error: 'The website must start with https:// or http://.'};
  return {info};
}
