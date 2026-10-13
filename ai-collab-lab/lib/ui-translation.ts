import pairs from './ui-translations.json';
const normalize=(text:string)=>text.trim().replace(/\s+/g,' ').toLowerCase();
const arabic=new Map<string,string>(pairs.map(([en,ar])=>[normalize(en),ar]));
const english=new Map<string,string>(pairs.map(([en,ar])=>[normalize(ar),en]));
/** Only reviewed translations, never a word-by-word guess. Author identities/codes are not passed here. */
export function builtInTranslation(text:string,target:'en'|'ar'):string|undefined{
 if(!text)return undefined;
 const exact=(target==='ar'?arabic:english).get(normalize(text));if(exact)return exact;
 if(target==='ar'){
  const team=text.match(/^(Room\s+)?Team\s+(\d+)$/i);if(team)return(team[1]?'غرفة الفريق ':'الفريق ')+team[2];
 }else{
  const team=text.match(/^(غرفة\s+)?الفريق\s+([0-9٠-٩]+)$/);if(team)return(team[1]?'Room Team ':'Team ')+team[2];
 }
 return undefined;
}
