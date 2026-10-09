import { build } from 'vite';
import react from '@vitejs/plugin-react';
import { cpSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const basePath = '/workshops';
const target = resolve('dist/vps');
await build({
  configFile: false, root: resolve('vps'), base: basePath + '/', publicDir: resolve('public'),
  plugins: [react()],
  build: { outDir: resolve(target, 'public'), emptyOutDir: true, target: 'es2022' }
});
await build({
  configFile: false, publicDir: false,
  resolve: { alias: [{ find: /^.*\/db\/server(?:\.ts)?$/, replacement: resolve('vps/database.ts') }] },
  // Bundle every dependency (e.g. the Anthropic SDK) so the server still needs no npm install.
  ssr: { noExternal: true },
  build: {
    ssr: resolve('vps/server.ts'), outDir: target, emptyOutDir: false, target: 'node22', minify: false,
    rollupOptions: { output: { entryFileNames: 'server.mjs', format: 'es' } }
  }
});
mkdirSync(target, { recursive: true });
cpSync(resolve('drizzle'), resolve(target, 'drizzle'), { recursive: true });
cpSync(resolve('deploy'), resolve(target, 'deploy'), { recursive: true });
writeFileSync(resolve(target, 'runtime-config.json'), JSON.stringify({ basePath }) + '\n');
writeFileSync(resolve(target, 'package.json'), JSON.stringify({ name: 'ai-collab-lab-vps', private: true, type: 'module', engines: { node: '>=22.16.0' } }, null, 2) + '\n');
console.log('Standalone VPS release ready in dist/vps. No npm install is needed on the server.');
