"use client";
import {useEffect,useState,type ReactNode} from 'react';
import {PenLine,Lightbulb,AlertTriangle,Wrench,Sparkles,Rocket,MessageCircle,Megaphone,Paperclip,ChevronRight} from 'lucide-react';
import {Modal} from './client';
import {tx} from './i18n';
import type {Language,Snapshot} from './workshop';

export type ShareTarget='task'|'comment'|'note'|'file';
/** What the current step lets a participant post, keyed by stage (matches the server's submit types). */
const taskKinds:Record<number,[string,string,string,typeof Lightbulb]>={1:['problem','Share a problem','شارك مشكلة',AlertTriangle],2:['idea','Share an idea','شارك فكرة',Lightbulb],3:['solution','Propose a solution','اقترح حلاً',Wrench],4:['improvement','Improve the selected idea','حسّن الفكرة المختارة',Sparkles],7:['suggestion','Suggest a feature','اقترح ميزة',Rocket]};

/** An always-visible “Share your idea” button for joined participants: one tap shows every way to contribute right now. */
export function ShareCta({data,lang,submitted,onPick}:{data:Snapshot;lang:Language;submitted:boolean;onPick:(target:ShareTarget)=>void}){
 const [open,setOpen]=useState(false),[covered,setCovered]=useState(false);const t=(en:string,ar:string)=>tx(lang==='ar'?'ar':'en',en,ar);
 // While the writing box is already on screen the button would only cover it, so it steps aside.
 useEffect(()=>{let seen:Element|null=null,io:IntersectionObserver|null=null;const watch=()=>{const el=document.getElementById('contribution-text');if(el===seen)return;io?.disconnect();seen=el;setCovered(false);if(el){io=new IntersectionObserver(([e])=>setCovered(e.isIntersecting));io.observe(el)}};watch();const mo=new MutationObserver(watch);mo.observe(document.body,{childList:true,subtree:true});return()=>{mo.disconnect();io?.disconnect()}},[]);
 const c=data.config,kind=taskKinds[c.stage],room=!!data.parent;
 const needsSpotlight=(c.stage===3||c.stage===4)&&!data.ideas.some(i=>i.id===c.spotlight&&i.status==='approved');
 const taskBlocked=!kind?t(room?'Opens when your room lead starts a sharing step.':'Opens when the presenter starts a sharing step.',room?'يُفتح عندما يبدأ قائد الغرفة خطوة مشاركة.':'يُفتح عندما يبدأ مقدم الورشة خطوة مشاركة.'):c.paused?t('The workshop is paused for a moment.','الورشة متوقفة مؤقتاً.'):!c.submissionsOpen?t('Sharing is closed for this step.','المشاركة مغلقة في هذه الخطوة.'):needsSpotlight?t('Waiting for an idea to be selected.','ننتظر اختيار فكرة.'):submitted?t('You already shared for this step.','شاركت بالفعل في هذه الخطوة.'):'';
 const board=c.boardEnabled!==false&&c.boardOpen!==false;
 const pick=(target:ShareTarget)=>{setOpen(false);onPick(target)};
 const Icon=kind?.[3]||PenLine;
 const options:{target:ShareTarget;icon:ReactNode;title:string;hint:string;blocked?:string;tone:string}[]=[
  {target:'task',icon:<Icon size={20}/>,title:kind?t(kind[1],kind[2]):t('Answer the current step','أجب عن الخطوة الحالية'),hint:t('Your team’s current step — written or spoken.','خطوة فريقك الحالية — كتابةً أو بالصوت.'),blocked:taskBlocked,tone:kind?.[0]||'idea'},
  {target:'comment',icon:<MessageCircle size={20}/>,title:t('Comment on a team idea','علّق على فكرة للفريق'),hint:t('Add a question, a note or support to an idea.','أضف سؤالاً أو ملاحظة أو دعماً لفكرة.'),tone:'comment'},
  ...(board?[{target:'note' as const,icon:<Megaphone size={20}/>,title:t('Post a note or anything else','انشر ملاحظة أو أي شيء آخر'),hint:t('On the public board, for all teams to see.','في اللوحة العامة، لتراها كل الفرق.'),tone:'suggestion'}]:[]),
  ...(room?[{target:'file' as const,icon:<Paperclip size={20}/>,title:t('Share a file or photo','شارك ملفاً أو صورة'),hint:t('Add it to your room’s files.','أضفه إلى ملفات غرفتك.'),tone:'improvement'}]:[]),
 ];
 return <>{!covered&&!open&&<div className="share-cta" role="region" aria-label={t('Share your idea','شارك بفكرتك')}><button className="share-cta-button" onClick={()=>setOpen(true)} aria-haspopup="dialog"><span className="share-cta-icon"><PenLine size={20}/></span><span className="share-cta-text"><strong>{t('Share your idea','شارك بفكرتك')}</strong><small>{t('Write your idea, your note, or anything','اكتب فكرتك أو ملاحظتك أو أي شيء')}</small></span></button></div>}
 {open&&<Modal title={t('What would you like to share?','ماذا تريد أن تشارك؟')} onClose={()=>setOpen(false)}><div className="share-options">{options.map(o=><button key={o.target} className={'share-option tone-'+o.tone} disabled={!!o.blocked} onClick={()=>pick(o.target)}><span className="share-option-icon">{o.icon}</span><span className="share-option-text"><strong>{o.title}</strong><small>{o.blocked||o.hint}</small></span><ChevronRight size={18} className="share-option-arrow"/></button>)}</div></Modal>}</>;
}
