import assert from 'node:assert/strict';
const origin=process.env.WORKSHOP_TEST_ORIGIN||'http://127.0.0.1:5173';
function client(){const cookies=new Map();return {async request(body,expected=200){const res=await fetch(origin+'/api/workshop',{method:'POST',headers:{'content-type':'application/json',cookie:[...cookies].map(([k,v])=>k+'='+v).join('; ')},body:JSON.stringify(body)});for(const c of res.headers.getSetCookie()){const pair=c.split(';')[0];cookies.set(pair.slice(0,pair.indexOf('=')),pair.slice(pair.indexOf('=')+1));}const json=await res.json();assert.equal(res.status,expected,JSON.stringify(json));return json},async get(code){const res=await fetch(origin+'/api/workshop?code='+code,{headers:{cookie:[...cookies].map(([k,v])=>k+'='+v).join('; ')}});assert.equal(res.status,200);return res.json()},cookies};}
const presenter=client(),alice=client(),bob=client(),outsider=client();
async function accountLogin(client){if(!process.env.WORKSHOP_PRESENTER_PASSWORD)return;const r=await fetch(origin+'/api/account',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:'nasser',password:process.env.WORKSHOP_PRESENTER_PASSWORD})});assert.equal(r.status,200);for(const c of r.headers.getSetCookie()){const pair=c.split(';')[0];client.cookies.set(pair.slice(0,pair.indexOf('=')),pair.slice(pair.indexOf('=')+1));}}
await accountLogin(presenter);
const {code,key}=await presenter.request({action:'create',name:'Verification workshop',challenge:'Accessible Campus',question:'How can we make campus more accessible?',moderated:true,maxVotes:1,multiple:false},201);
await alice.request({action:'join',code,nickname:'QA Alice'},201);await bob.request({action:'join',code,nickname:'QA Bob'},201);
await outsider.request({action:'control',code,patch:{stage:1}},403);
const patch=patch=>presenter.request({action:'control',code,patch});const submit=(client,text,status=201)=>client.request({action:'submit',code,id:crypto.randomUUID(),title:text,text},status);
await patch({stage:1});await submit(alice,'Ramps are hard to find');let state=await presenter.get(code);let problem=state.ideas[0];assert.equal(problem.status,'pending');assert.equal((await bob.get(code)).ideas.length,0);await presenter.request({action:'moderate',code,id:problem.id,op:'approve'});assert.equal((await bob.get(code)).ideas.length,1);await submit(alice,'Another problem',400);
await bob.request({action:'editOwn',code,id:problem.id,title:'Not mine',text:'Not my contribution'},403);
await alice.request({action:'editOwn',code,id:problem.id,title:'Accessible directions',text:'Students need clear directions to accessible ramps.'});
assert.equal((await bob.get(code)).ideas.some(i=>i.id===problem.id),false);
assert.equal((await alice.get(code)).ideas.find(i=>i.id===problem.id).status,'pending');
await presenter.request({action:'moderate',code,id:problem.id,op:'approve'});
assert.equal((await bob.get(code)).ideas.find(i=>i.id===problem.id).title,'Accessible directions');

const commentId=crypto.randomUUID();
await outsider.request({action:'comment',code,id:crypto.randomUUID(),parent:problem.id,text:'Not joined'},401);
await bob.request({action:'comment',code,id:commentId,parent:problem.id,text:'Could we add Arabic directions?'},201);
assert.equal((await alice.get(code)).ideas.some(i=>i.id===commentId),false);
assert.equal((await bob.get(code)).ideas.find(i=>i.id===commentId).status,'pending');
await presenter.request({action:'moderate',code,id:commentId,op:'approve'});
assert.equal((await alice.get(code)).ideas.find(i=>i.id===commentId).parent,problem.id);
assert.equal((await presenter.get(code)).stats.ideas,1);
await bob.request({action:'comment',code,id:commentId,parent:problem.id,text:'Could we add Arabic directions?'});
await bob.request({action:'comment',code,id:crypto.randomUUID(),parent:commentId,text:'Nested reply not supported'},400);
await bob.request({action:'comment',code,id:crypto.randomUUID(),parent:crypto.randomUUID(),text:'Unknown idea'},400);
await patch({paused:true});await bob.request({action:'comment',code,id:crypto.randomUUID(),parent:problem.id,text:'Paused comment'},400);await patch({paused:false});
await patch({submissionsOpen:false});await bob.request({action:'comment',code,id:crypto.randomUUID(),parent:problem.id,text:'Closed comment'},400);await patch({submissionsOpen:true});

await patch({paused:true});await submit(bob,'Paused contribution',400);await patch({paused:false,stage:3,spotlight:problem.id});await submit(alice,'An accessible campus map');state=await presenter.get(code);let solution=state.ideas.find(i=>i.type==='solution');assert.equal(solution.parent,problem.id);await presenter.request({action:'moderate',code,id:solution.id,op:'approve'});await presenter.request({action:'moderate',code,id:solution.id,op:'shortlist'});
await patch({stage:4,spotlight:solution.id});await submit(bob,'Add Arabic audio directions');state=await presenter.get(code);const improvement=state.ideas.find(i=>i.type==='improvement');assert.equal(improvement.parent,solution.id);await presenter.request({action:'moderate',code,id:improvement.id,op:'approve'});
await patch({stage:2});await submit(bob,'Quiet study spaces');state=await presenter.get(code);const second=state.ideas.find(i=>i.type==='idea');await presenter.request({action:'moderate',code,id:second.id,op:'approve'});await presenter.request({action:'moderate',code,id:second.id,op:'shortlist'});
await alice.request({action:'editOwn',code,id:solution.id,title:'Frozen finalist',text:'Cannot change a shortlisted idea'},400);await patch({votingOpen:true,liveResults:false});await alice.request({action:'vote',code,id:solution.id});await alice.request({action:'vote',code,id:solution.id},400);await alice.request({action:'vote',code,id:second.id},400);assert.ok((await bob.get(code)).ideas.every(i=>i.votes===null));assert.equal((await presenter.get(code)).stats.votes,1);await bob.request({action:'vote',code,id:second.id});
await patch({votingOpen:false});await bob.request({action:'vote',code,id:solution.id},400);await patch({stage:7,selected:[solution.id],canvas:{Problem:'Campus navigation',Features:'Map with Arabic audio'},prompt:'Build an accessible campus assistant.'});assert.equal((await bob.get(code)).config.prompt,'Build an accessible campus assistant.');
await patch({stage:8});await alice.request({action:'reflect',code,skill:'Collaboration'});await alice.request({action:'reflect',code,skill:'Creativity'});state=await presenter.get(code);assert.deepEqual(state.reflection,{Creativity:1});assert.equal(state.stats.participants,2);assert.equal('adminHash' in state,false);assert.equal(JSON.stringify(state).includes(key),false);
const abort=new AbortController();const stream=await fetch(origin+'/api/events?code='+code,{signal:abort.signal});assert.equal(stream.headers.get('content-type'),'text/event-stream');const first=await stream.body.getReader().read();assert.ok(new TextDecoder().decode(first.value).startsWith('data: '));abort.abort();
const restored=client();await accountLogin(restored);await restored.request({action:'unlock',code,key});assert.equal((await restored.get(code)).isPresenter,true);await patch({ended:true});await outsider.request({action:'join',code,nickname:'Too late'},400);await alice.request({action:'submit',code,id:crypto.randomUUID(),text:'Too late'},400);await bob.request({action:'comment',code,id:crypto.randomUUID(),parent:problem.id,text:'Ended comment'},400);
console.log('PASS: own-idea editing, edit ownership/re-moderation/finalist freeze, threaded comments, comment moderation/privacy/idempotency and stage gates, create/join, presenter authorization, moderation privacy, stage transitions, linked improvements, pause, submission limits, unique voting and vote budget, hidden results, product persistence, reflection replacement, SSE snapshots, presenter recovery, workshop closure.');
console.log('Verification session:',code);
