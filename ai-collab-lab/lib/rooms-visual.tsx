"use client";
/* Visual views of team rooms: an illustrated floor plan, a status table, and a live room activity panel.
   Every view reads the same RoomSummary list, so the presenter, the projector and students see one picture. */
import {DoorOpen,Users,Lightbulb,MessageSquare,Vote,Hourglass,Eye,Crown,Map as MapIcon,LayoutGrid,List,Clock} from 'lucide-react';
import {stages,stageArabic,type RoomSummary,type Language} from './workshop';
import {useWorkshop,TypeChip} from './client';

export type RoomView='map'|'cards'|'list';
type L=(en:string,ar:string)=>string;
const translator=(lang:Language):L=>(en,ar)=>lang==='ar'?ar:en;
const roomNumber=(code:string)=>code.slice(code.lastIndexOf('-')+1);
/** A stable colour per name, so a person or room keeps its colour everywhere. */
export const hue=(name:string)=>[...name].reduce((n,ch)=>n*31+ch.charCodeAt(0)>>>0,7)%360;
const initials=(name:string)=>name.trim().split(/\s+/).map(w=>[...w][0]||'').join('').slice(0,2).toUpperCase()||'?';
/** Something was posted in the last three minutes. */
export const isLive=(r:RoomSummary)=>!!r.lastActivity&&Date.now()-r.lastActivity<180000&&!r.ended;
export function timeAgo(ts:number|null,lang:Language){const t=translator(lang);if(!ts)return t('No activity yet','لا نشاط بعد');const s=Math.max(0,Math.round((Date.now()-ts)/1000));if(s<60)return t('just now','الآن');if(s<3600)return t(`${Math.floor(s/60)} min ago`,`قبل ${Math.floor(s/60)} د`);if(s<86400)return t(`${Math.floor(s/3600)} h ago`,`قبل ${Math.floor(s/3600)} س`);return new Date(ts).toLocaleDateString(lang==='ar'?'ar-OM-u-nu-latn':'en-GB',{day:'numeric',month:'short'});}
const stageName=(i:number,lang:Language)=>lang==='ar'?stageArabic[i]:stages[i];
const VIEW_KEY='ai-collab-room-view';
export function readView(fallback:RoomView):RoomView{try{const v=localStorage.getItem(VIEW_KEY);if(v==='map'||v==='cards'||v==='list')return v}catch{/* private mode */}return fallback}
export function saveView(v:RoomView){try{localStorage.setItem(VIEW_KEY,v)}catch{/* private mode */}}

export function ViewSwitch({view,onChange,lang,list=true}:{view:RoomView;onChange:(v:RoomView)=>void;lang:Language;list?:boolean}){const t=translator(lang);const options:[RoomView,string,string,typeof MapIcon][]=[['map','Map','خريطة',MapIcon],['cards','Cards','بطاقات',LayoutGrid],...(list?[['list','List','قائمة',List] as [RoomView,string,string,typeof MapIcon]]:[])];
 return <div className="tabs segmented view-switch" role="group" aria-label={t('Rooms view','عرض الغرف')}>{options.map(([v,en,ar,Icon])=><button key={v} type="button" className={view===v?'active':''} aria-pressed={view===v} onClick={()=>onChange(v)}><Icon size={14}/>{t(en,ar)}</button>)}</div>}

/** Status chips for one room: who is there and what has happened. */
export function RoomStats({room,lang,large=false}:{room:RoomSummary;lang:Language;large?:boolean}){const t=translator(lang);
 const items:[typeof Users,number,string,string,string][]=[[Users,room.members,'members','أعضاء','Members in this team'],[Eye,room.guests,'visitors','زوار','Visitors from other teams'],[Lightbulb,room.ideas,'contributions','مشاركات','Ideas, solutions and improvements'],[MessageSquare,room.comments,'messages','رسائل','Comments in the discussion'],[Vote,room.ideaVotes,'votes','أصوات','Votes on ideas in this room']];
 return <div className={'room-stats'+(large?' large':'')}>{items.map(([Icon,n,en,ar,title])=><span key={en} title={title}><Icon size={large?18:14}/><strong>{n}</strong>{t(en,ar)}</span>)}{room.pending>0&&<span className="pending" title={t('Waiting for approval','بانتظار الموافقة')}><Hourglass size={large?18:14}/><strong>{room.pending}</strong>{t('pending','قيد المراجعة')}</span>}</div>}

/** The nine steps as a small progress track. */
export function StageTrack({stage,lang}:{stage:number;lang:Language}){return <span className="stage-track" title={`${stage+1}. ${stageName(stage,lang)}`} aria-label={`${stage+1} / 9 · ${stageName(stage,lang)}`}>{stages.map((s,i)=><i key={s} className={i<stage?'done':i===stage?'now':''}/>)}</span>}

/** Illustrated floor plan: each team is a room with its people inside, a desk of activity, and a door to open it. */
export function RoomsMap({rooms,lang,title,onOpen,mine=null,large=false}:{rooms:RoomSummary[];lang:Language;title:string;onOpen?:(r:RoomSummary)=>void;mine?:string|null;large?:boolean}){const t=translator(lang);
 const total=(k:'members'|'guests'|'ideas'|'comments')=>rooms.reduce((n,r)=>n+r[k],0);
 return <div className={'rooms-map'+(large?' large':'')}>
  <div className="map-hall"><span className="map-hall-name"><DoorOpen size={large?24:18}/>{title}</span><span className="map-hall-stats"><span><strong>{rooms.length}</strong> {t('rooms','غرف')}</span><span><strong>{total('members')}</strong> {t('members','أعضاء')}</span><span><strong>{total('guests')}</strong> {t('visitors','زوار')}</span><span><strong>{total('ideas')}</strong> {t('contributions','مشاركات')}</span><span><strong>{total('comments')}</strong> {t('messages','رسائل')}</span></span></div>
  <div className="map-floor">{rooms.map(r=>{const live=isLive(r);const more=Math.max(0,r.members-r.people.length);const Tag=onOpen?'button':'div';
   return <Tag key={r.code} {...(onOpen?{type:'button' as const,onClick:()=>onOpen(r),'aria-label':t(`Open ${r.name}`,`افتح ${r.name}`)}:{})} className={'map-room'+(live?' live':'')+(r.code===mine?' mine':'')+(r.ended?' ended':'')+(r.paused?' paused':'')} style={{'--room-hue':hue(r.name)} as React.CSSProperties}>
    <span className="map-room-roof"><span className="map-room-no" dir="ltr">{roomNumber(r.code)}</span><strong>{r.name}</strong>{live&&<span className="live-dot" title={t('Active now','نشطة الآن')}/>}</span>
    <span className="map-room-topic">{r.challenge}</span>
    <span className="map-room-floor">{r.people.map((p,i)=><span key={p.name+i} className={'map-person'+(p.lead?' lead':'')} title={p.name+(p.lead?' · '+t('room lead','قائد الغرفة'):'')} style={{'--avatar-hue':hue(p.name)} as React.CSSProperties}>{initials(p.name)}{p.lead&&<Crown size={11}/>}</span>)}{more>0&&<span className="map-person more">+{more}</span>}{r.guests>0&&<span className="map-visitors" title={t('Visitors','الزوار')}><Eye size={13}/>{r.guests}</span>}{!r.members&&<span className="map-empty">{t('Empty — waiting for its team','فارغة — بانتظار فريقها')}</span>}</span>
    <span className="map-room-desk"><span title={t('Contributions','المشاركات')}><Lightbulb size={14}/>{r.ideas}</span><span title={t('Messages','الرسائل')}><MessageSquare size={14}/>{r.comments}</span><span title={t('Votes','الأصوات')}><Vote size={14}/>{r.ideaVotes}</span>{r.pending>0&&<span className="pending" title={t('Pending approval','بانتظار الموافقة')}><Hourglass size={14}/>{r.pending}</span>}</span>
    <StageTrack stage={r.stage} lang={lang}/>
    <span className="map-room-foot"><span>{r.stage+1}. {stageName(r.stage,lang)}</span><span><Clock size={12}/>{r.ended?t('Ended','انتهت'):r.paused?t('Paused','متوقفة'):timeAgo(r.lastActivity,lang)}</span></span>
   </Tag>})}</div>
 </div>}

/** Status table: one row per room, sortable from the toolbar above it. */
export function RoomsList({rooms,lang,onOpen}:{rooms:RoomSummary[];lang:Language;onOpen:(r:RoomSummary)=>void}){const t=translator(lang);
 return <div className="rooms-table-wrap"><table className="table rooms-table"><thead><tr><th>{t('Room','الغرفة')}</th><th>{t('Step','الخطوة')}</th><th title={t('Members','الأعضاء')}><Users size={14}/></th><th title={t('Visitors','الزوار')}><Eye size={14}/></th><th title={t('Contributions','المشاركات')}><Lightbulb size={14}/></th><th title={t('Messages','الرسائل')}><MessageSquare size={14}/></th><th title={t('Votes','الأصوات')}><Vote size={14}/></th><th title={t('Pending','قيد المراجعة')}><Hourglass size={14}/></th><th>{t('Last activity','آخر نشاط')}</th></tr></thead>
  <tbody>{rooms.map(r=><tr key={r.code} onClick={()=>onOpen(r)} className={isLive(r)?'live':''}><td><button type="button" className="link-button" onClick={e=>{e.stopPropagation();onOpen(r)}}><span className="room-dot" style={{'--room-hue':hue(r.name)} as React.CSSProperties}/><strong>{r.name}</strong> <span className="muted" dir="ltr">{roomNumber(r.code)}</span></button><small className="muted">{r.challenge}</small></td><td><StageTrack stage={r.stage} lang={lang}/><small>{r.stage+1}. {stageName(r.stage,lang)}</small></td><td className="num">{r.members}</td><td className="num">{r.guests}</td><td className="num">{r.ideas}</td><td className="num">{r.comments}</td><td className="num">{r.ideaVotes}</td><td className={'num'+(r.pending?' pending':'')}>{r.pending}</td><td>{isLive(r)&&<span className="live-dot"/>} {timeAgo(r.lastActivity,lang)}</td></tr>)}</tbody></table></div>}

/** Live view inside one room: its people and everything posted, newest first. Presenter only. */
export function RoomActivity({code,lang}:{code:string;lang:Language}){const t=translator(lang);const {data,error}=useWorkshop(code);
 if(!data)return <p className="connecting">{error||<><span className="spinner"/>{t('Opening room…','جارٍ فتح الغرفة…')}</>}</p>;
 const people=data.people||[];const groups:[string,string,string][]=[['lead','Room lead','قائد الغرفة'],['member','Members','الأعضاء'],['guest','Visitors','الزوار']];
 const feed=data.ideas.filter(i=>i.status!=='deleted').sort((a,b)=>b.created-a.created).slice(0,40);const title=(id:string|null)=>data.ideas.find(i=>i.id===id)?.title||'';
 return <div className="room-activity">
  <section className="room-people"><h3><Users size={16}/>{t('People','الأشخاص')} <span className="count-badge">{people.length}</span></h3>{people.length?groups.map(([role,en,ar])=>{const list=people.filter(p=>p.role===role);return list.length?<div key={role}><p className="nav-label">{t(en,ar)} · {list.length}</p><ul>{list.map((p,i)=><li key={p.nickname+i}><span className={'map-person small'+(role==='guest'?' guest':'')} style={{'--avatar-hue':hue(p.nickname)} as React.CSSProperties}>{initials(p.nickname)}</span><span>{p.nickname}</span>{role==='lead'&&<Crown size={13}/>}<small className="muted">{timeAgo(p.created,lang)}</small></li>)}</ul></div>:null}):<p className="muted">{t('Nobody has joined yet.','لم ينضم أحد بعد.')}</p>}</section>
  <section className="room-feed"><h3><MessageSquare size={16}/>{t('Activity','النشاط')} <span className="count-badge">{feed.length}</span></h3>{feed.length?<ol>{feed.map(i=><li key={i.id} className={i.type==='comment'?'is-comment':''}><span className="map-person small" style={{'--avatar-hue':hue(i.nickname)} as React.CSSProperties}>{initials(i.nickname)}</span><div><div className="feed-top"><strong>{i.nickname}</strong><TypeChip type={i.type} lang={lang}/>{i.status==='pending'&&<span className="pill status-pending">{t('Pending','قيد المراجعة')}</span>}{i.status==='hidden'&&<span className="pill">{t('Hidden','مخفية')}</span>}{!!i.shortlisted&&<span className="pill lime">★ {t('Finalist','مرشح')}</span>}<time>{timeAgo(i.created,lang)}</time></div>{i.type==='comment'?<p className="feed-parent">↳ {t('on','على')} “{title(i.parent)}”</p>:<p className="feed-title">{i.title}</p>}<p className="feed-text">{i.text}</p>{i.type!=='comment'&&typeof i.votes==='number'&&i.votes>0&&<small className="muted"><Vote size={12}/> {i.votes}</small>}</div></li>)}</ol>:<p className="muted">{t('Nothing posted yet. Contributions and messages appear here live.','لم يُنشر شيء بعد. تظهر المشاركات والرسائل هنا مباشرة.')}</p>}</section>
 </div>}
