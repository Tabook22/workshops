"use client";
import {useEffect} from 'react';
import {useAppInfo,useLanding} from './app-info-client';
import {useUiLang} from './i18n';
import {useContentTranslation} from './translate-client';
import {needsTranslation} from './localization';
export function useLocalizedAppInfo(){
 const info=useAppInfo(),lang=useUiLang();
 const pairs=[['name','nameAr'],['tagline','taglineAr'],['description','descriptionAr'],['organization','organizationAr']] as const;
 const chosen=(en:string,ar:string)=>lang==='ar'?(ar||en):(en||ar);
 const texts=pairs.map(([en,ar])=>chosen(info[en],info[ar])).concat(info.developer);
 const content=useContentTranslation({app:true},texts,lang);
 const localized={...info};for(const [en,ar] of pairs){const text=content.tr(chosen(info[en],info[ar]));if(lang==='ar')localized[ar]=text;else localized[en]=text}localized.developer=content.tr(info.developer);
 const title=lang==='ar'?`${localized.nameAr} · ${localized.taglineAr}`:`${localized.name} · ${localized.tagline}`;
 useEffect(()=>{document.title=title},[title]);
 return localized;
}
export function useLocalizedLanding(){
 const landing=useLanding(),lang=useUiLang();
 const texts=Object.values(landing).map(p=>lang==='ar'?(p.ar||p.en):(p.en||p.ar));
 const content=useContentTranslation({app:true},texts.filter(t=>needsTranslation(t,lang)),lang);
 return Object.fromEntries(Object.entries(landing).map(([key,p])=>[key,{...p,[lang]:content.tr(lang==='ar'?(p.ar||p.en):(p.en||p.ar))}])) as typeof landing;
}
