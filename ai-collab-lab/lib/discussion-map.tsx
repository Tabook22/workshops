"use client";
import {useMemo,useState} from 'react';
import {Reply,MessagesSquare,Network,X,CornerDownRight} from 'lucide-react';
import {T} from './client';
import {displayNumber} from './i18n';
import {ReactionBar} from './engage';
import {VoicePlayer} from './voice-input';
import {timeAgo} from './rooms-visual';
import {buildThread,initials,personHue,type ThreadNode} from './threads';
import {MAX_REPLY_DEPTH,REACTIONS,type Idea,type Language,type Snapshot} from './workshop';

/* The discussion as a map: one column per level (the idea, its comments, replies, replies to replies…),
   every comment a card joined to the one it answers by a curved line in its level's colour. Tapping a card
   lights up its whole branch (who it answers and everyone who answered it) and opens it below the map. */

const COL=200,W=168,H=62,GAP=14,HEAD=40,PAD=12;
const levelNames:[string,string][]=[['Idea','الفكرة'],['Comments','التعليقات'],['Replies','الردود'],['Replies to replies','ردود على الردود'],['Deeper replies','ردود أعمق']];

type Node={id:string;level:number;comment:Idea|null;children:Node[];size:number;row:number;parent:Node|null};

export type DiscussionView='conversation'|'map';

/** The Conversation / Map switch shown above a discussion. */
export function DiscussionSwitch({view,onChange,lang}:{view:DiscussionView;onChange:(v:DiscussionView)=>void;lang:Language}){
 const t=(en:string,ar:string)=><T en={en} ar={ar} lang={lang}/>;
 return <div className="discussion-switch" role="group" aria-label={lang==='ar'?'طريقة عرض النقاش':'How to show the discussion'}>
  <button type="button" aria-pressed={view==='conversation'} onClick={()=>onChange('conversation')}><MessagesSquare size={16}/>{t('Conversation','المحادثة')}</button>
  <button type="button" aria-pressed={view==='map'} onClick={()=>onChange('map')}><Network size={16}/>{t('Discussion map','خريطة النقاش')}</button>
 </div>;
}

type Props={data:Snapshot;lang:Language;refresh:()=>Promise<void>;idea:Idea;comments:Idea[];canReply:boolean;readOnly?:boolean;onReply?:(id:string)=>void;onShow?:(id:string)=>void};

export default function DiscussionMap({data,lang,refresh,idea,comments,canReply,readOnly=false,onReply,onShow}:Props){
 const [selected,setSelected]=useState<string|null>(null),[collapsed,setCollapsed]=useState<string[]>([]);
 const t=(en:string,ar:string)=><T en={en} ar={ar} lang={lang}/>;
 const rtl=lang==='ar';

 // Lay the tree out: leaves take consecutive rows, a parent sits in the middle of its children.
 const {nodes,levels,rows}=useMemo(()=>{
  const all:Node[]=[];let next=0,levels=1;
  const make=(t:ThreadNode,level:number,parent:Node):Node=>{const n:Node={id:t.comment.id,level,comment:t.comment,children:[],size:t.size,row:0,parent};n.children=t.children.map(k=>make(k,level+1,n));return n};
  const root:Node={id:'idea',level:0,comment:null,children:[],size:comments.length,row:0,parent:null};
  root.children=buildThread(comments).map(k=>make(k,1,root));
  const place=(n:Node)=>{all.push(n);levels=Math.max(levels,n.level+1);const open=n.children.length&&!collapsed.includes(n.id);if(!open){n.row=next++;return}n.children.forEach(place);n.row=(n.children[0].row+n.children[n.children.length-1].row)/2};
  place(root);
  return {nodes:all,levels,rows:Math.max(next,1)};
 },[comments,collapsed]);

 const width=PAD*2+(levels-1)*COL+W,height=HEAD+PAD*2+rows*(H+GAP)-GAP;
 const pos=(n:Node)=>{const x=PAD+n.level*COL;return {x:rtl?width-x-W:x,y:HEAD+PAD+n.row*(H+GAP)}};
 const visible=nodes.filter(n=>{let p=n.parent;while(p){if(collapsed.includes(p.id))return false;p=p.parent}return true});

 // The lit branch: the selected comment, everything above it, and everything below it.
 const lit=new Set<string>();const pick=selected?nodes.find(n=>n.id===selected):undefined;
 if(pick){let p:Node|null=pick;while(p){lit.add(p.id);p=p.parent}const down=(n:Node)=>{lit.add(n.id);n.children.forEach(down)};down(pick)}

 const toggle=(id:string)=>setCollapsed(v=>v.includes(id)?v.filter(x=>x!==id):[...v,id]);
 const counts=Array.from({length:levels},(_,l)=>nodes.filter(n=>n.level===l).length);
 const edge=(n:Node)=>{if(!n.parent)return null;const a=pos(n.parent),b=pos(n);const x1=rtl?a.x:a.x+W,y1=a.y+H/2,x2=rtl?b.x+W:b.x,y2=b.y+H/2,mid=(x1+x2)/2;
  return <path key={n.id} className={'dmap-edge'+(pick?(lit.has(n.id)?' lit':' dim'):'')} data-level={Math.min(n.level,4)} d={`M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`} style={{animationDelay:`${n.level*90}ms`}}/>};
 const top=(c:Idea)=>REACTIONS.filter(e=>c.reactions?.[e]).slice(0,3);
 const sel=pick?.comment||null;

 if(!comments.length)return <p className="muted">{t('No comments yet. Start the conversation.','لا توجد تعليقات بعد. ابدأ النقاش.')}</p>;
 return <div className="dmap">
  <p className="dmap-hint">{t('Tap a card to light up its branch. Tap ＋ / − to fold replies. Scroll sideways to see deeper replies.','اضغط على بطاقة لإبراز فرعها. اضغط ＋ / − لطي الردود. مرّر جانباً لرؤية الردود الأعمق.')}</p>
  <div className="dmap-scroll" onClick={e=>{if(e.target===e.currentTarget)setSelected(null)}}>
   <div className="dmap-canvas" style={{width,height}} onClick={e=>{if(e.target===e.currentTarget)setSelected(null)}}>
    {counts.map((n,l)=>{const x=PAD+l*COL;return <div key={l} className="dmap-head" data-level={Math.min(l,4)} style={{left:rtl?width-x-W:x,width:W}}><i aria-hidden="true"/>{t(...levelNames[Math.min(l,4)])}<b>{displayNumber(n,lang)}</b></div>})}
    <svg className="dmap-lines" width={width} height={height} aria-hidden="true">{visible.map(edge)}</svg>
    {visible.map(n=>{const p=pos(n),c=n.comment,folded=collapsed.includes(n.id);
     return <div key={n.id} className={'dmap-node'+(n.level===0?' root':'')+(selected===n.id?' selected':'')+(pick?(lit.has(n.id)?' lit':' dim'):'')+(c?.status==='pending'?' pending':'')} data-level={Math.min(n.level,4)} style={{left:p.x,top:p.y,width:W,height:H,animationDelay:`${n.level*90}ms`}}>
      {c?<button type="button" className="dmap-card" aria-pressed={selected===n.id} onClick={()=>setSelected(selected===n.id?null:n.id)} title={c.text}>
        <span className="dmap-avatar" style={{'--person-hue':personHue(c.nickname)} as React.CSSProperties} aria-hidden="true">{initials(c.nickname)}</span>
        <span className="dmap-text"><strong dir="auto">{c.nickname}{c.audio&&<span aria-label={lang==='ar'?'ملاحظة صوتية':'Voice note'}> 🎙️</span>}</strong><span dir="auto">{c.text}</span></span>
        {top(c).length>0&&<span className="dmap-reacts" aria-hidden="true">{top(c).map(e=><span key={e}>{e}{c.reactions![e]}</span>)}</span>}
       </button>
      :<button type="button" className="dmap-card" onClick={()=>setSelected(null)} title={idea.text}><span className="dmap-text"><strong dir="auto">💡 {idea.title}</strong><span>{displayNumber(comments.length,lang)} {t('comments in total','تعليقاً إجمالاً')}</span></span></button>}
      {n.children.length>0&&n.level>0&&<button type="button" className="dmap-knob" aria-expanded={!folded} aria-label={folded?(lang==='ar'?'اعرض الردود':'Show replies'):(lang==='ar'?'اطوِ الردود':'Fold replies')} onClick={()=>toggle(n.id)}>{folded?'+'+displayNumber(n.size,lang):'−'}</button>}
     </div>})}
   </div>
  </div>
  {sel&&pick&&<section className="dmap-detail" data-level={Math.min(pick.level,4)} aria-live="polite">
   <button type="button" className="dmap-close" aria-label={lang==='ar'?'إغلاق':'Close'} onClick={()=>setSelected(null)}><X size={16}/></button>
   <div className="dmap-detail-head"><span className="dmap-avatar big" style={{'--person-hue':personHue(sel.nickname)} as React.CSSProperties} aria-hidden="true">{initials(sel.nickname)}</span>
    <div><strong dir="auto">{sel.nickname}</strong><small>{t(...levelNames[Math.min(pick.level,4)])}{pick.parent?.comment&&<> · <CornerDownRight size={12}/> {t('replying to','يرد على')} <b dir="auto">{pick.parent.comment.nickname}</b></>} · {timeAgo(sel.created,lang)}</small></div></div>
   <p className="dmap-detail-text" dir="auto">{sel.text}</p>
   <VoicePlayer id={sel.audio} lang={lang}/>
   <ReactionBar data={data} item={sel} lang={lang} refresh={refresh} disabled={readOnly||data.config.ended}/>
   <div className="actions">
    {!readOnly&&canReply&&sel.status==='approved'&&pick.level<MAX_REPLY_DEPTH&&onReply&&<button type="button" className="btn small primary" onClick={()=>onReply(sel.id)}><Reply size={15}/>{t('Reply','رد')}</button>}
    {onShow&&<button type="button" className="btn small secondary" onClick={()=>onShow(sel.id)}><MessagesSquare size={15}/>{t('See in conversation','اعرضه في المحادثة')}</button>}
    {pick.children.length>0&&<span className="muted">{displayNumber(pick.size,lang)} {t(pick.size===1?'reply below it':'replies below it','ردود تحته')}</span>}
   </div>
  </section>}
 </div>;
}
