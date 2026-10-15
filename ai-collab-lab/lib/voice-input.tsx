"use client";
import {useCallback,useEffect,useRef,useState} from 'react';
import {Mic,Square,PenLine,RotateCcw,Trash2,Headphones} from 'lucide-react';
import {T} from './client';
import {appUrl} from './urls';
import {uid} from './id';
import {getUiLang,translateError,displayNumber} from './i18n';
import type {Language} from './workshop';

/* Write or speak: every place people contribute offers both. Speaking records a voice note (kept with the
   contribution for later listening) and, where the browser supports speech recognition, types the words live
   into the text box so the speaker can correct them before sending. Nothing is sent until the form is. */

const CHUNK=96*1024,MAX_BYTES=3*1024*1024,MAX_SECONDS=180,MODE_KEY='ai-collab-input-mode',SPEECH_KEY='ai-collab-speech-lang';
type Recording={blob:Blob;url:string;seconds:number};
export type VoiceNote={rec:Recording|null;set:(r:Recording|null)=>void;clear:()=>void;upload:(code:string)=>Promise<string|null>};

type SpeechResult={isFinal:boolean;0:{transcript:string}};
type SpeechEvent={resultIndex:number;results:ArrayLike<SpeechResult>};
type Recognizer={lang:string;continuous:boolean;interimResults:boolean;onresult:((e:SpeechEvent)=>void)|null;onerror:((e:{error:string})=>void)|null;onend:(()=>void)|null;start():void;stop():void;abort():void};
type RecognizerClass=new()=>Recognizer;
function recognizerClass():RecognizerClass|null{if(typeof window==='undefined')return null;const w=window as unknown as {SpeechRecognition?:RecognizerClass;webkitSpeechRecognition?:RecognizerClass};return w.SpeechRecognition||w.webkitSpeechRecognition||null}
const say=(lang:Language,en:string,ar:string)=>lang==='ar'?ar:en;
const clock=(s:number,lang:Language)=>displayNumber(Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0'),lang);

/** Sends a recording in pieces (the VPS proxy limits each request) and returns its upload id. */
export async function sendVoice(code:string,blob:Blob){
 if(blob.size>MAX_BYTES)throw new Error(translateError('This voice note is too long. Please record a shorter one.',getUiLang()));
 const id=uid(),total=Math.max(1,Math.ceil(blob.size/CHUNK)),ext=blob.type.includes('mp4')?'m4a':blob.type.includes('ogg')?'ogg':blob.type.includes('wav')?'wav':'webm';
 for(let i=0;i<total;i++){for(let tries=0;;tries++){let r:Response;try{r=await fetch(appUrl('/api/upload')+`?code=${encodeURIComponent(code)}&id=${id}&index=${i}&total=${total}&kind=voice`,{method:'POST',headers:{'Content-Type':'application/octet-stream','X-File-Name':encodeURIComponent('voice-note.'+ext)},body:blob.slice(i*CHUNK,(i+1)*CHUNK)})}catch{if(tries<2)continue;throw new Error(translateError('Unable to save your voice note right now. Please retry.',getUiLang()))}const d=await r.json().catch(()=>({})) as {error?:string};if(!r.ok){if(r.status>=500&&tries<2)continue;throw new Error(translateError(d.error||'Unable to save your voice note right now. Please retry.',getUiLang()))}break}}
 return id;
}

/** Holds the recording of one form until it is sent; uploading twice reuses the first upload. */
export function useVoiceNote():VoiceNote{
 const [rec,setRec]=useState<Recording|null>(null);const sent=useRef<{blob:Blob;id:string}|null>(null);
 const set=useCallback((r:Recording|null)=>setRec(old=>{if(old&&old!==r)URL.revokeObjectURL(old.url);return r}),[]);
 const clear=useCallback(()=>set(null),[set]);
 const upload=useCallback(async(code:string)=>{if(!rec)return null;if(sent.current?.blob===rec.blob)return sent.current.id;const id=await sendVoice(code,rec.blob);sent.current={blob:rec.blob,id};return id},[rec]);
 return {rec,set,clear,upload};
}

function readMode():'write'|'speak'{try{return localStorage.getItem(MODE_KEY)==='speak'?'speak':'write'}catch{return 'write'}}
function readSpeech(lang:Language):'en'|'ar'{try{const v=localStorage.getItem(SPEECH_KEY);if(v==='en'||v==='ar')return v}catch{}return lang==='ar'?'ar':'en'}
const cheers:[string,string][]=[['Speak like you are telling a friend 😊','تحدّث كأنك تخبر صديقاً 😊'],['Take your time — you can fix words after','خذ وقتك، يمكنك تصحيح الكلمات بعد ذلك'],['Great! Keep going 🎉','رائع! استمر 🎉'],['Say why it matters 💡','قل لماذا هي مهمة 💡']];

/** Write / Speak switch around a text box (passed as children). `value`/`onChange` are the text box's state. */
export function VoiceInput({lang,value,onChange,voice,max=1500,children}:{lang:Language;value:string;onChange:(text:string)=>void;voice:VoiceNote;max?:number;children:React.ReactNode}){
 const [mode,setModeState]=useState<'write'|'speak'>(readMode),[speech,setSpeechState]=useState<'en'|'ar'>(()=>readSpeech(lang)),[state,setState]=useState<'idle'|'starting'|'recording'>('idle'),[seconds,setSeconds]=useState(0),[error,setError]=useState(''),[note,setNote]=useState('');
 const t=(en:string,ar:string)=><T en={en} ar={ar} lang={lang}/>;
 const live=useRef({onChange,value,max});useEffect(()=>{live.current={onChange,value,max}});
 const session=useRef<{recorder:MediaRecorder;stream:MediaStream;audio:AudioContext|null;recognizer:Recognizer|null;frame:number;timer:ReturnType<typeof setInterval>;started:number;base:string;committed:string;spoken:string;listening:boolean;captions:boolean}|null>(null);
 const meter=useRef<HTMLDivElement>(null);
 const setMode=(m:'write'|'speak')=>{setModeState(m);try{localStorage.setItem(MODE_KEY,m)}catch{}};
 const setSpeech=(s:'en'|'ar')=>{setSpeechState(s);try{localStorage.setItem(SPEECH_KEY,s)}catch{}};
 const emit=(spoken:string)=>{const s=session.current;if(!s)return;s.spoken=spoken;const text=(s.base?s.base+(spoken?'\n':''):'')+spoken;live.current.onChange(text.slice(0,live.current.max))};
 const fallback=useCallback(()=>{if(!live.current.value.trim())live.current.onChange(say(lang,'🎙️ Voice note','🎙️ ملاحظة صوتية'))},[lang]);

 const finish=useCallback(()=>{const s=session.current;if(!s)return;session.current=null;clearInterval(s.timer);cancelAnimationFrame(s.frame);void s.audio?.close().catch(()=>{});s.listening=false;
  try{if(s.recorder.state!=='inactive')s.recorder.stop()}catch{/* already stopped */}
  if(s.recognizer){try{s.recognizer.stop()}catch{/* already stopped */}}
  setState('idle');
  // Late captions may still arrive; give them a moment before deciding the text box needs a placeholder.
  setTimeout(()=>{if(!s.spoken.trim()&&!s.base.trim())fallback()},s.captions?1500:0);
 },[fallback]);

 useEffect(()=>()=>{const s=session.current;if(!s)return;session.current=null;clearInterval(s.timer);cancelAnimationFrame(s.frame);void s.audio?.close().catch(()=>{});try{s.recorder.stop()}catch{}s.stream.getTracks().forEach(x=>x.stop());try{s.recognizer?.abort()}catch{}},[]);

 async function start(){
  setError('');setNote('');
  if(typeof navigator==='undefined'||!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==='undefined'){setError(say(lang,'This browser cannot record audio. Please write your answer instead.','لا يستطيع هذا المتصفح تسجيل الصوت. يرجى كتابة إجابتك بدلاً من ذلك.'));return}
  setState('starting');
  let stream:MediaStream;
  try{stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true}})}
  catch(e){setState('idle');const name=(e as Error).name;setError(name==='NotAllowedError'||name==='SecurityError'?say(lang,'Microphone access is blocked. Tap the lock icon in the address bar, allow the microphone, then try again.','الوصول إلى الميكروفون محظور. اضغط على أيقونة القفل في شريط العنوان، واسمح بالميكروفون، ثم حاول مجدداً.'):say(lang,'No microphone was found. Please check your device or write instead.','لم يتم العثور على ميكروفون. تحقق من جهازك أو اكتب بدلاً من ذلك.'));return}
  const mime=['audio/webm;codecs=opus','audio/mp4','audio/ogg;codecs=opus','audio/webm'].find(type=>MediaRecorder.isTypeSupported?.(type));
  let recorder:MediaRecorder;try{recorder=new MediaRecorder(stream,{...(mime?{mimeType:mime}:{}),audioBitsPerSecond:32000})}catch{recorder=new MediaRecorder(stream)}
  const chunks:Blob[]=[];const started=Date.now();
  recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
  recorder.onstop=()=>{stream.getTracks().forEach(x=>x.stop());const blob=new Blob(chunks,{type:(recorder.mimeType||mime||'audio/webm').split(';')[0]});if(!blob.size)return;if(blob.size>MAX_BYTES){setError(say(lang,'This voice note is too long. Please record a shorter one.','هذه الملاحظة الصوتية طويلة جداً. يرجى تسجيل ملاحظة أقصر.'));return}voice.set({blob,url:URL.createObjectURL(blob),seconds:Math.round((Date.now()-started)/1000)})};
  recorder.start(1000);
  // A live sound meter, so people can see the app hears them.
  let audio:AudioContext|null=null,frame=0;
  try{const Ctx=window.AudioContext||(window as unknown as {webkitAudioContext:typeof AudioContext}).webkitAudioContext;audio=new Ctx();void audio.resume?.().catch(()=>{});const analyser=audio.createAnalyser();analyser.fftSize=256;audio.createMediaStreamSource(stream).connect(analyser);const buf=new Uint8Array(analyser.fftSize);
   const tick=()=>{analyser.getByteTimeDomainData(buf);let sum=0;for(const v of buf)sum+=(v-128)*(v-128);const level=Math.min(1,Math.sqrt(sum/buf.length)/40);meter.current?.style.setProperty('--level',level.toFixed(2));frame=requestAnimationFrame(tick);if(session.current)session.current.frame=frame};frame=requestAnimationFrame(tick)}catch{audio=null}
  const timer=setInterval(()=>{const s=(Date.now()-started)/1000;setSeconds(s);if(s>=MAX_SECONDS)finish()},250);
  const base=live.current.value.trim();
  session.current={recorder,stream,audio,recognizer:null,frame,timer,started,base,committed:'',spoken:'',listening:true,captions:false};
  setSeconds(0);voice.set(null);setState('recording');
  const Speech=recognizerClass();
  if(!Speech){setNote(say(lang,'Your voice is being recorded. This browser cannot turn speech into text, so add a few words after you stop.','يتم تسجيل صوتك. لا يستطيع هذا المتصفح تحويل الكلام إلى نص، لذا أضف بعض الكلمات بعد التوقف.'));return}
  // Android repeats text in continuous mode, so it listens phrase by phrase and restarts.
  const android=/Android/i.test(navigator.userAgent);
  const listen=()=>{const s=session.current;if(!s||!s.listening)return;const r=new Speech();r.lang=speech==='ar'?'ar-OM':'en-US';r.continuous=!android;r.interimResults=true;
   let heard='';
   r.onresult=e=>{let finals='',interim='';for(let i=0;i<e.results.length;i++){const x=e.results[i];if(x.isFinal)finals+=(finals?' ':'')+x[0].transcript.trim();else interim+=x[0].transcript}heard=finals;const cur=session.current||s;emit([cur.committed,finals,interim.trim()].filter(Boolean).join(' '))};
   r.onerror=e=>{if(e.error==='not-allowed'||e.error==='service-not-allowed'||e.error==='network'||e.error==='language-not-supported'){s.captions=false;s.listening=false;setNote(say(lang,'Your voice is being recorded, but live captions are not available here. Add a few words after you stop.','يتم تسجيل صوتك، لكن الكتابة التلقائية غير متاحة هنا. أضف بعض الكلمات بعد التوقف.'))}};
   r.onend=()=>{if(heard)s.committed=[s.committed,heard].filter(Boolean).join(' ');heard='';if(session.current===s&&s.listening){try{listen()}catch{/* give up captions */}}};
   s.recognizer=r;s.captions=true;try{r.start()}catch{s.captions=false}};
  listen();
 }

 const recording=state==='recording';
 return <div className={'voice-input'+(mode==='speak'?' speaking':'')}>
  <div className="voice-mode" role="group" aria-label={say(lang,'How do you want to answer?','كيف تريد أن تجيب؟')}>
   <button type="button" aria-pressed={mode==='write'} className={mode==='write'?'on':''} disabled={recording} onClick={()=>setMode('write')}><PenLine size={17}/>{t('Write','اكتب')}</button>
   <button type="button" aria-pressed={mode==='speak'} className={mode==='speak'?'on':''} onClick={()=>setMode('speak')}><Mic size={17}/>{t('Speak','تحدّث')}</button>
  </div>
  {mode==='speak'&&<div className={'voice-panel'+(recording?' live':'')}>
   {!recording&&<div className="voice-lang" role="group" aria-label={say(lang,'I will speak in','سأتحدث باللغة')}><span className="muted">{t('I will speak in','سأتحدث بـ')}</span><button type="button" aria-pressed={speech==='en'} onClick={()=>setSpeech('en')}>English</button><button type="button" aria-pressed={speech==='ar'} onClick={()=>setSpeech('ar')}>العربية</button></div>}
   <div className="voice-stage" ref={meter}>
    <button type="button" className="voice-button" disabled={state==='starting'} onClick={()=>recording?finish():void start()} aria-label={recording?say(lang,'Stop recording','أوقف التسجيل'):say(lang,'Start recording','ابدأ التسجيل')}>
     <span className="voice-ring" aria-hidden="true"/>{recording?<Square size={30} fill="currentColor"/>:<Mic size={36}/>}
    </button>
    <div className="voice-status" aria-live="polite">
     {recording?<><strong className="voice-clock"><span className="voice-dot" aria-hidden="true"/>{clock(seconds,lang)} <small className="muted">/ {clock(MAX_SECONDS,lang)}</small></strong><span className="voice-bars" aria-hidden="true"><i/><i/><i/><i/><i/></span><small>{t(...cheers[Math.floor(seconds/6)%cheers.length])}</small><small className="muted">{t('Tap the square to stop','اضغط على المربع للتوقف')}</small></>
     :state==='starting'?<strong>{t('Getting the microphone ready…','جارٍ تجهيز الميكروفون…')}</strong>
     :voice.rec?<><strong>{t('Nice! Your voice is saved below 🎉','رائع! حُفظ صوتك في الأسفل 🎉')}</strong><small className="muted">{t('Check the words in the box, then send. Tap the mic to record again.','راجع الكلمات في المربع ثم أرسل. اضغط على الميكروفون للتسجيل مجدداً.')}</small></>
     :<><strong>{t('Tap the mic and say your idea','اضغط على الميكروفون وقل فكرتك')}</strong><small className="muted">{t('Your words appear in the box as you talk. Your voice is kept too.','تظهر كلماتك في المربع أثناء حديثك، ويُحفظ صوتك أيضاً.')}</small></>}
    </div>
   </div>
   {note&&<p className="voice-note-hint" role="status">{note}</p>}
  </div>}
  {error&&<div role="alert" className="error">{error}</div>}
  {children}
  {voice.rec&&!recording&&<div className="voice-attached"><Headphones size={18} aria-hidden="true"/><span className="voice-attached-label">{t('Your voice note','ملاحظتك الصوتية')} · {clock(voice.rec.seconds,lang)}</span><audio controls preload="metadata" src={voice.rec.url}/><button type="button" className="btn small ghost" onClick={()=>{setMode('speak');void start()}}><RotateCcw size={15}/>{t('Record again','سجّل مجدداً')}</button><button type="button" className="btn small ghost" onClick={()=>voice.clear()}><Trash2 size={15}/>{t('Remove voice','احذف الصوت')}</button></div>}
 </div>;
}

/** Plays a voice note saved with a contribution. */
export function VoicePlayer({id,lang}:{id?:string|null;lang:Language}){
 if(!id)return null;
 return <div className="voice-player"><span className="voice-player-label"><Mic size={14} aria-hidden="true"/><T en="Voice note" ar="ملاحظة صوتية" lang={lang}/></span><audio controls preload="none" src={appUrl('/api/upload?id=')+id}/></div>;
}
