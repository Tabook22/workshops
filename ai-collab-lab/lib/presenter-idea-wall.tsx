"use client";
import {useEffect,useState,type ReactNode} from 'react';
import {LayoutGrid,Circle,List,StickyNote} from 'lucide-react';
import IdeaExplorer from './idea-explorer';
import {T} from './client';
import type {Idea,Language} from './workshop';
export default function PresenterIdeaWall({ideas,comments,code,lang,challenge,renderIdea,onOpen}:{ideas:Idea[];comments:Idea[];code:string;lang:Language;challenge:string;renderIdea:(idea:Idea)=>ReactNode;onOpen:(idea:Idea)=>void}){
 const key='presenter-idea-view:'+code;
 function migrateCanvas(saved:string|null){try{const destination='presenter-canvas-'+code,preferred='presenter-'+(saved==='notes'?'notes-':'')+code,alternate='presenter-'+(saved==='notes'?'':'notes-')+code;if(localStorage.getItem('canvas-shared-migrated:'+code))return;for(const prefix of ['idea-map-layout-v1:','idea-groups-v1:']){const value=localStorage.getItem(prefix+preferred)||localStorage.getItem(prefix+alternate);if(value)localStorage.setItem(prefix+destination,value)}const links=localStorage.getItem('idea-connections-v1:presenter-'+code);if(links)localStorage.setItem('idea-connections-v1:'+destination,links);localStorage.setItem('canvas-shared-migrated:'+code,'1')}catch{}}

 const [view,setView]=useState<'cards'|'bubbles'|'list'|'notes'>(()=>{try{const saved=localStorage.getItem(key);migrateCanvas(saved);return saved==='bubbles'||saved==='list'||saved==='notes'?saved:'cards'}catch{return 'cards'}}),[selected,setSelected]=useState('');
 useEffect(()=>{try{localStorage.setItem(key,view)}catch{}},[key,view]);
 const t=(en:string,ar:string)=><T en={en} ar={ar} lang={lang}/>;
 function open(id:string){const idea=ideas.find(i=>i.id===id);if(idea){setSelected(id);onOpen(idea)}}
 return <div className="presenter-wall-views"><div className="presenter-view-toolbar"><span className="muted">{t('Display ideas as','عرض الأفكار كـ')}</span><div className="presenter-view-switch" role="group" aria-label={lang==='ar'?'طريقة عرض الأفكار':'Idea display'}>{([['cards','Cards','بطاقات',LayoutGrid],['bubbles','Bubbles','فقاعات',Circle],['list','List','قائمة',List],['notes','Sticky notes','ملاحظات لاصقة',StickyNote]] as const).map(([value,en,ar,Icon])=><button key={value} className={view===value?'active':''} aria-pressed={view===value} onClick={()=>setView(value)}><Icon size={17}/>{t(en,ar)}</button>)}</div></div>{!ideas.length?<div className="empty"><p>{t('No contributions match this filter.','لا توجد مشاركات مطابقة لهذا الفلتر.')}</p></div>:(view==='bubbles'||view==='notes')?<><IdeaExplorer stickyNotes={view==='notes'} mapOnly ideas={ideas} comments={comments} selected={ideas.some(i=>i.id===selected)?selected:ideas[0].id} onSelect={setSelected} onOpen={open} lang={lang} challenge={challenge} workshopCode={'presenter-canvas-'+code}/><p className="inline-help">{t('Click an idea to show its connection dots; click it again to open presenter controls. Drag to arrange your map; the arrangement is saved on this device.','اضغط على فقاعة لفتح أدوات إدارة المشاركة. اسحب لترتيب الخريطة؛ يُحفظ الترتيب على هذا الجهاز.')}</p></>:<div className={view==='cards'?'idea-grid':'presenter-idea-list'}>{ideas.map(idea=>renderIdea(idea))}</div>}</div>;
}
