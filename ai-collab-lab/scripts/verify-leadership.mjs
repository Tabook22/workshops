import assert from 'node:assert/strict';
// Disposable local workshops only. Never point this verifier at a live event.
const origin=process.env.WORKSHOP_TEST_ORIGIN||'http://127.0.0.1:3817/workshops';
if(!['127.0.0.1','localhost','[::1]'].includes(new URL(origin).hostname))throw new Error('Leadership verification requires a local test server.');
function client(){const cookies=new Map();return {
 async request(body,status=200){const res=await fetch(origin+'/api/workshop',{method:'POST',headers:{'content-type':'application/json',cookie:[...cookies].map(([k,v])=>k+'='+v).join('; ')},body:JSON.stringify(body)});for(const raw of res.headers.getSetCookie()){const pair=raw.split(';')[0],i=pair.indexOf('=');cookies.set(pair.slice(0,i),pair.slice(i+1));}const data=await res.json();assert.equal(res.status,status,body.action+': '+JSON.stringify(data));return data},
 async get(code){const res=await fetch(origin+'/api/workshop?code='+code,{headers:{cookie:[...cookies].map(([k,v])=>k+'='+v).join('; ')}});assert.equal(res.status,200);return res.json()}
};}
const presenter=client(),alice=client(),bob=client(),carol=client(),visitor=client(),stranger=client();
const {code}=await presenter.request({action:'create',name:'Leadership QA',teamRooms:true},201);
try {
 const {codes:[r1,r2]}=await presenter.request({action:'createRoom',code,names:['Election team','Other team']},201);
 await presenter.request({action:'control',code:r2,patch:{joining:'invite'}});
 const countBefore=(await presenter.get(code)).stats.participants;
 await stranger.request({action:'joinRoom',code:r2,nickname:'Rejected invitation'},403);
 assert.equal((await presenter.get(code)).stats.participants,countBefore,'rejected invitations do not create phantom participants');
 await presenter.request({action:'control',code:r2,patch:{joining:'open'}});
 const {codes:[concurrentRoom]}=await presenter.request({action:'createRoom',code,name:'Simultaneous join test'},201);
 const first=client(),second=client();
 await Promise.all([first.request({action:'joinRoom',code:concurrentRoom,nickname:'First'},201),second.request({action:'joinRoom',code:concurrentRoom,nickname:'Second'},201)]);
 assert.equal((await presenter.get(concurrentRoom)).leadership.members.filter(p=>p.lead).length,1,'simultaneous first joins leave exactly one leader');
 for(const [person,name] of [[alice,'Alice'],[bob,'Bob'],[carol,'Carol']])await person.request({action:'joinRoom',code:r1,nickname:name},201);
 await visitor.request({action:'joinRoom',code:r1,role:'guest',nickname:'Visitor'},201);
 let view=await alice.get(r1);const aliceId=view.me.id,bobId=(await bob.get(r1)).me.id,carolId=(await carol.get(r1)).me.id;
 assert.equal(view.me.role,'lead');assert.equal(view.leadership.required,2);assert.equal(view.leadership.members.length,3);
 assert.equal((await visitor.get(r1)).leadership,undefined);assert.equal((await stranger.get(r1)).leadership,undefined);
 assert.ok((await presenter.get(r1)).leadership,'presenter sees aggregate leadership');
 await visitor.request({action:'leadershipVote',code:r1,candidate:bobId},403);
 await stranger.request({action:'leadershipVote',code:r1,candidate:bobId},403);
 await bob.request({action:'leadershipVote',code,candidate:bobId},404);
 await bob.request({action:'leadershipVote',code:r1,candidate:'missing'},400);
 await bob.request({action:'leadershipVote',code:r1,candidate:(await visitor.get(r1)).me.id},400);
 // A ballot does not count as an idea/showcase vote and does not reveal voters.
 await bob.request({action:'leadershipVote',code:r1,candidate:bobId});
 view=await bob.get(r1);assert.equal(view.leadership.myVote,bobId);assert.equal(view.stats.votes,0);assert.deepEqual(view.me.votes,[]);
 assert.equal((await alice.get(r1)).leadership.myVote,null);assert.equal((await alice.get(r1)).me.role,'lead');
 await bob.request({action:'joinRoom',code:r1});assert.equal((await bob.get(r1)).leadership.ballots,1,'reopening membership preserves ballots');
 // Split votes never change the lead; withdrawing and changing are supported.
 await carol.request({action:'leadershipVote',code:r1,candidate:carolId});assert.equal((await alice.get(r1)).me.role,'lead');
 await carol.request({action:'leadershipVote',code:r1,candidate:null});assert.equal((await bob.get(r1)).leadership.ballots,1);
 const elected=await carol.request({action:'leadershipVote',code:r1,candidate:bobId});assert.equal(elected.elected,true);
 assert.equal((await bob.get(r1)).me.role,'lead');assert.equal((await alice.get(r1)).me.role,'member');assert.equal((await carol.get(r1)).leadership.ballots,0);
 await alice.request({action:'control',code:r1,patch:{stage:2}},403);
 await bob.request({action:'control',code:r1,patch:{stage:2}});
 // Room privacy doesn't expose the roster or election totals to visitors.
 await bob.request({action:'control',code:r1,patch:{visibility:'private'}});
 assert.equal((await visitor.get(r1)).locked,true);assert.equal((await visitor.get(r1)).leadership,undefined);assert.equal((await carol.get(r1)).leadership.members.length,3);
 await bob.request({action:'control',code:r1,patch:{paused:true}});
 await alice.request({action:'leadershipVote',code:r1,candidate:aliceId},400);
 await bob.request({action:'control',code:r1,patch:{paused:false}});
 await alice.request({action:'leadershipVote',code:r1,candidate:aliceId});
 // Manual handover clears outstanding ballots.
 await bob.request({action:'member',code:r1,participant:carolId,op:'lead'});
 assert.equal((await carol.get(r1)).me.role,'lead');assert.equal((await alice.get(r1)).leadership.ballots,0);
 // Leader departure promotes the earliest remaining member and keeps contributions.
 const idea=crypto.randomUUID();await alice.request({action:'submit',code:r1,id:idea,text:'An accessible campus project',title:'Campus access'},201);
 await carol.request({action:'leaveRoom',code:r1});assert.equal((await alice.get(r1)).me.role,'lead');assert.equal((await carol.get(r1)).me.role,'guest');
 // Switching rooms fixes the old room immediately, without waiting for a new join.
 await alice.request({action:'joinRoom',code:r2},201);assert.equal((await bob.get(r1)).me.role,'lead');assert.equal((await alice.get(r1)).me.role,'guest');
 assert.ok((await bob.get(r1)).ideas.some(i=>i.id===idea));assert.equal((await alice.get(r2)).me.role,'lead');
 await alice.request({action:'leadershipVote',code:r1,candidate:bobId},403);
 await bob.request({action:'leadershipVote',code:r1,candidate:(await alice.get(r2)).me.id},400);
 // Removing a leader with presenter authority also repairs leadership.
 await carol.request({action:'joinRoom',code:r1});await presenter.request({action:'member',code:r1,participant:bobId,op:'remove'});
 assert.equal((await carol.get(r1)).me.role,'lead');assert.equal((await bob.get(r1)).me.role,'guest');
 await carol.request({action:'leaveRoom',code:r1});assert.equal((await presenter.get(r1)).leadership.members.length,0);
 await bob.request({action:'joinRoom',code:r1});assert.equal((await bob.get(r1)).me.role,'lead');
 // Two-member tie, then a concurrent majority, never leaves duplicate leads.
 await carol.request({action:'joinRoom',code:r1});await bob.request({action:'leadershipVote',code:r1,candidate:bobId});
 await carol.request({action:'leadershipVote',code:r1,candidate:carolId});assert.equal((await bob.get(r1)).me.role,'lead');
 await Promise.all([bob.request({action:'leadershipVote',code:r1,candidate:carolId}),carol.request({action:'leadershipVote',code:r1,candidate:carolId})]);
 view=await presenter.get(r1);assert.equal(view.leadership.members.filter(p=>p.lead).length,1);assert.equal((await carol.get(r1)).me.role,'lead');
 await presenter.request({action:'control',code,patch:{ended:true}});
 await bob.request({action:'leadershipVote',code:r1,candidate:bobId},400);
 console.log('PASS: elections, changing/withdrawing votes, privacy, authorization, strict majority/ties, manual handover, leave/move/remove succession, concurrency, and closed workshops.');
} finally {await presenter.request({action:'deleteWorkshop',code,confirm:code});}
