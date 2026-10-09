import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Readable } from 'node:stream';
import { GET as workshopGet, POST as workshopPost } from '../app/api/workshop/route';
import { GET as eventsGet } from '../app/api/events/route';
import { closeDatabase } from './database';
import { database } from './database';
import { authEnabled, presenterAuthenticated, accountLogin } from './auth';

const base = (process.env.BASE_PATH || '/workshops').replace(/\/$/, '');
if (!/^\/[a-zA-Z0-9_-]+$/.test(base)) throw new Error('BASE_PATH must be a single URL path, such as /workshops.');
const port = Number(process.env.PORT || 3800);
const host = process.env.HOST || '127.0.0.1';
const publicOrigin = (process.env.PUBLIC_ORIGIN || `http://127.0.0.1:${port}`).replace(/\/$/, '');
const root = fileURLToPath(new URL('./public/', import.meta.url));
const buildConfig = JSON.parse(readFileSync(fileURLToPath(new URL('./runtime-config.json', import.meta.url)), 'utf8'));
if (buildConfig.basePath !== base) throw new Error('BASE_PATH differs from the built asset prefix. Rebuild with the intended path.');
const types: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.json': 'application/json' };

function headers(response: ServerResponse) {
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Referrer-Policy', 'same-origin');
  response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
}
function sendFile(response: ServerResponse, filename: string, head: boolean) {
  const extension = filename.slice(filename.lastIndexOf('.'));
  response.setHeader('Content-Type', types[extension] || 'application/octet-stream');
  response.setHeader('Cache-Control', filename.includes(sep + 'assets' + sep) ? 'public, max-age=31536000, immutable' : 'no-cache');
  response.setHeader('Content-Length', statSync(filename).size);
  response.writeHead(200);
  if (head) response.end(); else createReadStream(filename).pipe(response);
}
async function relay(request: IncomingMessage, response: ServerResponse, url: URL) {
  const controller = new AbortController();
  response.on('close', () => controller.abort());
  const requestHeaders = new Headers();
  for (const [name, value] of Object.entries(request.headers)) {
    if (Array.isArray(value)) value.forEach(item => requestHeaders.append(name, item));
    else if (value !== undefined) requestHeaders.set(name, value);
  }
  let body: Buffer | undefined;
  if (request.method === 'POST') {
    const chunks: Buffer[] = []; let size = 0;
    for await (const chunk of request) {
      const buffer = Buffer.from(chunk); size += buffer.length;
      if (size > 128000) { response.writeHead(413); response.end('Request too large'); return; }
      chunks.push(buffer);
    }
    body = Buffer.concat(chunks);
  }
  const fetched = new Request(publicOrigin + url.pathname + url.search, { method: request.method, headers: requestHeaders, body: body ? new Uint8Array(body).buffer : undefined, signal: controller.signal });
  let result: Response;
  const origin=fetched.headers.get('origin');
  let parsed: Record<string, unknown> = {};
  let malformed = false;
  if (request.method === 'POST') { try { const value = JSON.parse(body?.toString() || '{}'); if (value && typeof value === 'object') parsed = value; else malformed = true; } catch { malformed = true; } }
  if(request.method==='POST' && origin && origin!==new URL(publicOrigin).origin) result=Response.json({error:'Invalid request origin.'},{status:403});
  else if(malformed) result=Response.json({error:'Invalid request.'},{status:400});
  else if(url.pathname===base+'/api/account') {
    if(request.method==='GET') {
      const authenticated=presenterAuthenticated(fetched);
      const sessions=authenticated ? (await database().batch([database().prepare("SELECT s.code,s.config,s.created,(SELECT COUNT(*) FROM participants p WHERE p.code=s.code) AS participants,(SELECT COUNT(*) FROM ideas i WHERE i.code=s.code AND i.status!='deleted' AND i.type!='comment') AS ideas FROM sessions s ORDER BY s.created DESC LIMIT 500")]))[0].results.map((row)=>{const r=row as {code:string;config:string;created:number;participants:number;ideas:number};const c=JSON.parse(r.config);return {code:r.code,name:c.name,challenge:c.challenge,question:c.question,description:c.description,language:c.language,stage:c.stage,ended:c.ended,created:r.created,participants:r.participants,ideas:r.ideas};}) : [];
      result=Response.json({enabled:authEnabled,authenticated,sessions},{headers:{'Cache-Control':'no-store'}});
    } else {
      result=parsed.action==='logout'?Response.json({ok:true},{headers:{'Set-Cookie':`presenter_session=; Path=${base}; HttpOnly; Secure; SameSite=Lax; Max-Age=0`}}):accountLogin(fetched,parsed.username,parsed.password,base);
    }
  } else if(authEnabled&&request.method==='POST'&&['create','unlock'].includes(String(parsed.action))) {
    if(!presenterAuthenticated(fetched))result=Response.json({error:'Presenter login required.'},{status:401});
    else if(parsed.action==='unlock')result=Response.json({ok:true});
    else result=await workshopPost(fetched);
  } else result = url.pathname === base + '/api/events' ? await eventsGet(fetched) : request.method === 'POST' ? await workshopPost(fetched) : await workshopGet(fetched);
  for (const [name, value] of result.headers) if (name !== 'set-cookie') response.setHeader(name, value);
  const cookies = result.headers.getSetCookie(); if (cookies.length) response.setHeader('Set-Cookie', cookies);
  response.writeHead(result.status); response.flushHeaders();
  if (!result.body) { response.end(); return; }
  const stream = Readable.fromWeb(result.body as import('node:stream/web').ReadableStream);
  stream.on('error', () => { if (!response.destroyed) response.destroy(); });
  response.on('close', () => stream.destroy()); stream.pipe(response);
}
const server = createServer(async (request, response) => {
  headers(response);
  try {
    const url = new URL(request.url || '/', publicOrigin);
    const path = url.pathname;
    if (path === base) { response.writeHead(308, { Location: base + '/' + url.search }); response.end(); return; }
    if (path === base + '/healthz' && request.method === 'GET') { response.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); response.end('{"status":"ok"}'); return; }
    if ((path === base + '/api/workshop'||path===base+'/api/account') && (request.method === 'GET' || request.method === 'POST') || path === base + '/api/events' && request.method === 'GET') { await relay(request, response, url); return; }
    if (request.method !== 'GET' && request.method !== 'HEAD') { response.writeHead(405); response.end('Method not allowed'); return; }
    const local = path.slice(base.length);
    if (path.startsWith(base + '/') && ['/', '/join', '/join/', '/presenter', '/presenter/', '/project', '/project/'].includes(local)) { sendFile(response, resolve(root, 'index.html'), request.method === 'HEAD'); return; }
    if (path.startsWith(base + '/assets/') || path === base + '/favicon.svg') {
      const filename = resolve(root, '.' + decodeURIComponent(local));
      if (filename.startsWith(root.replace(/[\\/]$/, '') + sep) && existsSync(filename) && statSync(filename).isFile()) { sendFile(response, filename, request.method === 'HEAD'); return; }
    }
    response.writeHead(404); response.end('Not found');
  } catch (error) {
    console.error('Workshop request failed', error);
    if (!response.headersSent) { response.writeHead(500, { 'Content-Type': 'application/json' }); response.end('{"error":"Workshop service unavailable. Please retry."}'); }
    else response.destroy();
  }
});
server.requestTimeout = 30000;
server.keepAliveTimeout = 65000;
server.listen(port, host, () => console.log(`AI Collab Lab listening at ${host}:${port}${base}/`));
function shutdown() { server.close(() => { closeDatabase(); process.exit(0); }); setTimeout(() => process.exit(1), 10000).unref(); }
process.once('SIGTERM', shutdown); process.once('SIGINT', shutdown);
