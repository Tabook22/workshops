import { database, presenterAuthenticated } from '../../../db/server';
import { reply, failure } from '../../../lib/snapshot';
import { defaultAppInfo, sanitizeAppInfo, type AppInfo } from '../../../lib/app-info';
export const dynamic = 'force-dynamic';

async function readInfo(): Promise<AppInfo> {
  const row = await database().prepare('SELECT value FROM app_settings WHERE key=?').bind('app').first<{ value: string }>();
  if (!row) return defaultAppInfo;
  try { return sanitizeAppInfo(JSON.parse(row.value)).info; } catch { return defaultAppInfo; }
}

/** Public: the logo, name, version and About content shown to every visitor. */
export async function GET() {
  try { return reply({ info: await readInfo() }); }
  catch (e) { console.error('App settings read failed', e); return reply({ info: defaultAppInfo }); }
}

/** Presenter admin only: update the application identity. */
export async function POST(req: Request) {
  try {
    const origin = req.headers.get('origin');
    if (origin && origin !== new URL(req.url).origin) return failure('Invalid request origin.', 403);
    if (Number(req.headers.get('content-length') || 0) > 20000) return failure('Request too large.', 413);
    if (!presenterAuthenticated(req)) return failure('Presenter login required.', 401);
    let body: Record<string, unknown>;
    try { body = await req.json() as Record<string, unknown>; } catch { return failure('Invalid request.'); }
    if (body.action === 'reset') {
      await database().prepare('DELETE FROM app_settings WHERE key=?').bind('app').run();
      return reply({ ok: true, info: defaultAppInfo });
    }
    if (body.action !== 'update') return failure('Unknown action.');
    const { info, error } = sanitizeAppInfo(body.info, await readInfo());
    if (error) return failure(error);
    await database().prepare('INSERT INTO app_settings(key,value,updated) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated=excluded.updated').bind('app', JSON.stringify(info), Date.now()).run();
    return reply({ ok: true, info });
  } catch (e) { console.error('App settings update failed', e); return failure('Unable to save right now. Keep your text and retry.', 503); }
}
