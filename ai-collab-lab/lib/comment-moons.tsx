"use client";
import {displayNumber} from './i18n';
import {buildThread,initials,personHue,type ThreadNode} from './threads';
import type {Idea,Language} from './workshop';

/* Comment "moons": every top-level comment on an idea is a small bubble orbiting the idea on the map, with the
   commenter's initials. Its replies are smaller bubbles attached to it, and replies to those smaller still,
   each joined to the comment it answers by a line in its level's colour (as in the discussion view). Tapping
   any bubble opens the discussion at that comment. Clusters grow toward the middle of the map (CENTER) so they
   never fall off its edge. A bubble's size shows the attention it drew: replies under it and reactions on it
   make it bigger, a comment nobody answered stays small, and the busiest comment on each idea glows. */

const MAX_MOONS=6,SPREAD=40,CENTER={x:450,y:380};
/** Bubble size per level (comment, reply, reply to a reply, deeper): the size with no attention, how much
    each unit of attention adds (on a square-root curve, so a few replies already show), and the largest size. */
const SIZES=[[22,11,66],[17,8,46],[15,6,36],[13,5,28]] as const;
const LEVELS=SIZES.length;
const reactionsOn=(c:Idea)=>Object.values(c.reactions||{}).reduce((n,v)=>n+v,0);
/** Attention: every reply below a comment (at any depth) counts 1, every reaction on it counts half. */
export const attention=(n:ThreadNode)=>n.size+reactionsOn(n.comment)/2;
const sizeOf=(n:ThreadNode|null,level:number)=>{const [base,step,max]=SIZES[Math.min(level,LEVELS-1)];return n?Math.round(Math.min(max,base+step*Math.sqrt(attention(n)))):base};
/** How many replies each bubble shows before a "+n" bubble, and how wide they fan out. */
const MAX_KIDS=4,FAN=55;
const say=(lang:Language,en:string,ar:string)=>lang==='ar'?ar:en;

type Placed={node:ThreadNode|null;extra:number;level:number;x:number;y:number;deg:number;size:number;from:{x:number;y:number}|null};

export function CommentMoons({idea,comments,x,y,size,lang,onOpen}:{idea:Idea;comments:Idea[];x:number;y:number;size:number;lang:Language;onOpen:(id:string,comment?:string)=>void}){
 const roots=buildThread(comments.filter(c=>c.parent===idea.id));if(!roots.length)return null;
 const shown=roots.slice(0,roots.length>MAX_MOONS?MAX_MOONS-1:MAX_MOONS),extra=roots.length-shown.length,count=shown.length+(extra>0?1:0);
 const toward=Math.hypot(CENTER.x-x,CENTER.y-y)<40?-90:Math.atan2(CENTER.y-y,CENTER.x-x)*180/Math.PI;
 const placed:Placed[]=[];
 const at=(cx:number,cy:number,deg:number,dist:number)=>{const a=deg*Math.PI/180;return {x:cx+Math.cos(a)*dist,y:cy+Math.sin(a)*dist}};
 // Replies fan out around the direction their comment points, one level smaller each time.
 const grow=(n:ThreadNode,level:number,px:number,py:number,deg:number)=>{
  const kids=n.children.slice(0,n.children.length>MAX_KIDS?MAX_KIDS-1:MAX_KIDS),more=n.children.length-kids.length,total=kids.length+(more>0?1:0);
  const s=sizeOf(n,level);
  kids.forEach((child,i)=>{const k=sizeOf(child,level+1),d=deg+(i-(total-1)/2)*FAN,p=at(px,py,d,s/2+k/2+12);placed.push({node:child,extra:0,level:level+1,x:p.x,y:p.y,deg:d,size:k,from:{x:px,y:py}});grow(child,level+1,p.x,p.y,d)});
  if(more>0){const k=sizeOf(null,level+1),d=deg+(total-1)/2*FAN,p=at(px,py,d,s/2+k/2+12);placed.push({node:null,extra:more,level:level+1,x:p.x,y:p.y,deg:d,size:k,from:{x:px,y:py}})}
 };
 // Big comments need more room beside their neighbours, so the fan widens with the largest bubble.
 const biggest=Math.max(...shown.map(n=>sizeOf(n,0))),spread=Math.max(SPREAD,Math.min(70,biggest*0.95));
 const hot=shown.reduce<ThreadNode|null>((best,n)=>attention(n)>=2&&(!best||attention(n)>attention(best))?n:best,null);
 shown.forEach((n,i)=>{const s=sizeOf(n,0),deg=toward+(i-(count-1)/2)*spread,p=at(x,y,deg,size/2+s/2+8);placed.push({node:n,extra:0,level:0,x:p.x,y:p.y,deg,size:s,from:{x,y}});grow(n,0,p.x,p.y,deg)});
 if(extra>0){const s=sizeOf(null,0),deg=toward+(count-1)/2*spread,p=at(x,y,deg,size/2+s/2+8);placed.push({node:null,extra,level:0,x:p.x,y:p.y,deg,size:s,from:{x,y}})}
 const lvl=(l:number)=>Math.min(l,LEVELS-1);
 return <>
  {placed.map((p,i)=>{if(!p.from)return null;const dx=p.x-p.from.x,dy=p.y-p.from.y;return <span key={'l'+i} className="moon-link" data-level={lvl(p.level)} aria-hidden="true" style={{left:p.from.x,top:p.from.y,width:Math.hypot(dx,dy),transform:`rotate(${Math.atan2(dy,dx)}rad)`}}/>})}
  {placed.map((p,i)=>{const s=p.size,box={left:p.x-s/2,top:p.y-s/2,width:s,height:s,fontSize:Math.max(8,Math.round(s*.34))};
   if(!p.node){const parent=placed.find(q=>q.node&&q.from&&p.from&&q.x===p.from.x&&q.y===p.from.y)?.node;return <button key={'m'+i} type="button" className="orb-moon more" data-level={lvl(p.level)} style={box} title={say(lang,`${p.extra} more`,`${displayNumber(p.extra,'ar')} أخرى`)} aria-label={say(lang,`Open ${p.extra} more`,`افتح ${displayNumber(p.extra,'ar')} أخرى`)} onClick={()=>onOpen(idea.id,parent?.comment.id)}><span aria-hidden="true">+{displayNumber(p.extra,lang)}</span></button>}
   const c=p.node.comment,kind=p.level===0?say(lang,'Comment','تعليق'):p.level===1?say(lang,'Reply','رد'):say(lang,'Reply to a reply','رد على رد'),label=`${kind} · ${c.nickname}: ${c.text.slice(0,80)}${p.node.size?' · '+say(lang,`${p.node.size} ${p.node.size===1?'reply':'replies'}`,`${displayNumber(p.node.size,'ar')} ردود`):''}`;
   return <button key={c.id} type="button" className={'orb-moon'+(c.status==='pending'?' pending':'')+(p.node===hot?' hot':'')} data-level={lvl(p.level)} style={{...box,'--moon-hue':personHue(c.nickname)} as React.CSSProperties} title={label} aria-label={say(lang,'Open ','افتح ')+label} onClick={()=>onOpen(idea.id,c.id)}><span aria-hidden="true">{s<20?initials(c.nickname).slice(0,1):initials(c.nickname)}</span>{s>=38&&p.node.size>0&&<small className="orb-moon-count" aria-hidden="true">↳{displayNumber(p.node.size,lang)}</small>}</button>})}
 </>;
}

/** The same comments as a row of chips, for the Discover card (phones). */
export function CommentChips({idea,comments,lang,onOpen}:{idea:Idea;comments:Idea[];lang:Language;onOpen:(id:string,comment?:string)=>void}){
 const roots=buildThread(comments.filter(c=>c.parent===idea.id));if(!roots.length)return null;
 return <div className="moon-chips" role="list" aria-label={say(lang,'Comments on this idea','التعليقات على هذه الفكرة')}>
  {roots.slice(0,8).map(n=>{const c=n.comment;return <button key={c.id} type="button" role="listitem" className="moon-chip" onClick={()=>onOpen(idea.id,c.id)} title={c.text.slice(0,120)}>
   <span className="orb-moon static" style={{'--moon-hue':personHue(c.nickname)} as React.CSSProperties} aria-hidden="true"><span>{initials(c.nickname)}</span></span>
   <span className="moon-chip-name" dir="auto">{c.nickname}</span>{n.size>0&&<b>↳ {displayNumber(n.size,lang)}</b>}
  </button>})}
  {roots.length>8&&<button type="button" className="moon-chip" onClick={()=>onOpen(idea.id)}>+{displayNumber(roots.length-8,lang)}</button>}
 </div>;
}
