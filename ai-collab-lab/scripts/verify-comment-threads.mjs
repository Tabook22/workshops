import assert from 'node:assert/strict';
// Comment threads: replies to comments (and replies to replies, up to 4 levels), and reactions that name who
// agreed, disagreed, liked or disliked, with opposites replacing each other.
// Uses disposable workshops on a local test server; never run it against a live audience workshop.
const origin=process.env.WORKSHOP_TEST_ORIGIN||'http://127.0.0.1:3800/workshops';
function client(){const cookies=new Map();const header=()=>[...cookies].map(([k,v])=>k+'='+v).join('; ');return {
 async request(body,expected=200){const res=await fetch(origin+'/api/workshop',{method:'POST',headers:{'content-type':'application/json',cookie:header()},body:JSON.stringify(body)});for(const c of res.headers.getSetCookie()){const pair=c.split(';')[0];cookies.set(pair.slice(0,pair.indexOf('=')),pair.slice(pair.indexOf('=')+1));}const json=await res.json();if(expected<300)assert.ok(res.ok,body.action+': '+res.status+' '+JSON.stringify(json));else assert.equal(res.status,expected,body.action+': '+JSON.stringify(json));return json},
 async get(code){return (await fetch(origin+'/api/workshop?code='+code,{headers:{cookie:header()}})).json()}};}
const presenter=client(),alice=client(),bob=client(),carol=client();
const {code}=await presenter.request({action:'create',name:'Threads verification',challenge:'Threads',question:'Can we talk in threads?'});
for(const [c,n] of [[alice,'QA Alice'],[bob,'QA Bob'],[carol,'QA Carol']])await c.request({action:'join',code,nickname:n});
await presenter.request({action:'control',code,patch:{stage:2}});
const idea=crypto.randomUUID(),other=crypto.randomUUID();
await alice.request({action:'submit',code,id:idea,title:'',text:'Water reminders for students',expectedStage:2,expectedSpotlight:null});
await bob.request({action:'submit',code,id:other,title:'',text:'Another idea',expectedStage:2,expectedSpotlight:null});
const comment=async(who,parent,replyTo,expected=201)=>{const id=crypto.randomUUID();await who.request({action:'comment',code,parent,id,text:'Comment '+id.slice(0,4),...(replyTo?{replyTo}:{})},expected);return id};

// A comment, a reply, a reply to the reply, and one more level: four levels in all.
const c1=await comment(bob,idea);const c2=await comment(carol,idea,c1);const c3=await comment(alice,idea,c2);const c4=await comment(bob,idea,c3);
// A fifth level is refused, as is replying across ideas or to a missing comment.
await comment(carol,idea,c4,400);
await comment(carol,other,c1,400);
await comment(carol,idea,crypto.randomUUID(),400);

const snap=await carol.get(code);const byId=Object.fromEntries(snap.ideas.map(i=>[i.id,i]));
assert.equal(byId[c1].replyTo??null,null);assert.equal(byId[c2].replyTo,c1);assert.equal(byId[c3].replyTo,c2);assert.equal(byId[c4].replyTo,c3);
for(const id of [c1,c2,c3,c4])assert.equal(byId[id].parent,idea,'replies still belong to the idea');

// Reactions name who reacted; agree replaces disagree and like replaces dislike.
await bob.request({action:'react',code,id:c2,emoji:'❌'});await bob.request({action:'react',code,id:c2,emoji:'✅'});
await alice.request({action:'react',code,id:c2,emoji:'✅'});await alice.request({action:'react',code,id:c2,emoji:'👎'});await alice.request({action:'react',code,id:c2,emoji:'👍'});
const after=(await carol.get(code)).ideas.find(i=>i.id===c2);
assert.deepEqual([...after.reactors['✅']].sort(),['QA Alice','QA Bob']);assert.equal(after.reactions['✅'],2);
assert.equal(after.reactors['❌'],undefined,'disagree was replaced by agree');
assert.deepEqual(after.reactors['👍'],['QA Alice']);assert.equal(after.reactors['👎'],undefined,'dislike was replaced by like');
await presenter.request({action:'end',code}).catch(()=>{});
console.log('PASS: four-level replies, depth/cross-idea/missing-target refusals, reactor names, opposite reactions on',code);
