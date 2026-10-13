import type {Language,Snapshot,RoomSummary} from './workshop';
export type Target='en'|'ar';
export function detectLang(text:string):Target|'other'{const ar=(text.match(/[\u0620-\u064A\u066E-\u06D3\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFC]/g)||[]).length,en=(text.match(/[A-Za-z]/g)||[]).length;return ar+en<2?'other':ar>=en?'ar':'en'}
export function needsTranslation(text:string,target:Target){return !!text&&detectLang(text)!=='other'&&detectLang(text)!==target}
/** Display-only digits. Codes, URLs, email addresses, paths and identifiers must retain their exact spelling. */
export function localizeNumbers(value:string|number,lang:string):string{
 const text=String(value),digits='٠١٢٣٤٥٦٧٨٩';
 return text.split(/((?:https?:\/\/|www\.)[^\s]+|[\w.+-]+@[\w.-]+\.[A-Za-z]+|\bUTAS-[0-9]+(?:-R[0-9]+)?\b|\b[A-Za-z]+[\w]*[-_][\w-]+\b)/g).map((part,index)=>index%2?part:lang==='ar'?part.replace(/[0-9]/g,d=>digits[Number(d)]):part.replace(/[٠-٩]/g,d=>String(digits.indexOf(d)))).join('');
}
export const formatNumber=(value:string|number,lang:Language|string)=>localizeNumbers(value,lang);
export const localeFor=(lang:string)=>lang==='ar'?'ar-OM-u-nu-arab':'en-GB';
export function snapshotTexts(data:Snapshot):string[]{
 const c=data.config,out=[c.name,c.challenge,c.question,c.description,c.broadcast||'',c.prompt,...Object.values(c.canvas||{})];
 for(const idea of data.ideas)if(idea.status!=='deleted')out.push(idea.title,idea.text);
 if(data.parent)out.push(data.parent.name,data.parent.challenge,data.parent.broadcast);
 for(const room of data.rooms||[])out.push(room.name,room.challenge,room.question,...Object.values(room.brief),room.latest?.text||'');
 return [...new Set(out.filter(Boolean))];
}
export function translatedRoom<T extends Pick<RoomSummary,'name'|'challenge'|'question'> & Partial<RoomSummary>>(r:T,tr:(s:string)=>string):T{
 return {...r,original:r.original||{name:r.name,challenge:r.challenge,question:r.question},name:tr(r.name),challenge:tr(r.challenge),question:tr(r.question),...(r.brief?{brief:Object.fromEntries(Object.entries(r.brief).map(([k,v])=>[k,tr(v)]))}:{}),...(r.latest?{latest:{...r.latest,text:tr(r.latest.text)}}:{})} as T;
}
/** No changes to IDs, names of people, file names, status, votes, or persisted text. */
export function translatedSnapshot(data:Snapshot,tr:(s:string)=>string):Snapshot{
 const c=data.config;
 const config={...c,name:tr(c.name),challenge:tr(c.challenge),question:tr(c.question),description:tr(c.description),broadcast:tr(c.broadcast||''),prompt:tr(c.prompt),canvas:Object.fromEntries(Object.entries(c.canvas||{}).map(([k,v])=>[k,tr(v)]))};
 return {...data,original:{...c},config,ideas:data.ideas.map(i=>i.status==='deleted'?i:{...i,title:tr(i.title),text:tr(i.text),...(tr(i.title)!==i.title||tr(i.text)!==i.text?{orig:{title:i.orig?.title??i.title,text:i.orig?.text??i.text}}:{})}),...(data.parent?{parent:{...data.parent,name:tr(data.parent.name),challenge:tr(data.parent.challenge),broadcast:tr(data.parent.broadcast)}}:{}),...(data.rooms?{rooms:data.rooms.map(r=>translatedRoom(r,tr))}:{})};
}
