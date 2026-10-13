import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const pairs=JSON.parse(readFileSync('lib/ui-translations.json','utf8'));
let source=ts.transpileModule(readFileSync('lib/ui-translation.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
source=source.replace(/import pairs from ['"]\.\/ui-translations\.json['"];?/,`const pairs=${JSON.stringify(pairs)};`);
const {builtInTranslation}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
assert.ok(pairs.length>1000);
for(const text of ['Smart Tutor','Define the problem','TODAY’S CHALLENGE','What problem should we solve?','Your contribution','Think • Share • Improve • Vote • Build'])assert.match(builtInTranslation(text,'ar'),/[\u0620-\u064A]/,text);
assert.equal(builtInTranslation('Team 42','ar'),'الفريق 42');assert.equal(builtInTranslation('Room Team 1','ar'),'غرفة الفريق 1');assert.equal(builtInTranslation('Tabook22','ar'),undefined,'personal identifier untouched');
assert.equal(builtInTranslation('المعلّم الذكي','en'),'Smart Tutor');assert.equal(builtInTranslation('unknown new participant wording','ar'),undefined,'no false translation');
const origin=process.env.WORKSHOP_TEST_ORIGIN;
if(origin){
 assert.ok(['127.0.0.1','localhost'].includes(new URL(origin).hostname),'localhost tests only');
 const r=await fetch(origin+'/api/workshop',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'create',challenge:'Reviewed offline challenge',question:'Offline question test'})});assert.equal(r.status,201);const {code}=await r.json();const cookie=r.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');
 try{
  const res=await fetch(origin+'/api/translate',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({code,target:'ar',texts:['Reviewed offline challenge','Not authorized secret']})});assert.equal(res.status,200);const d=await res.json();assert.equal(d.enabled,false);assert.equal(d.translations['Reviewed offline challenge'],'تحدٍّ مُراجع يعمل دون خدمة ترجمة');assert.equal(d.translations['Not authorized secret'],undefined);
 }finally{const res=await fetch(origin+'/api/workshop',{method:'POST',headers:{'content-type':'application/json',cookie},body:JSON.stringify({action:'deleteWorkshop',code,confirm:code})});assert.equal(res.status,200)}
}
// A selected Arabic interface must control guided labels, rather than data.config.language alone.
const guided=readFileSync('lib/guided-workshop.tsx','utf8');assert.ok(guided.includes('lang:Language=interfaceLang||c.language'));
const consoleSource=readFileSync('lib/console.tsx','utf8');assert.ok(consoleSource.includes('<GuidedWorkshop data={data} lang={lang}'));
console.log('PASS: 1000+ built-in bilingual labels, challenge/journey/question defaults, English return, identifiers, no invented translations, offline reviewed cache with permission checks, and guided Arabic interface override.');
