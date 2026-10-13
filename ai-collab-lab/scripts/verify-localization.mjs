import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
// The pure display mapper has type-only imports, so compile it in memory without emitting project files.
const text=ts.transpileModule(readFileSync('lib/localization.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {localizeNumbers,detectLang,snapshotTexts,translatedSnapshot}=await import('data:text/javascript;base64,'+Buffer.from(text).toString('base64'));
assert.equal(localizeNumbers('19 students, 5 minutes, 01:30','ar'),'١٩ students, ٥ minutes, ٠١:٣٠');
assert.equal(localizeNumbers('١٩ طالباً، ٥ دقائق','en'),'19 طالباً، 5 دقائق');
assert.equal(localizeNumbers('UTAS-986320-R1 https://example.com/123 me22@example.com 19','ar'),'UTAS-986320-R1 https://example.com/123 me22@example.com ١٩');
assert.equal(detectLang('١٩'),'other');assert.equal(detectLang('How can we help 19 students?'),'en');assert.equal(detectLang('كيف نساعد الطلاب؟'),'ar');
const data={code:'UTAS-123456',config:{name:'Workshop',challenge:'Smart Tutor',question:'How can we help?',description:'Learn together',broadcast:'Five minutes left',canvas:{Problem:'Homework support'},prompt:'Build an app'},ideas:[{id:'p1',title:'Homework buddy',text:'Explain homework',status:'pending',participant:'person-id',nickname:'Sara',votes:19},{id:'a1',title:'Approved',text:'Public contribution',status:'approved'}],parent:{name:'Parent',challenge:'Parent challenge',broadcast:'Parent note',code:'UTAS-111111'},rooms:[{code:'UTAS-123456-R1',name:'Team',challenge:'Project',question:'Team question',brief:{problem:'Team problem'},latest:{text:'Latest contribution',nickname:'Sara'}}],stats:{participants:19}};
const before=JSON.stringify(data);const required=['Five minutes left','Homework support','Build an app','Homework buddy','Explain homework','Parent note','Team question','Latest contribution'];
for(const value of required)assert.ok(snapshotTexts(data).includes(value),value);
const out=translatedSnapshot(data,t=>'Translated: '+t);
assert.equal(out.config.question,'Translated: How can we help?');assert.equal(out.config.broadcast,'Translated: Five minutes left');assert.equal(out.config.canvas.Problem,'Translated: Homework support');assert.equal(out.parent.broadcast,'Translated: Parent note');assert.equal(out.rooms[0].latest.text,'Translated: Latest contribution');assert.equal(out.ideas[0].text,'Translated: Explain homework');
assert.equal(out.original.question,'How can we help?');assert.equal(out.original.canvas.Problem,'Homework support');assert.equal(out.ideas[0].orig.text,'Explain homework');assert.equal(out.rooms[0].original.name,'Team');assert.equal(out.ideas[0].nickname,'Sara');assert.equal(out.ideas[0].participant,'person-id');assert.equal(out.ideas[0].votes,19);assert.equal(out.code,data.code);assert.equal(JSON.stringify(data),before,'source untouched');
console.log('PASS: bidirectional digits, codes/URLs/email preservation, language detection, full visible text mapping, original-safe edits, and untouched identities/votes.');
