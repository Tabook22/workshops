"use client";
/* Ways to draw people in: quick reactions, a raised hand for the presenter, a team identity,
   and the cross-team feedback mission. */
import {useEffect,useState} from 'react';
import {Hand,Target,Check,ArrowRight,Play,Square} from 'lucide-react';
import {REACTIONS,ROOM_EMOJIS,ROOM_HUES,type Snapshot,type Idea,type Language,type Config} from './workshop';
import {action} from './client';
import {Celebrate} from './learning-ui';
import {appUrl} from './urls';

type L=(en:string,ar:string)=>string;
const translator=(lang:Language):L=>(en,ar)=>lang==='ar'?ar:en;
const reactionNames:Record<string,[string,string]>={'👍':['Agree','أوافق'],'💡':['Great idea','فكرة رائعة'],'❓':['Question','سؤال'],'🔥':['Exciting','مثيرة']};

/** One tap to react: the easiest way for a shy student to take part. Tapping again takes the reaction back. */
export function ReactionBar({data,item,lang,refresh,disabled=false}:{data:Snapshot;item:Idea;lang:Language;refresh:()=>Promise<void>;disabled?:boolean}){const t=translator(lang);const [busy,setBusy]=useState(false),[error,setError]=useState('');
 if(item.status!=='approved'||!data.me)return null;const mine=item.myReactions||[];
 async function toggle(emoji:string){setBusy(true);setError('');try{await action({action:'react',code:data.code,id:item.id,emoji,on:!mine.includes(emoji)});await refresh()}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
 return <div className="reaction-bar" role="group" aria-label={t('React','تفاعل')}>{REACTIONS.map(e=>{const n=item.reactions?.[e]||0,on=mine.includes(e);return <button key={e} type="button" className={'reaction'+(on?' on':'')} aria-pressed={on} disabled={busy||disabled} title={t(...reactionNames[e])} aria-label={`${t(...reactionNames[e])} ${n}`} onClick={()=>void toggle(e)}><span aria-hidden="true">{e}</span>{n>0&&<b>{n}</b>}</button>})}{error&&<small className="error-text">{error}</small>}</div>}

/** Total reactions on an item, for read-only places (presenter feed). */
export function ReactionCounts({item}:{item:Idea}){const list=REACTIONS.filter(e=>item.reactions?.[e]);if(!list.length)return null;return <span className="reaction-counts">{list.map(e=><span key={e}>{e} {item.reactions![e]}</span>)}</span>}

/** “We need the presenter”: the room's card flashes on the presenter's map until someone lowers the hand. */
export function RaiseHand({data,lang,refresh}:{data:Snapshot;lang:Language;refresh:()=>Promise<void>}){const t=translator(lang);const [busy,setBusy]=useState(false),[error,setError]=useState('');const raised=!!data.config.hand;
 if(!data.parent||!data.me||data.me.role==='guest'||data.config.ended)return null;
 async function set(raise:boolean){setBusy(true);setError('');try{await action({action:'hand',code:data.code,raise});await refresh()}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
 return <div className={'raise-hand'+(raised?' raised':'')}>{raised?<><span className="hand-wave" aria-hidden="true">✋</span><span><strong>{t('Hand raised','اليد مرفوعة')}</strong><small>{t('The presenter can see your team needs help.','يرى مقدم الورشة أن فريقك يحتاج المساعدة.')}</small></span><button className="btn small secondary" disabled={busy} onClick={()=>void set(false)}>{t('Lower hand','إنزال اليد')}</button></>:<button className="btn small secondary hand-btn" disabled={busy} onClick={()=>void set(true)}><Hand size={15}/>{t('We need the presenter','نحتاج مقدم الورشة')}</button>}{error&&<small className="error-text">{error}</small>}</div>}

/** Team identity: an emoji and a colour for the room. */
export function IdentityPicker({emoji,hue,lang,busy=false,onChange}:{emoji:string;hue:number|null;lang:Language;busy?:boolean;onChange:(patch:{emoji?:string;hue?:number})=>void}){const t=translator(lang);
 return <div className="identity-picker"><p className="nav-label">{t('Team emoji','رمز الفريق')}</p><div className="emoji-grid" role="radiogroup" aria-label={t('Team emoji','رمز الفريق')}>{ROOM_EMOJIS.map(e=><button key={e} type="button" role="radio" aria-checked={emoji===e} className={'emoji-option'+(emoji===e?' on':'')} disabled={busy} onClick={()=>onChange({emoji:emoji===e?'':e})}>{e}</button>)}</div>
  <p className="nav-label">{t('Team colour','لون الفريق')}</p><div className="hue-grid" role="radiogroup" aria-label={t('Team colour','لون الفريق')}>{ROOM_HUES.map(h=><button key={h} type="button" role="radio" aria-checked={hue===h} aria-label={t('Colour','لون')+' '+h} className={'hue-option'+(hue===h?' on':'')} style={{'--room-hue':h} as React.CSSProperties} disabled={busy} onClick={()=>onChange({hue:h})}/>)}</div></div>}

/** Students: progress on the feedback mission, with a burst of confetti the first time it is complete. */
export function MissionBanner({data,lang,onFind}:{data:Snapshot;lang:Language;onFind?:()=>void}){const t=translator(lang);const m=data.mission;const key='mission-done:'+(data.parent?.code||data.code)+':'+(m?.started||0);const complete=!!m&&m.done>=m.target;
 const [seen]=useState(()=>{try{return sessionStorage.getItem(key)==='1'}catch{return false}});
 useEffect(()=>{if(complete){try{sessionStorage.setItem(key,'1')}catch{/* private mode */}}},[complete,key]);
 if(!m||!data.me)return null;const share=Math.min(1,m.done/m.target);
 return <section className={'mission-banner'+(complete?' complete':'')}><Celebrate run={complete&&!seen?1:0}/><span className="mission-ring" style={{'--share':share} as React.CSSProperties} aria-hidden="true"><span>{complete?<Check size={18}/>:`${Math.min(m.done,m.target)}/${m.target}`}</span></span><span className="mission-text"><strong>{complete?t('Mission complete — thank you!','اكتملت المهمة — شكراً لك!'):t('Feedback mission','مهمة التغذية الراجعة')}</strong><small>{complete?t('Your comments help other teams improve their projects.','تعليقاتك تساعد الفرق الأخرى على تحسين مشاريعها.'):t(`Visit ${m.target} other ${m.target===1?'team':'teams'} and leave one helpful comment in each.`,`زر ${m.target} من الفرق الأخرى واترك تعليقاً مفيداً في كل منها.`)}</small></span>{!complete&&(onFind?<button className="btn small primary" onClick={onFind}>{t('Find a team','ابحث عن فريق')}<ArrowRight size={15}/></button>:data.parent&&<a className="btn small primary" href={appUrl('/join?code=')+data.parent.code}>{t('Find a team','ابحث عن فريق')}<ArrowRight size={15}/></a>)}</section>}

/** Presenter: start or stop the feedback mission and see how many students finished it. */
export function MissionControl({data,lang,busy,control}:{data:Snapshot;lang:Language;busy:boolean;control:(patch:Partial<Config>)=>Promise<boolean>}){const t=translator(lang);const [target,setTarget]=useState(2);const m=data.mission;
 return <section className="rooms-section mission-control"><h3><Target size={16}/>{t('Feedback mission','مهمة التغذية الراجعة')}</h3><p className="inline-help">{t('Ask every student to visit other teams and leave one helpful comment in each. Students see their progress; rooms show the feedback they received.','اطلب من كل طالب زيارة فرق أخرى وترك تعليق مفيد في كل منها. يرى الطلاب تقدمهم، وتعرض الغرف ما تلقته من تغذية راجعة.')}</p>
  {m?<div className="actions"><span className="mission-progress"><b>{m.completed??0}</b>/{m.students??0} {t('students completed','طالباً أكملوا')} · {t(`${m.target} ${m.target===1?'team':'teams'} each`,`${m.target} فرق لكل طالب`)}</span><button className="btn secondary" disabled={busy} onClick={()=>void control({mission:{target:m.target,started:0}})}><Play size={15}/>{t('Restart','إعادة البدء')}</button><button className="btn danger" disabled={busy} onClick={()=>void control({mission:null})}><Square size={15}/>{t('End mission','إنهاء المهمة')}</button></div>
  :<div className="actions"><label className="inline-field">{t('Teams to visit','الفرق المطلوب زيارتها')}<select value={target} onChange={e=>setTarget(Number(e.target.value))}>{[1,2,3,4].map(n=><option key={n} value={n}>{n}</option>)}</select></label><button className="btn primary" disabled={busy} onClick={()=>void control({mission:{target,started:0}})}><Target size={15}/>{t('Start mission','ابدأ المهمة')}</button></div>}
 </section>}
