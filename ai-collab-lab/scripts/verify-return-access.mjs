import assert from 'node:assert/strict';
// Coming back to a workshop: a long-lived participant cookie, "my workshops", entering your room on a new browser,
// leaving and switching rooms (past contributions stay), and the presenter's team lock.
// Uses disposable workshops on a local test server; never run it against a live audience workshop.
// VPS preview: WORKSHOP_TEST_ORIGIN=http://127.0.0.1:3800/workshops node scripts/verify-return-access.mjs
const origin=process.env.WORKSHOP_TEST_ORIGIN||'http://127.0.0.1:5173';
// Each run uses its own client address so failed return-code attempts from earlier runs never trip the rate limit.
const run=1+Math.floor(Math.random()*250);
function client(ip='198.51.100.'+run){const cookies=new Map();const header=()=>[...cookies].map(([k,v])=>k+'='+v).join('; ');const keep=res=>{const set=res.headers.getSetCookie();for(const c of set){const pair=c.split(';')[0];const name=pair.slice(0,pair.indexOf('='));const value=pair.slice(pair.indexOf('=')+1);if(/Max-Age=0\b/.test(c)||!value)cookies.delete(name);else cookies.set(name,value);}return set;};
 return {cookies,lastSet:[],async request(body,expected=200){const res=await fetch(origin+'/api/workshop',{method:'POST',headers:{'content-type':'application/json','x-real-ip':ip,cookie:header()},body:JSON.stringify(body)});this.lastSet=keep(res);const json=await res.json();assert.equal(res.status,expected,body.action+': '+JSON.stringify(json));return json},
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


// 7. Personal return codes: shown once at join, stored only as a hash, restore identity and team on any device.
const carol=client();const joined=await carol.request({action:'join',code,nickname:'QA Carol'},201);
const CODE=/^[2-9A-HJKMNP-TW-Z]{2}-[2-9A-HJKMNP-TW-Z]{4}$/;assert.match(joined.returnCode,CODE);
await carol.request({action:'joinRoom',code:r1},201);const carolId=(await carol.get(code)).me.id,carolRoomId=(await carol.get(r1)).me.id;
// Typed loosely on a phone: lower case, a space instead of the dash.
const phone=client();const back=await phone.request({action:'restore',returnCode:' '+joined.returnCode.toLowerCase().replace('-',' ')});
assert.deepEqual([back.code,back.room,back.nickname],[code,r1,'QA Carol']);
assert.equal((await phone.get(code)).me.id,carolId,'same main identity');assert.equal((await phone.get(r1)).me.id,carolRoomId,'same room identity, straight into the room');
assert.equal((await phone.mine())[0].room.code,r1);
// Arabic-Indic digits are accepted.
const arabic=joined.returnCode.replace(/[0-9]/g,d=>'٠١٢٣٤٥٦٧٨٩'[d]);assert.equal((await client().request({action:'restore',returnCode:arabic})).code,code);
// Wrong and malformed codes.
await client().request({action:'restore',returnCode:'ZZ-ZZZZ'},404);await client().request({action:'restore',returnCode:'abc'},400);
// The code is never stored or returned in clear.
for(const json of [await presenter.get(code),await presenter.get(r1),await carol.get(code)]){const text=JSON.stringify(json);assert.ok(!text.includes(joined.returnCode)&&!text.includes(joined.returnCode.replace('-',''))&&!text.includes('returnHash'),'no code or hash in snapshots');}
const report=await fetch(origin+'/api/participants?code='+code,{headers:{cookie:[...presenter.cookies].map(([k,v])=>k+'='+v).join('; ')}}).then(r=>r.text());assert.ok(!report.includes('returnHash')&&!report.includes(joined.returnCode.replace('-','')));
// A participant makes a new code; the old one stops working.
const renewed=await carol.request({action:'returnCode',code});assert.match(renewed.returnCode,CODE);assert.notEqual(renewed.returnCode,joined.returnCode);
await client().request({action:'restore',returnCode:joined.returnCode},404);await carol.request({action:'returnCode',code:r1},400);await client().request({action:'returnCode',code},401);
// The presenter reissues; only the presenter can.
await alice.request({action:'reissueCode',code,participant:carolId},403);await presenter.request({action:'reissueCode',code,participant:'nobody'},404);
const reissued=await presenter.request({action:'reissueCode',code,participant:carolId});assert.equal(reissued.nickname,'QA Carol');
await client().request({action:'restore',returnCode:renewed.returnCode},404);assert.equal((await client().request({action:'restore',returnCode:reissued.returnCode})).room,r1);
// Someone who arrives through a room link gets a code too.
const dana=client();const viaRoom=await dana.request({action:'joinRoom',code:r2,nickname:'QA Dana'},201);assert.match(viaRoom.returnCode,CODE);
assert.equal((await client().request({action:'restore',returnCode:viaRoom.returnCode})).room,r2);
// "Not you?" forgets this browser's identity for the workshop and its rooms.
await phone.request({action:'forgetMe',code:r1});assert.equal((await phone.get(code)).me,null);assert.equal((await phone.get(r1)).me,null);assert.deepEqual(await phone.mine(),[]);
// Rate limit: after 30 failures from one address, even a correct code waits; other addresses are unaffected.
const guesser=client('192.0.2.'+run);for(let i=0;i<30;i++)await guesser.request({action:'restore',returnCode:'QQ-QQ'+'23456789ABCDEFGHJKMNPQRSTWXYZ'[i%29]+'2'},404);
await guesser.request({action:'restore',returnCode:reissued.returnCode},429);assert.equal((await client().request({action:'restore',returnCode:reissued.returnCode})).code,code);

// 8. Optional "Protect my account" (code mode): username + PIN, unique per workshop, hashed, rate limited per username.
assert.equal((await carol.get(code)).me.username,null);
await carol.request({action:'protect',code,username:'ab',pin:'1234'},400);await carol.request({action:'protect',code,username:'carol.k',pin:'12'},400);await carol.request({action:'protect',code,username:'carol.k',pin:'1234567'},400);
assert.equal((await carol.request({action:'protect',code,username:' Carol.K ',pin:'٢٤٦٨'})).username,'carol.k');
assert.equal((await carol.get(code)).me.username,'carol.k');assert.equal((await carol.get(r1)).me.username,'carol.k','the room page knows the account too');
await dana.request({action:'protect',code,username:'CAROL.K',pin:'1111'},409);
const laptop=client();const signedIn=await laptop.request({action:'restorePin',code,username:'carol.k',pin:'2468'});assert.deepEqual([signedIn.code,signedIn.room],[code,r1]);
assert.equal((await laptop.get(r1)).me.id,carolRoomId);
// Restoring from a room code works too (the account belongs to the main workshop).
assert.equal((await client().request({action:'restorePin',code:r1,username:'carol.k',pin:'2468'})).code,code);
for(const json of [await presenter.get(code),await carol.get(code)])assert.ok(!JSON.stringify(json).includes('pinHash')&&!JSON.stringify(json).includes('2468'));
// Five wrong PINs for one username: that username waits, even with the right PIN; other usernames are fine.
const pinGuesser=client('192.0.2.'+((run%250)+1));for(const p of ['0000','1111','2222','3333','4444'])await pinGuesser.request({action:'restorePin',code,username:'carol.k',pin:p},404);
await client().request({action:'restorePin',code,username:'carol.k',pin:'2468'},429);
await carol.request({action:'protect',code,username:'carol.two',pin:'9753'});assert.equal((await client().request({action:'restorePin',code,username:'carol.two',pin:'9753'})).code,code);
await client().request({action:'restorePin',code,username:'nobody',pin:'1234'},404);

// 9. Presenter setting: require username + PIN when joining.
await presenter.request({action:'control',code,patch:{returnMode:'pin'}});assert.equal((await presenter.get(code)).config.returnMode,'pin');assert.equal((await presenter.get(r1)).parent.returnMode,'pin');
const erin=client();await erin.request({action:'join',code,nickname:'QA Erin'},400);await erin.request({action:'join',code,nickname:'QA Erin',username:'carol.two',pin:'1234'},409);
const erinJoin=await erin.request({action:'join',code,nickname:'QA Erin',username:'erin',pin:'4321'},201);assert.equal(erinJoin.returnCode,undefined,'no return code handed out in PIN mode');assert.equal(erinJoin.username,'erin');
// Joining through a room link asks for them too.
await client().request({action:'joinRoom',code:r2,nickname:'QA Fay'},400);const fay=client();assert.equal((await fay.request({action:'joinRoom',code:r2,nickname:'QA Fay',username:'fay',pin:'5555'},201)).returnCode,undefined);
assert.equal((await client().request({action:'restorePin',code,username:'fay',pin:'5555'})).room,r2);
// The presenter can still issue a return code for someone who forgot their PIN.
const erinId=(await erin.get(code)).me.id;const rescue=await presenter.request({action:'reissueCode',code,participant:erinId});assert.equal((await client().request({action:'restore',returnCode:rescue.returnCode})).nickname,'QA Erin');
await presenter.request({action:'control',code,patch:{returnMode:'code'}});assert.match((await client().request({action:'join',code,nickname:'QA Gus'},201)).returnCode,CODE);

await presenter.request({action:'deleteWorkshop',code,confirm:code});
console.log('Return access verified: 180-day cookie, my workshops, room re-entry, leave/switch with kept contributions, team lock, return codes (hash-only, restore, renew, reissue, sign-out, rate limit), username + PIN (optional and required modes, uniqueness, per-username limit).');
