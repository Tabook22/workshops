import assert from 'node:assert/strict';
// Speaking turns at the team table: a raised hand gets the floor automatically when nobody is speaking,
// "done" passes it to the next hand, the leader can add a minute, end a turn, and switch automatic turns off.
// Uses disposable workshops on a local test server; never run it against a live audience workshop.
const origin=process.env.WORKSHOP_TEST_ORIGIN||'http://127.0.0.1:3800/workshops';
function client(){const cookies=new Map();const header=()=>[...cookies].map(([k,v])=>k+'='+v).join('; ');const keep=res=>{for(const c of res.headers.getSetCookie()){const pair=c.split(';')[0];cookies.set(pair.slice(0,pair.indexOf('=')),pair.slice(pair.indexOf('=')+1));}};return {
 async request(body,expected=200,path='/api/workshop'){const res=await fetch(origin+path,{method:'POST',headers:{'content-type':'application/json',cookie:header()},body:JSON.stringify(body)});keep(res);const json=await res.json();if(expected<300)assert.ok(res.ok,body.action+': '+res.status+' '+JSON.stringify(json));else assert.equal(res.status,expected,body.action+': '+JSON.stringify(json));return json},
 table(body,expected=200){return this.request(body,expected,'/api/room-experience')},
 async seats(code){const res=await fetch(origin+'/api/room-experience?code='+code,{headers:{cookie:header()}});const json=await res.json();assert.ok(res.ok,JSON.stringify(json));return json}};}
const presenter=client(),lead=client(),bob=client(),carol=client();
const {code}=await presenter.request({action:'create',name:'Turns verification',challenge:'Turns',question:'Who speaks next?'});
await presenter.request({action:'control',code,patch:{teamRooms:true}});
for(const [c,n] of [[lead,'QA Lead'],[bob,'QA Bob'],[carol,'QA Carol']])await c.request({action:'join',code,nickname:n});
const room=(await lead.request({action:'createRoom',code,name:'Talkers',challenge:'Talk'})).code;
for(const c of [bob,carol])await c.request({action:'joinRoom',code:room});
const who=async(c=lead)=>{const t=await c.seats(room);return {speaker:t.members.find(m=>m.speaking)?.name||null,queue:t.members.filter(m=>m.hand).sort((a,b)=>a.hand-b.hand).map(m=>m.name),until:t.members.find(m=>m.speaking)?.until||null,auto:t.autoTurns,generated:t.generated}};

// Automatic turns (default): Bob raises his hand and gets the floor at once; Carol waits.
assert.equal((await who()).auto,true);
await bob.table({action:'hand',code:room,raised:true});
let s=await who();assert.equal(s.speaker,'QA Bob');assert.deepEqual(s.queue,[]);assert.ok(s.until-s.generated>110000&&s.until-s.generated<=120000,'a two-minute turn');
await carol.table({action:'hand',code:room,raised:true});
s=await who(carol);assert.equal(s.speaker,'QA Bob');assert.deepEqual(s.queue,['QA Carol']);

// Only the leader adds time; Bob's "done" passes the floor to Carol.
await bob.table({action:'extend',code:room},403);
const before=(await who()).until;await lead.table({action:'extend',code:room});assert.ok((await who()).until-before>=59000,'one more minute');
await bob.table({action:'done',code:room});
s=await who();assert.equal(s.speaker,'QA Carol');assert.deepEqual(s.queue,[]);

// Turning automatic turns off: ending Carol's turn leaves Bob's raised hand waiting for the leader.
await bob.table({action:'turns',code:room,auto:false},403);
await lead.table({action:'turns',code:room,auto:false});
await bob.table({action:'hand',code:room,raised:true});
await lead.table({action:'speaker',code:room,seat:null});
s=await who();assert.equal(s.auto,false);assert.equal(s.speaker,null);assert.deepEqual(s.queue,['QA Bob']);
// Switching it back on gives Bob the floor straight away.
await lead.table({action:'turns',code:room,auto:true});
s=await who();assert.equal(s.speaker,'QA Bob');
await presenter.request({action:'control',code,patch:{ended:true}}).catch(()=>{});
console.log('PASS: automatic first turn, queue order, leader-only extend and settings, done passes the floor, manual mode, re-enabling on',room);
