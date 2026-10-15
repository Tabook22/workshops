"use client";
import {displayNumber} from './i18n';
import {buildThread,initials,personHue} from './threads';
import type {Idea,Language} from './workshop';

/* Comment "moons": every top-level comment on an idea is a small bubble orbiting the idea on the map, with
   the commenter's initials and a ↳ badge counting the replies under it. Tapping a moon opens the discussion
   at that comment. Moons fan out toward the middle of the map (CENTER) so they never fall off its edge. */

const MAX_MOONS=6,MOON=34,SPREAD=34,CENTER={x:450,y:380};
const say=(lang:Language,en:string,ar:string)=>lang==='ar'?ar:en;

export function CommentMoons({idea,comments,x,y,size,lang,onOpen}:{idea:Idea;comments:Idea[];x:number;y:number;size:number;lang:Language;onOpen:(id:string,comment?:string)=>void}){
 const roots=buildThread(comments.filter(c=>c.parent===idea.id));if(!roots.length)return null;
 const shown=roots.slice(0,roots.length>MAX_MOONS?MAX_MOONS-1:MAX_MOONS),extra=roots.length-shown.length,count=shown.length+(extra>0?1:0);
 const toward=Math.hypot(CENTER.x-x,CENTER.y-y)<40?-90:Math.atan2(CENTER.y-y,CENTER.x-x)*180/Math.PI;
 const place=(i:number)=>{const deg=toward+(i-(count-1)/2)*SPREAD,a=deg*Math.PI/180,r=size/2+MOON/2+8;return {left:x+Math.cos(a)*r-MOON/2,top:y+Math.sin(a)*r-MOON/2,'--moon-angle':`${deg+180}deg`}};
 return <>
  {shown.map((n,i)=>{const c=n.comment,label=`${c.nickname}: ${c.text.slice(0,80)}${n.size?' · '+say(lang,`${n.size} ${n.size===1?'reply':'replies'}`,`${displayNumber(n.size,'ar')} ردود`):''}`;
   return <button key={c.id} type="button" className={'orb-moon'+(c.status==='pending'?' pending':'')} style={{...place(i),'--moon-hue':personHue(c.nickname)} as React.CSSProperties} title={label} aria-label={say(lang,'Open comment by ','افتح تعليق ')+label} onClick={()=>onOpen(idea.id,c.id)}>
    <span aria-hidden="true">{initials(c.nickname)}</span>{n.size>0&&<b className="orb-moon-replies" aria-hidden="true">↳{displayNumber(n.size,lang)}</b>}
   </button>})}
  {extra>0&&<button type="button" className="orb-moon more" style={place(count-1) as React.CSSProperties} title={say(lang,`${extra} more comments`,`${displayNumber(extra,'ar')} تعليقات أخرى`)} aria-label={say(lang,`Open all comments (${extra} more)`,`افتح كل التعليقات (${displayNumber(extra,'ar')} أخرى)`)} onClick={()=>onOpen(idea.id,shown[shown.length-1]?.comment.id)}><span aria-hidden="true">+{displayNumber(extra,lang)}</span></button>}
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
