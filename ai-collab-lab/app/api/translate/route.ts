import { reply, failure, clean, workshopTexts } from '../../../lib/snapshot';
import { translateTexts, readTranslationConfig, type Target } from '../../../lib/translate-server';
export const dynamic = 'force-dynamic';

/**
 * Translate workshop content for the viewer's language.
 * Only text that is already visible in the workshop is accepted, so this cannot be used as a general
 * translation service. Translation is shown alongside the original and never changes stored content.
 */
export async function POST(req: Request) {
  try {
    const origin = req.headers.get('origin');
    if (origin && origin !== new URL(req.url).origin) return failure('Invalid request origin.', 403);
    if (Number(req.headers.get('content-length') || 0) > 200000) return failure('Request too large.', 413);
    let body: Record<string, unknown>;
    try { body = await req.json() as Record<string, unknown>; } catch { return failure('Invalid request.'); }
    const config = await readTranslationConfig();
    if (config.provider === 'off') return reply({ enabled: false, translations: {} });
    const target = body.target === 'ar' || body.target === 'en' ? body.target as Target : null;
    if (!target) return failure('Invalid request.');
    const code = clean(body.code, 20).toUpperCase();
    const allowed = await workshopTexts(code);
    if (!allowed) return failure('Workshop not found.', 404);
    const texts = (Array.isArray(body.texts) ? body.texts : []).filter((t): t is string => typeof t === 'string' && t.length <= 1600 && allowed.has(t)).slice(0, 80);
    return reply({ enabled: true, translations: texts.length ? await translateTexts(code, texts, target) : {} });
  } catch (e) { console.error('Translate request failed', e); return reply({ enabled: true, translations: {}, error: 'Translation is temporarily unavailable.' }); }
}
