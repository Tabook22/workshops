import ts from 'typescript';
import {readdirSync,readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';
const compiled=ts.transpileModule(readFileSync('lib/workshop.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {prompts,promptsAr,stages,stageArabic,skills,skillArabic,canvasNames,canvasArabic}=await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'));
const pairs=new Map();
const arabic=s=>/[\u0620-\u064A]/.test(s);
function add(en,ar){if(typeof en==='string'&&typeof ar==='string'&&/[A-Za-z]/.test(en)&&!arabic(en)&&arabic(ar))pairs.set(en,ar)}
function scan(file){const source=ts.createSourceFile(file,readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true,file.endsWith('x')?ts.ScriptKind.TSX:ts.ScriptKind.TS);const literal=n=>n&&(ts.isStringLiteral(n)||ts.isNoSubstitutionTemplateLiteral(n))?n.text:null;
function visit(n){if(ts.isArrayLiteralExpression(n)&&n.elements.length>=2&&n.elements.length<=3)add(literal(n.elements[0]),literal(n.elements[1]));if(ts.isCallExpression(n)){const name=n.expression.getText(source);if(['t','tr','s','L','tx'].includes(name)){const i=name==='tx'?1:0;add(literal(n.arguments[i]),literal(n.arguments[i+1]))}}if(ts.isJsxAttributes(n)){let en,ar;for(const a of n.properties)if(ts.isJsxAttribute(a)){const v=a.initializer&&ts.isStringLiteral(a.initializer)?a.initializer.text:a.initializer&&ts.isJsxExpression(a.initializer)?literal(a.initializer.expression):null;if(a.name.getText(source)==='en')en=v;if(a.name.getText(source)==='ar')ar=v}add(en,ar)}ts.forEachChild(n,visit)}visit(source)}
function walk(dir){for(const f of readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,f.name);if(f.isDirectory())walk(p);else if(/\.tsx?$/.test(f.name)&&!['ui-translation.ts','ui-translations.json'].includes(f.name))scan(p)}}
for(const dir of ['app','lib','vps'])walk(dir);
for(const [en,ar]of [[prompts,promptsAr],[stages,stageArabic],[skills,skillArabic],[canvasNames,canvasArabic]])en.forEach((v,i)=>add(v,ar[i]));
for(const pair of [
 ['Smart Tutor','المعلّم الذكي'],['Smart Store','المخزن الذكي'],['Your Healthcare Assistant','مساعدك الصحي'],['Just Testing','للتجربة فقط'],['Anonymous','مشارك دون اسم'],['Team falcon','فريق الصقر'],
 ['How can we use technology and AI to create a useful smart tutor to help students, and parents teach their students, at home, and also students understand their homeworks, and explain to them what they had studied in the school classes?','كيف يمكننا استخدام التقنية والذكاء الاصطناعي لإنشاء معلّم ذكي ومفيد يساعد الطلاب على فهم واجباتهم وما درسوه في المدرسة، ويساعد أولياء الأمور على تعليم أبنائهم في المنزل؟'],
 ['How can we use technology and AI to create a useful healthcare assistant for university students?','كيف يمكننا استخدام التقنية والذكاء الاصطناعي لإنشاء مساعد صحي مفيد لطلاب الجامعة؟'],
 ['Think • Share • Improve • Vote • Build','فكّر • شارك • حسّن • صوّت • ابنِ'],
 ['English','الإنجليزية'],['Define the problem','حدد المشكلة'],['Today’s challenge','تحدي اليوم'],['TODAY’S CHALLENGE','تحدي اليوم']
 ])add(...pair);
writeFileSync('lib/ui-translations.json',JSON.stringify([...pairs].sort((a,b)=>a[0].localeCompare(b[0])),null,2)+'\n');
console.log('Built '+pairs.size+' reviewed UI translation pairs');
