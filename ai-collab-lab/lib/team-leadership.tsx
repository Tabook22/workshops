"use client";
import {useState} from 'react';
import {Users,Crown,Vote,Check,LogOut} from 'lucide-react';
import {action,Modal} from './client';
import type {Snapshot,Language} from './workshop';

/** One focused place for members to understand their role and choose their leader. */
export default function TeamLeadership({data,lang,refresh}:{data:Snapshot;lang:Language;refresh:()=>Promise<void>}) {
 const t=(en:string,ar:string)=>lang==='ar'?ar:en;
 const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),[leaving,setLeaving]=useState(false);
 const election=data.leadership;
 if(!election)return null;
 const leader=election.members.find(p=>p.lead);
 const member=!!data.me&&data.me.role!=='guest';
 const closed=data.config.ended||data.parent?.ended;
 const canVote=member&&!closed&&!data.config.paused&&election.members.length>1;
 async function choose(candidate:string|null) {
  setBusy(true);setError('');setMessage('');
  try {
   const result=await action({action:'leadershipVote',code:data.code,candidate}) as {elected?:boolean};
   const name=election?.members.find(p=>p.id===candidate)?.name||'';
   await refresh();
   setMessage(result.elected?t(`${name} is confirmed as team leader. A fresh vote can be started at any time.`,`تم تأكيد ${name} قائداً للفريق. يمكن بدء تصويت جديد في أي وقت.`):candidate?t(`Vote saved for ${name}. You can change it until a majority is reached.`,`تم حفظ صوتك لـ ${name}. يمكنك تغييره حتى تتحقق الأغلبية.`):t('Your vote was withdrawn.','تم سحب صوتك.'));
  } catch(e){setError((e as Error).message)} finally{setBusy(false)}
 }
 async function leave() {
  setBusy(true);setError('');
  try {await action({action:'leaveRoom',code:data.code});await refresh();setOpen(false);setLeaving(false)}
  catch(e){setError((e as Error).message)}finally{setBusy(false)}
 }
 return <><button className="btn small secondary" onClick={()=>{setOpen(true);setError('');setMessage('');setLeaving(false)}}><Users size={15}/>{t('Team & leader','الفريق والقائد')}</button>
 {open&&<Modal title={t('Your team & leader','فريقك وقائده')} onClose={()=>setOpen(false)}>
  <div className="team-leader-summary"><span className="team-leader-icon"><Crown size={24}/></span><div><span className="eyebrow">{t('CURRENT LEADER','القائد الحالي')}</span><h3 dir="auto">{leader?.name||t('Waiting for a member','بانتظار عضو')}</h3><p className="muted">{t('Keeps the team moving, guides discussion, and prepares the project brief.','ينظم عمل الفريق، ويوجه النقاش، ويجهز ملخص المشروع.')}</p></div></div>
  <section className="team-role-guide"><h3>{t('Everyone has a part to play','لكل شخص دور مهم')}</h3><ul><li><Check size={15}/>{t('Members share ideas, comment, vote, and upload files.','يشارك الأعضاء الأفكار والتعليقات والتصويت والملفات.')}</li><li><Check size={15}/>{t('Visitors give feedback without changing teams.','يقدم الزوار الملاحظات دون تغيير فرقهم.')}</li><li><Check size={15}/>{t('The leader guides the room; members choose who leads.','يوجه القائد الغرفة، ويختار الأعضاء من يقودهم.')}</li></ul></section>
  <section className="leader-vote-section"><div className="section-heading"><h3><Vote size={18}/> {t('Choose your team leader','اختر قائد فريقك')}</h3><span className="pill">{election.ballots} / {election.members.length} {t('voted','صوّتوا')}</span></div>
   <p className="inline-help">{t(`One vote per member, including yourself. ${election.required} votes confirms a leader — more than half of all ${election.members.length} members. A tie never changes the leader.`, `صوت واحد لكل عضو، ويمكنك اختيار نفسك. ${election.required} أصوات تؤكد القائد — أكثر من نصف أعضاء الفريق وعددهم ${election.members.length}. التعادل لا يغيّر القائد.`)}</p>
   <p className="inline-help">{t('Your choice is private; the team sees totals only. Ballots reset after a majority, a membership change, or a direct handover.','اختيارك خاص؛ يرى الفريق مجموع الأصوات فقط. يبدأ تصويت جديد بعد الأغلبية أو تغيير الأعضاء أو تسليم القيادة مباشرة.')}</p>
   {closed?<p className="pill">{t('Workshop ended — voting closed','انتهت الورشة — التصويت مغلق')}</p>:data.config.paused?<p className="pill">{t('Room paused — voting will resume with the room','الغرفة متوقفة — يُستأنف التصويت مع الغرفة')}</p>:election.members.length<2?<p className="inline-help">{t('Invite a teammate to start a leader vote. You lead until then.','ادعُ زميلاً لبدء التصويت. تقود الفريق حتى ذلك الحين.')}</p>:null}
   <ul className="leader-candidates">{election.members.map(p=><li key={p.id}><div className="leader-candidate-name"><strong dir="auto">{p.name}</strong>{p.id===data.me?.id&&<small className="muted">{t('You','أنت')}</small>}{p.lead&&<span className="pill lime"><Crown size={12}/>{t('Leader','القائد')}</span>}</div><span className="leader-vote-count">{p.votes} {t('votes','أصوات')}</span><button className={'btn small '+(election.myVote===p.id?'secondary':'primary')} disabled={busy||!canVote||election.myVote===p.id} aria-label={t(`Vote for ${p.name}`,`صوّت لـ ${p.name}`)} onClick={()=>void choose(p.id)}>{election.myVote===p.id?<><Check size={14}/>{t('Your vote','صوتك')}</>:t('Choose','اختر')}</button></li>)}</ul>
   {election.myVote&&canVote&&<button className="btn small ghost" disabled={busy} onClick={()=>void choose(null)}>{t('Withdraw my vote','سحب صوتي')}</button>}
   {message&&<p className="success" role="status">{message}</p>}{error&&<p className="error" role="alert">{error}</p>}
  </section>
  {member&&<section className="team-leave"><h3>{t('Need a different team?','تحتاج إلى فريق آخر؟')}</h3><p className="inline-help">{t('Leaving keeps your ideas and files here. You become a visitor. If you lead, the earliest remaining member takes over automatically.','تظل أفكارك وملفاتك هنا بعد المغادرة، وتصبح زائراً. إذا كنت القائد، يتولى أول عضو متبقٍ القيادة تلقائياً.')}</p>{leaving?<div className="actions"><span>{t('Leave this team?','مغادرة هذا الفريق؟')}</span><button className="btn small danger" disabled={busy} onClick={()=>void leave()}>{t('Leave team','غادر الفريق')}</button><button className="btn small secondary" disabled={busy} onClick={()=>setLeaving(false)}>{t('Stay','ابقَ')}</button></div>:<button className="btn small ghost" onClick={()=>setLeaving(true)}><LogOut size={15}/>{t('Leave this team','غادر هذا الفريق')}</button>}</section>}
 </Modal>}
 </>;
}
