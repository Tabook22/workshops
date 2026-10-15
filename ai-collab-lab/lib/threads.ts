import {MAX_REPLY_DEPTH,type Idea} from './workshop';

/* Shared shape of a discussion: used by the threaded comment view and by the small comment "moons" that
   orbit each idea on the map. */

export type ThreadNode={comment:Idea;children:ThreadNode[];size:number};

/** Builds the reply tree of one idea's comments (oldest first at every level). A reply whose comment is not
    visible (removed or pending) moves up to the top level instead of disappearing. */
export function buildThread(comments:Idea[]):ThreadNode[]{
 const ids=new Set(comments.map(c=>c.id)),kids=new Map<string,Idea[]>(),roots:Idea[]=[];
 for(const c of [...comments].sort((a,b)=>a.created-b.created)){if(c.replyTo&&ids.has(c.replyTo))kids.set(c.replyTo,[...(kids.get(c.replyTo)||[]),c]);else roots.push(c)}
 const grow=(c:Idea,depth:number):ThreadNode=>{const children=depth<MAX_REPLY_DEPTH+2?(kids.get(c.id)||[]).map(k=>grow(k,depth+1)):[];return {comment:c,children,size:children.reduce((n,k)=>n+1+k.size,0)}};
 return roots.map(c=>grow(c,0));
}

/** "12 comments · 5 replies · 4 people": a one-line picture of the discussion. */
export function threadStats(comments:Idea[]){const ids=new Set(comments.map(c=>c.id));const replies=comments.filter(c=>c.replyTo&&ids.has(c.replyTo)).length;return {comments:comments.length,replies,people:new Set(comments.map(c=>c.nickname)).size}}

/** Up to two letters for a person's mini avatar (works for Arabic names too). */
export function initials(name:string){const parts=name.trim().split(/\s+/).filter(Boolean);return ((parts[0]?.[0]||'?')+(parts.length>1?parts[parts.length-1][0]:parts[0]?.[1]||'')).toUpperCase()}

/** A stable colour (hue) per person, so the same commenter looks the same everywhere. */
export function personHue(name:string){let h=0;for(const ch of name)h=(h*31+ch.charCodeAt(0))>>>0;return h%360}
