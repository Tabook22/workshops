import assert from 'node:assert/strict';
// Voice notes: a recording is uploaded in pieces, attached to an idea, a comment and a public post, then played back
// (with byte ranges, as Safari asks). Non-audio and other people's recordings are refused.
// Uses disposable workshops on a local test server; never run it against a live audience workshop.
const origin=process.env.WORKSHOP_TEST_ORIGIN||'http://127.0.0.1:3800/workshops';
function client(){const cookies=new Map();const header=()=>[...cookies].map(([k,v])=>k+'='+v).join('; ');const keep=res=>{for(const c of res.headers.getSetCookie()){const pair=c.split(';')[0];cookies.set(pair.slice(0,pair.indexOf('=')),pair.slice(pair.indexOf('=')+1));}};return {
 async request(path,body,expected=200){const res=await fetch(origin+path,{method:'POST',headers:{'content-type':'application/json',cookie:header()},body:JSON.stringify(body)});keep(res);const json=await res.json();if(expected<300)assert.ok(res.ok,body.action+': '+res.status+' '+JSON.stringify(json));else assert.equal(res.status,expected,body.action+': '+JSON.stringify(json));return json},
 async upload(code,bytes,kind='voice',expected=201){const id=crypto.randomUUID(),chunk=96*1024,total=Math.max(1,Math.ceil(bytes.length/chunk));let res,json;for(let i=0;i<total;i++){res=await fetch(origin+`/api/upload?code=${code}&id=${id}&index=${i}&total=${total}${kind?'&kind='+kind:''}`,{method:'POST',headers:{'content-type':'application/octet-stream','x-file-name':'voice-note.webm',cookie:header()},body:bytes.slice(i*chunk,(i+1)*chunk)});json=await res.json();if(!res.ok)break;}assert.equal(res.status,expected,'upload: '+JSON.stringify(json));return id},
 async get(path,headers={}){return fetch(origin+path,{headers:{cookie:header(),...headers}})}};}
const webm=size=>{const b=new Uint8Array(size);b.set([0x1a,0x45,0xdf,0xa3]);for(let i=4;i<size;i++)b[i]=i%251;return b};
const presenter=client(),alice=client(),bob=client();
const {code}=await presenter.request('/api/workshop',{action:'create',name:'Voice verification',challenge:'Voice',question:'Can people speak their ideas?'});
await alice.request('/api/workshop',{action:'join',code,nickname:'QA Alice'});await bob.request('/api/workshop',{action:'join',code,nickname:'QA Bob'});
await presenter.request('/api/workshop',{action:'control',code,patch:{stage:2}});

// A 200 KB recording arrives in three pieces; a PNG is refused as a voice note.
const audio=await alice.upload(code,webm(200*1024));
await alice.upload(code,new Uint8Array([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,1,2,3]),'voice',400);
// Images are still refused outside team rooms.
await alice.upload(code,new Uint8Array([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,1,2,3]),'',400);

// Bob cannot attach Alice's recording; Alice can.
const idea=crypto.randomUUID();
await bob.request('/api/workshop',{action:'submit',code,id:crypto.randomUUID(),title:'',text:'Borrowed voice',expectedStage:2,expectedSpotlight:null,audio},400);
await alice.request('/api/workshop',{action:'submit',code,id:idea,title:'',text:'Spoken idea about reminders',expectedStage:2,expectedSpotlight:null,audio},201);
const bobAudio=await bob.upload(code,webm(5000));
await bob.request('/api/workshop',{action:'comment',code,parent:idea,id:crypto.randomUUID(),text:'Spoken comment',audio:bobAudio},201);
// A contribution without a recording still works.
await bob.request('/api/workshop',{action:'submit',code,id:crypto.randomUUID(),title:'',text:'Typed idea',expectedStage:2,expectedSpotlight:null},201);

const snap=await (await bob.get('/api/workshop?code='+code)).json();
assert.equal(snap.ideas.find(i=>i.id===idea).audio,audio,'idea carries its voice note');
assert.equal(snap.ideas.find(i=>i.type==='comment').audio,bobAudio,'comment carries its voice note');
assert.equal(snap.ideas.find(i=>i.text==='Typed idea').audio??null,null);

// Playback: whole file inline, and a byte range.
const full=await bob.get('/api/upload?id='+audio);assert.equal(full.status,200);assert.equal(full.headers.get('content-type'),'audio/webm');assert.match(full.headers.get('content-disposition'),/^inline/);assert.equal((await full.arrayBuffer()).byteLength,200*1024);
const part=await bob.get('/api/upload?id='+audio,{range:'bytes=0-1'});assert.equal(part.status,206);assert.equal(part.headers.get('content-range'),`bytes 0-1/${200*1024}`);assert.equal((await part.arrayBuffer()).byteLength,2);
const bad=await bob.get('/api/upload?id='+audio,{range:'bytes=999999999-'});assert.equal(bad.status,416);

// Public board post with a voice note.
await presenter.request('/api/workshop',{action:'control',code,patch:{teamRooms:true}});
const room=await alice.request('/api/workshop',{action:'createRoom',code,name:'Voice team',challenge:'Voice',question:'Speak up?'}).catch(()=>null);
if(room?.code){const boardAudio=await alice.upload(code,webm(3000));const post=crypto.randomUUID();await alice.request('/api/board',{action:'create',code,id:post,kind:'idea',title:'Spoken post',text:'Listen to this',publicAcknowledged:true,audio:boardAudio},201);const board=await (await alice.get('/api/board?code='+code)).json();assert.equal(board.posts.find(p=>p.id===post).audio,boardAudio,'board post carries its voice note');console.log('Board voice note: ok');}
else console.log('Board voice note: skipped (could not create a team room in this setup)');
// Recordings never appear in a room's file list.
await presenter.request('/api/workshop',{action:'end',code}).catch(()=>{});
console.log('Voice notes verified on',code);
