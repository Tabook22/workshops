import assert from 'node:assert/strict';
// Coming back to a workshop: a long-lived participant cookie, "my workshops", entering your room on a new browser,
// leaving and switching rooms (past contributions stay), and the presenter's team lock.
// Uses disposable workshops on a local test server; never run it against a live audience workshop.
// VPS preview: WORKSHOP_TEST_ORIGIN=http://127.0.0.1:3800/workshops node scripts/verify-return-access.mjs
const origin=process.env.WORKSHOP_TEST_ORIGIN||'http://127.0.0.1:5173';
function client(){const cookies=new Map();const header=()=>[...cookies].map(([k,v])=>k+'='+v).join('; ');const keep=res=>{const set=res.headers.getSetCookie();for(const c of set){const pair=c.split(';')[0];const name=pair.slice(0,pair.indexOf('='));const value=pair.slice(pair.indexOf('=')+1);if(/Max-Age=0\b/.test(c)||!value)cookies.delete(name);else cookies.set(name,value);}return set;};
 return {cookies,lastSet:[],async request(body,expected=200){const res=await fetch(origin+'/api/workshop',{method:'POST',headers:{'content-type':'application/json',cookie:header()},body:JSON.stringify(body)});this.lastSet=keep(res);const json=await res.json();assert.equal(res.status,expected,body.action+': '+JSON.stringify(json));return json},
  async get(code,expected=200){const res=await fetch(origin+'/api/workshop?code='+code,{headers:{cookie:header()}});this.lastSet=keep(res);assert.equal(res.status,expected);return res.json()},
  async mine(){const res=await fetch(origin+'/api/workshop?mine=1',{headers:{cookie:header()}});assert.equal(res.status,200);return (await res.json()).workshops}};}
const presenter=client(),alice=client(),bob=client();
if(process.env.WORKSHOP_PRESENTER_PASSWORD){const r=await fetch(origin+'/api/account',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:process.env.WORKSHOP_PRESENTER_USERNAME||'nasser',password:process.env.WORKSHOP_PRESENTER_PASSWORD})});assert.equal(r.status,200);for(const c of r.headers.getSetCookie()){const pair=c.split(';')[0];presenter.cookies.set(pair.slice(0,pair.indexOf('=')),pair.slice(pair.indexOf('=')+1));}}

const {code}=await presenter.request({action:'create',name:'Return verification',challenge:'Smart Campus',question:'How can we improve campus life?',teamRooms:true},201);
const {codes:[r1,r2]}=await presenter.request({action:'createRoom',code,names:['Falcon','Oryx']},201);

// 1. The participant cookie lasts a whole course (180 days), not a week.
await alice.request({action:'join',code,nickname:'QA Alice'},201);
const age=Number(/Max-Age=(\d+)/.exec(alice.lastSet.find(c=>c.startsWith('student_'+code+'='))||'')?.[1]);
assert.ok(age>=180*24*3600,'participant cookie lasts 180 days, got '+age);
// Every visit renews it.
await alice.get(code);assert.ok(alice.lastSet.some(c=>c.startsWith('student_'+code+'=')&&/Max-Age=15552000/.test(c)),'a visit renews the cookie');
await alice.request({action:'joinRoom',code:r1},201);

// 2. "My workshops" lists what this browser joined, with the current team, and nothing for strangers.
let mine=await alice.mine();assert.equal(mine.length,1);assert.equal(mine[0].code,code);assert.equal(mine[0].nickname,'QA Alice');assert.deepEqual(mine[0].room,{code:r1,name:'Falcon'});
assert.deepEqual(await bob.mine(),[]);

// 3. Same identity without the room cookie (as on a fresh browser restored from the main cookie): entering the room reuses the membership.
const fresh=client();fresh.cookies.set('student_'+code,alice.cookies.get('student_'+code));
let roomView=await fresh.get(r1);assert.equal(roomView.me,null);assert.equal(roomView.team,r1,'the room knows this is the viewer’s own team');assert.equal(roomView.viewer.nickname,'QA Alice');
assert.equal((await fresh.request({action:'joinRoom',code:r1})).code,r1);
roomView=await fresh.get(r1);assert.equal(roomView.me.role,'lead');assert.equal(roomView.me.id,(await alice.get(r1)).me.id,'same room identity as before');

// 4. Leave from the main workshop ("My room"): membership ends, contributions stay attributed.
await presenter.request({action:'control',code:r1,patch:{stage:2}});
const idea=crypto.randomUUID();await alice.request({action:'submit',code:r1,id:idea,text:'Smart parking sensors'},201);
assert.deepEqual((await alice.request({action:'leaveRoom',code})).left,r1);
assert.equal((await alice.get(code)).me.room,null);assert.equal((await alice.get(r1)).me.role,'guest');
const kept=(await presenter.get(r1)).ideas.find(i=>i.id===idea);assert.ok(kept,'the idea stays in the room');assert.equal(kept.nickname,'QA Alice');assert.equal(kept.status,'approved');
assert.equal((await alice.mine())[0].room,null);
// Leaving with no team is harmless.
assert.equal((await alice.request({action:'leaveRoom',code})).left,null);

// 5. Switch: joining another room moves the membership.
await alice.request({action:'joinRoom',code:r1});await alice.request({action:'joinRoom',code:r2},201);
assert.equal((await alice.get(code)).me.room,r2);assert.equal((await alice.get(r1)).me.role,'guest');

// 6. Locked teams: nobody leaves or switches on their own; a student without a team may still choose one.
await presenter.request({action:'control',code,patch:{lockTeams:true}});
const main=await alice.get(code);assert.equal(main.config.lockTeams,true);assert.equal((await alice.get(r2)).parent.lockTeams,true);
await alice.request({action:'leaveRoom',code},403);await alice.request({action:'leaveRoom',code:r2},403);
await alice.request({action:'joinRoom',code:r1},403);await alice.request({action:'createRoom',code,name:'Escape'},403);
assert.equal((await alice.get(code)).me.room,r2,'still in the same team');
await bob.request({action:'join',code,nickname:'QA Bob'},201);await bob.request({action:'joinRoom',code:r1},201);assert.equal((await bob.get(code)).me.room,r1);
await bob.request({action:'joinRoom',code:r2},403);
// Visiting stays possible, and unlocking restores self-service.
await alice.request({action:'joinRoom',code:r1,role:'guest'});
await presenter.request({action:'control',code,patch:{lockTeams:false}});
await alice.request({action:'leaveRoom',code});assert.equal((await alice.get(code)).me.room,null);

await presenter.request({action:'deleteWorkshop',code,confirm:code});
console.log('Return access verified: 180-day cookie, my workshops, room re-entry, leave/switch with kept contributions, team lock.');
