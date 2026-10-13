import assert from 'node:assert/strict';
const origin=process.env.WORKSHOP_TEST_ORIGIN||'http://127.0.0.1:3823/workshops';
if(!['127.0.0.1','localhost','[::1]'].includes(new URL(origin).hostname))throw Error('Translation verification requires localhost.');
function client(){const cookies=new Map();return{async action(body,status=200){const r=await fetch(origin+'/api/workshop',{method:'POST',headers:{'content-type':'application/json',cookie:[...cookies].map(([k,v])=>k+'='+v).join('; ')},body:JSON.stringify(body)});for(const c of r.headers.getSetCookie()){const p=c.split(';')[0],n=p.indexOf('=');cookies.set(p.slice(0,n),p.slice(n+1))}const d=await r.json();assert.equal(r.status,status,JSON.stringify(d));return d},async get(code){return(await fetch(origin+'/api/workshop?code='+code,{headers:{cookie:[...cookies].map(([k,v])=>k+'='+v).join('; ')}})).json()},async translate(body,status=200){const r=await fetch(origin+'/api/translate',{method:'POST',headers:{'content-type':'application/json',cookie:[...cookies].map(([k,v])=>k+'='+v).join('; ')},body:JSON.stringify(body)});const d=await r.json();assert.equal(r.status,status,JSON.stringify(d));return d}}}
const presenter=client(),alice=client(),bob=client(),stranger=client();
const {code}=await presenter.action({action:'create',name:'Translation QA',challenge:'Smart Tutor',question:'How can we help 19 students learn at home?',description:'Work together in 5 minutes',showOnJoinPage:true,teamRooms:true,moderated:true},201);
try{
 await presenter.action({action:'control',code,patch:{broadcast:'Choose your best idea in 5 minutes',canvas:{Problem:'Students need homework support'},prompt:'Build an accessible learning app'}});
 await alice.action({action:'join',code,nickname:'QA Alice'},201);await bob.action({action:'join',code,nickname:'QA Bob'},201);
 await presenter.action({action:'control',code,patch:{stage:1}});
 await alice.action({action:'submit',code,id:crypto.randomUUID(),title:'Private pending idea',text:'My private pending note'},201);
 let d=await bob.translate({code,target:'ar',texts:['Private pending idea','My private pending note','How can we help 19 students learn at home?']});
 assert.equal(d.translations['Private pending idea'],undefined,'no pending text leaked to another member');assert.equal(d.translations['My private pending note'],undefined);
 if(process.env.TRANSLATION_EXPECT_ENABLED==='1'){
  assert.equal(d.enabled,true);assert.ok(d.translations['How can we help 19 students learn at home?']);
  d=await alice.translate({code,target:'ar',texts:['Private pending idea','My private pending note','Choose your best idea in 5 minutes','Students need homework support','Build an accessible learning app']});
  for(const text of ['Private pending idea','My private pending note','Choose your best idea in 5 minutes','Students need homework support','Build an accessible learning app'])assert.ok(d.translations[text],'translate visible '+text);
  const a=await alice.get(code);assert.equal(a.config.question,'How can we help 19 students learn at home?','stored original unchanged');assert.equal(a.ideas[0].text,'My private pending note');
  await presenter.action({action:'control',code,patch:{question:'كيف نساعد الطلاب على التعلم في المنزل؟'}});
  d=await bob.translate({code,target:'en',texts:['كيف نساعد الطلاب على التعلم في المنزل؟']});assert.ok(d.translations['كيف نساعد الطلاب على التعلم في المنزل؟']);
  const directory=await stranger.translate({directory:true,target:'ar',texts:['Smart Tutor','Students need homework support']});assert.ok(directory.translations['Smart Tutor']);assert.equal(directory.translations['Students need homework support'],undefined,'directory allows names/challenges only');
 }else assert.equal(d.enabled,false,'explicit disabled status');
 const {codes:[room]}=await presenter.action({action:'createRoom',code,name:'Hidden team'},201);
 await presenter.action({action:'control',code:room,patch:{visibility:'private',canvas:{Problem:'Secret team project'}}});
 await alice.action({action:'joinRoom',code:room,nickname:'QA Alice'},201);
 await presenter.action({action:'control',code:room,patch:{stage:1,moderated:false}});
 await alice.action({action:'submit',code:room,id:crypto.randomUUID(),text:'Private room approved content'},201);
 d=await stranger.translate({code:room,target:'ar',texts:['Private room approved content','Secret team project']});
 assert.deepEqual(d.translations,{},'locked room content is not translation-authorized');
 await stranger.translate({account:true,target:'ar',texts:['Smart Tutor']},403);
 await stranger.translate({code,target:'xx',texts:['Smart Tutor']},400);
 await stranger.translate({code:'UTAS-NOTFOUND',target:'ar',texts:['Smart Tutor']},404);
 const foreign=await fetch(origin+'/api/translate',{method:'POST',headers:{'content-type':'application/json',origin:'https://attacker.invalid'},body:JSON.stringify({code,target:'ar',texts:['Smart Tutor']})});assert.equal(foreign.status,403);
 console.log('PASS: translation state, both directions, notes/canvas/prompt, own pending contributions, private-room authorization, directory scope, invalid requests, and original preservation.');
}finally{await presenter.action({action:'deleteWorkshop',code,confirm:code})}
