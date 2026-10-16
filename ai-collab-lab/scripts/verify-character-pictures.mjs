import assert from 'node:assert/strict';
// Character pictures: a participant uploads their own picture, nobody else can see it while it waits, the presenter
// approves it (it lands on the seat) or declines it, and nobody can borrow another person's picture.
// Uses disposable workshops on a local test server; never run it against a live audience workshop.
const origin=process.env.WORKSHOP_TEST_ORIGIN||'http://127.0.0.1:3800/workshops';
function client(){const cookies=new Map();const header=()=>[...cookies].map(([k,v])=>k+'='+v).join('; ');const keep=res=>{for(const c of res.headers.getSetCookie()){const pair=c.split(';')[0];cookies.set(pair.slice(0,pair.indexOf('=')),pair.slice(pair.indexOf('=')+1));}};return {
 async request(body,expected=200,path='/api/workshop'){const res=await fetch(origin+path,{method:'POST',headers:{'content-type':'application/json',cookie:header()},body:JSON.stringify(body)});keep(res);const json=await res.json();if(expected<300)assert.ok(res.ok,body.action+': '+res.status+' '+JSON.stringify(json));else assert.equal(res.status,expected,body.action+': '+JSON.stringify(json));return json},
 table(body,expected=200){return this.request(body,expected,'/api/room-experience')},
 async get(path){const res=await fetch(origin+path,{headers:{cookie:header()}});return {status:res.status,type:res.headers.get('content-type'),json:res.headers.get('content-type')?.includes('json')?await res.json():null}},
 async upload(code,bytes,expected=201){const id=crypto.randomUUID();const res=await fetch(origin+'/api/upload?code='+code+'&id='+id+'&index=0&total=1&kind=avatar',{method:'POST',headers:{'content-type':'application/octet-stream',cookie:header()},body:bytes});const json=await res.json();assert.equal(res.status,expected,JSON.stringify(json));return id}};}
// A 1×1 PNG is enough: the server checks the bytes, the browser does the cropping.
const png=Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c63f8cfc0f01f0005000101ff89993d1d0000000049454e44ae426082','hex');
const presenter=client(),ana=client(),ben=client();
const {code}=await presenter.request({action:'create',name:'Pictures verification',challenge:'Pictures',question:'Who are you?'});
await presenter.request({action:'control',code,patch:{teamRooms:true}});
await ana.request({action:'join',code,nickname:'QA Ana'});await ben.request({action:'join',code,nickname:'QA Ben'});
const room=(await ana.request({action:'createRoom',code,name:'Faces',challenge:'Faces'})).code;await ben.request({action:'joinRoom',code:room});

// Only pictures, and only in the main workshop.
await ana.upload(code,Buffer.from('%PDF-1.4 not a picture'),400);
await ana.upload(room,png,400);
const first=await ana.upload(code,png);
let me=await ana.get('/api/room-experience?code='+room);assert.deepEqual(me.json.picture,{id:first,status:'pending'});assert.equal(me.json.avatar,null);
// While pending: the owner and the presenter can see it, a teammate cannot, and the owner cannot put it on their seat.
assert.equal((await ana.get('/api/upload?id='+first)).status,200);
assert.equal((await presenter.get('/api/upload?id='+first)).status,200);
assert.equal((await ben.get('/api/upload?id='+first)).status,404);
await ana.table({action:'avatar',code:room,avatar:'custom:'+first},403);
// Participants cannot review; the presenter sees it in the queue.
assert.equal((await ana.get('/api/room-experience?pictures=1&code='+code)).status,403);
let queue=(await presenter.get('/api/room-experience?pictures=1&code='+code)).json.pending;assert.deepEqual(queue.map(p=>[p.id,p.nickname]),[[first,'QA Ana']]);
await ana.table({action:'picture',code,id:first,approve:true},403);

// Declined: Ana is told, then a new upload replaces the declined one.
await presenter.table({action:'picture',code,id:first,approve:false});
me=await ana.get('/api/room-experience?code='+room);assert.equal(me.json.picture.status,'rejected');assert.equal(me.json.avatar,null);
const second=await ana.upload(code,png);
assert.equal((await ana.get('/api/upload?id='+first)).status,404,'the declined picture is gone');
queue=(await presenter.get('/api/room-experience?pictures=1&code='+code)).json.pending;assert.deepEqual(queue.map(p=>p.id),[second]);

// Approved: it is on Ana's seat, everyone can load it, and the queue is empty.
await presenter.table({action:'picture',code,id:second,approve:true});
const seats=await ben.get('/api/room-experience?code='+room);assert.equal(seats.json.members.find(m=>m.name==='QA Ana').avatar,'custom:'+second);
const pic=await ben.get('/api/upload?id='+second);assert.equal(pic.status,200);assert.equal(pic.type,'image/png');
me=await ana.get('/api/room-experience?code='+room);assert.equal(me.json.picture,null);assert.equal(me.json.ownPicture,'custom:'+second);
assert.deepEqual((await presenter.get('/api/room-experience?pictures=1&code='+code)).json.pending,[]);
await presenter.table({action:'picture',code,id:second,approve:false},404);

// Switching to a character and back keeps the picture available; Ben cannot borrow it.
await ana.table({action:'avatar',code:room,avatar:'fox'});await ana.table({action:'avatar',code:room,avatar:'custom:'+second});
await ben.table({action:'avatar',code:room,avatar:'custom:'+second},403);
// Pictures don't count as shared files in the participant report.
const report=(await presenter.get('/api/participants?code='+code)).json;const anaRow=report.participants?.find?.(p=>p.nickname==='QA Ana');if(anaRow&&'files' in anaRow)assert.equal(anaRow.files,0);

await presenter.request({action:'control',code,patch:{ended:true}}).catch(()=>{});
console.log('Character pictures verified ✓');
