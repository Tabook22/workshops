"use client";
import {useState} from 'react';
import {CornerDownRight,MessageCircle,Reply,ChevronDown,ChevronRight,Users} from 'lucide-react';
import {T} from './client';
import {displayNumber} from './i18n';
import {ReactionBar} from './engage';
import {AvatarPortrait} from './team-experience';
import {VoicePlayer} from './voice-input';
import {timeAgo} from './rooms-visual';
import {MAX_REPLY_DEPTH,type Idea,type Language,type Snapshot} from './workshop';

/* A discussion drawn as a tree: each comment, the replies under it, and replies to those, joined by coloured
   branch lines (one colour per level) so it is clear who answers whom. A reply whose comment was removed
   moves up to the top level instead of disappearing. */

export type ThreadNode={comment:Idea;children:ThreadNode[];size:number};

/** Builds the reply tree of one idea's comments (oldest first at every level). */
export function buildThread(comments:Idea[]):ThreadNode[]{
 const ids=new Set(comments.map(c=>c.id)),kids=new Map<string,Idea[]>(),roots:Idea[]=[];
 for(const c of [...comments].sort((a,b)=>a.created-b.created)){if(c.replyTo&&ids.has(c.replyTo))kids.set(c.replyTo,[...(kids.get(c.replyTo)||[]),c]);else roots.push(c)}
 const grow=(c:Idea,depth:number):ThreadNode=>{const children=depth<MAX_REPLY_DEPTH+2?(kids.get(c.id)||[]).map(k=>grow(k,depth+1)):[];return {comment:c,children,size:children.reduce((n,k)=>n+1+k.size,0)}};
 return roots.map(c=>grow(c,0));
}

/** "12 comments · 5 replies · 4 people": a one-line picture of the discussion. */
export function threadStats(comments:Idea[]){const ids=new Set(comments.map(c=>c.id));const replies=comments.filter(c=>c.replyTo&&ids.has(c.replyTo)).length;return {comments:comments.length,replies,people:new Set(comments.map(c=>c.nickname)).size}}

type Props={data:Snapshot;lang:Language;refresh:()=>Promise<void>;comments:Idea[];own:(participant:string)=>boolean;canReply:boolean;replyTo:string|null;onReply:(id:string)=>void;form:React.ReactNode;readOnly?:boolean};

export default function CommentThread(props:Props){
 const {comments,lang}=props;const [collapsed,setCollapsed]=useState<string[]>([]);
 const t=(en:string,ar:string)=><T en={en} ar={ar} lang={lang}/>;
 const tree=buildThread(comments),stats=threadStats(comments);
 if(!tree.length)return null;
 const toggle=(id:string)=>setCollapsed(v=>v.includes(id)?v.filter(x=>x!==id):[...v,id]);
 const byId=new Map(comments.map(c=>[c.id,c]));
 const node=(n:ThreadNode,depth:number):React.ReactNode=>{const c=n.comment,hidden=collapsed.includes(c.id),parent=c.replyTo?byId.get(c.replyTo):undefined;
  return <li key={c.id} className="thread-node" data-depth={Math.min(depth,MAX_REPLY_DEPTH)}>
   <article className={'thread-card'+(props.own(c.participant)?' mine':'')+(props.replyTo===c.id?' replying':'')}>
    <div className="thread-head">
     <AvatarPortrait avatar={c.avatar} name={c.nickname} size={depth?28:34}/>
     <span className="thread-who"><strong dir="auto">{c.nickname}</strong>{props.own(c.participant)&&<span className="thread-you">{t('You','أنت')}</span>}
      {parent&&<span className="thread-to"><CornerDownRight size={12} aria-hidden="true"/>{t('replying to','يرد على')} <b dir="auto">{parent.nickname}</b></span>}
     </span>
     <time className="thread-time">{timeAgo(c.created,lang)}</time>
    </div>
    <p className="thread-body" dir="auto">{c.text}</p>
    <VoicePlayer id={c.audio} lang={lang}/>
    <ReactionBar data={props.data} item={c} lang={lang} refresh={props.refresh} disabled={props.readOnly||props.data.config.ended}/>
    {c.status==='pending'&&<small className="pill">{t('Awaiting presenter approval','بانتظار موافقة مقدم الورشة')}</small>}
    <div className="thread-actions">
     {!props.readOnly&&props.canReply&&c.status==='approved'&&depth<MAX_REPLY_DEPTH-1&&<button type="button" className="thread-reply" onClick={()=>props.onReply(c.id)}><Reply size={15}/>{t('Reply','رد')}</button>}
     {n.children.length>0&&<button type="button" className="thread-toggle" aria-expanded={!hidden} onClick={()=>toggle(c.id)}>{hidden?<ChevronRight size={15}/>:<ChevronDown size={15}/>}{hidden?t(`Show ${n.size} ${n.size===1?'reply':'replies'}`,`اعرض ${displayNumber(n.size,'ar')} ${n.size===1?'رداً':'ردود'}`):t(`Hide ${n.size===1?'reply':'replies'}`,'إخفاء الردود')}</button>}
    </div>
   </article>
   {props.replyTo===c.id&&<div className="thread-inline-form">{props.form}</div>}
   {n.children.length>0&&!hidden&&<ol className="thread thread-children" data-depth={Math.min(depth+1,MAX_REPLY_DEPTH)}>{n.children.map(k=>node(k,depth+1))}</ol>}
  </li>};
 return <div className="thread-wrap">
  <p className="thread-summary"><MessageCircle size={15} aria-hidden="true"/>{displayNumber(stats.comments,lang)} {t(stats.comments===1?'comment':'comments','تعليقات')}{stats.replies>0&&<> · <CornerDownRight size={14} aria-hidden="true"/>{displayNumber(stats.replies,lang)} {t(stats.replies===1?'reply':'replies','ردود')}</>} · <Users size={14} aria-hidden="true"/>{displayNumber(stats.people,lang)} {t(stats.people===1?'person':'people','مشاركين')}</p>
  <ol className="thread thread-root">{tree.map(n=>node(n,0))}</ol>
 </div>;
}
