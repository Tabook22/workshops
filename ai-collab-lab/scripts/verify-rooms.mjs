import assert from 'node:assert/strict';
// Team rooms: creation, membership and guests, room leads, presenter-wide controls, ending and deletion.
// Uses disposable workshops on a local test server; never run it against a live audience workshop.
const origin=process.env.WORKSHOP_TEST_ORIGIN||'http://127.0.0.1:5173';
function client(){const cookies=new Map();const header=()=>[...cookies].map(([k,v])=>k+'='+v).join('; ');return {async request(body,expected=200){const res=await fetch(origin+'/api/workshop',{method:'POST',headers:{'content-type':'application/json',cookie:header()},body:JSON.stringify(body)});for(const c of res.headers.getSetCookie()){const pair=c.split(';')[0];cookies.set(pair.slice(0,pair.indexOf('=')),pair.slice(pair.indexOf('=')+1));}const json=await res.json();assert.equal(res.status,expected,body.action+': '+JSON.stringify(json));return json},async get(code,expected=200){const res=await fetch(origin+'/api/workshop?code='+code,{headers:{cookie:header()}});assert.equal(res.status,expected);return res.json()},cookies};}
const presenter=client(),alice=client(),bob=client(),carol=client(),outsider=client();
if(process.env.WORKSHOP_PRESENTER_PASSWORD){const r=await fetch(origin+'/api/account',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:process.env.WORKSHOP_PRESENTER_USERNAME||'nasser',password:process.env.WORKSHOP_PRESENTER_PASSWORD})});assert.equal(r.status,200);for(const c of r.headers.getSetCookie()){const pair=c.split(';')[0];presenter.cookies.set(pair.slice(0,pair.indexOf('=')),pair.slice(pair.indexOf('=')+1));}}

const {code}=await presenter.request({action:'create',name:'Rooms verification',challenge:'Smart Campus',question:'How can we improve campus life?'},201);
await alice.request({action:'join',code,nickname:'QA Alice'},201);await bob.request({action:'join',code,nickname:'QA Bob'},201);
// Rooms are off until the presenter turns them on.
await alice.request({action:'createRoom',code,name:'Falcon'},403);
await presenter.request({action:'control',code,patch:{teamRooms:true}});
const created=await alice.request({action:'createRoom',code,name:'Falcon',challenge:'Smart parking'},201);
const r1=created.code;assert.equal(r1,code+'-R1');
let room=await alice.get(r1);assert.equal(room.me.role,'lead');assert.equal(room.isPresenter,true,'a room lead facilitates the room');assert.equal(room.config.challenge,'Smart parking');assert.equal(room.parent.code,code);
assert.equal((await alice.get(code)).me.room,r1);
const {codes}=await presenter.request({action:'createRoom',code,names:['Team A','Team B']},201);const [r2,r3]=codes;assert.deepEqual(codes,[code+'-R2',code+'-R3']);
assert.equal((await presenter.get(code)).rooms.length,3);
await outsider.request({action:'createRoom',code,name:'Not joined'},401);

// The first member leads; an invite link works for someone new to the workshop.
await bob.request({action:'joinRoom',code:r2},201);assert.equal((await bob.get(r2)).me.role,'lead');
const carolView=await carol.get(r2);assert.equal(carolView.me,null);assert.equal(carolView.viewer,null);
await carol.request({action:'join',code:r2,nickname:'QA Carol'},201);
room=await carol.get(r2);assert.equal(room.me.role,'member');assert.equal(room.isPresenter,false);
assert.equal((await presenter.get(code)).stats.participants,3,'joining by room link also joins the main workshop');
assert.equal((await bob.get(r1)).viewer.nickname,'QA Bob','main-workshop identity is offered in other rooms');
await carol.request({action:'control',code:r2,patch:{stage:1}},403);

// Room lead runs the room but cannot end, delete or add sample ideas.
await alice.request({action:'control',code:r1,patch:{stage:2,ended:true}});room=await alice.get(r1);assert.equal(room.config.stage,2);assert.equal(room.config.ended,false);
await alice.request({action:'demo',code:r1},403);await alice.request({action:'deleteWorkshop',code:r1,confirm:r1},403);
const ideaId=crypto.randomUUID();await alice.request({action:'submit',code:r1,id:ideaId,title:'Parking finder',text:'Show free parking spaces live.'},201);

// Guests read and comment, but cannot post ideas or vote.
await bob.request({action:'joinRoom',code:r1,role:'guest'},201);
room=await bob.get(r1);assert.equal(room.me.role,'guest');assert.equal(room.ideas.some(i=>i.id===ideaId),true);
await bob.request({action:'submit',code:r1,id:crypto.randomUUID(),title:'Guest idea',text:'Should not be accepted.'},403);
await bob.request({action:'comment',code:r1,id:crypto.randomUUID(),parent:ideaId,text:'Add Arabic voice guidance?'},201);
assert.equal((await alice.get(r1)).stats.participants,1,'guests are not counted as members');
assert.equal((await bob.get(code)).me.room,r2,'visiting does not change your team');
// Room status for the visual views: visitors, messages, people (lead first) and last activity; the people list is for facilitators only.
let stat=(await presenter.get(code)).rooms.find(r=>r.code===r1);assert.equal(stat.guests,1);assert.equal(stat.comments,1);assert.equal(stat.ideas,1);assert.deepEqual(stat.people,[{lead:true,name:'QA Alice'}]);assert.ok(stat.lastActivity>0);
assert.equal((await presenter.get(r1)).people.length,2);assert.equal((await bob.get(r1)).people,undefined);assert.equal((await alice.get(r1)).people.length,2,'the room lead sees who is in the room');

// Files: members share images/PDFs in pieces; type comes from the bytes; guests, wrong types and oversize files are refused.
const sendFile=async(c,room,bytes,{name='sketch.png',chunk=96*1024}={})=>{const id=crypto.randomUUID(),total=Math.max(1,Math.ceil(bytes.length/chunk));let res;for(let i=0;i<total;i++){const r=await fetch(origin+'/api/upload?code='+room+'&id='+id+'&index='+i+'&total='+total,{method:'POST',headers:{'content-type':'application/octet-stream','x-file-name':encodeURIComponent(name),cookie:[...c.cookies].map(([k,v])=>k+'='+v).join('; ')},body:bytes.slice(i*chunk,(i+1)*chunk)});res={status:r.status,body:await r.json()};if(r.status>=400)return res;}return {...res,id};};
const png=new Uint8Array(150*1024);png.set([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]);for(let i=8;i<png.length;i++)png[i]=i%251;
let up=await sendFile(alice,r1,png);const pngId=up.id;assert.equal(up.status,201,JSON.stringify(up.body));assert.equal(up.body.status,'approved');
const fileRes=await fetch(origin+'/api/upload?id='+up.id);assert.equal(fileRes.status,200);assert.equal(fileRes.headers.get('content-type'),'image/png');assert.match(fileRes.headers.get('content-security-policy'),/sandbox/);assert.deepEqual(new Uint8Array(await fileRes.arrayBuffer()),png);
let files=(await bob.get(r1)).uploads;assert.equal(files.length,1);assert.equal(files[0].name,'sketch.png');assert.equal(files[0].mine,false);assert.equal(files[0].participant,undefined);
assert.equal((await presenter.get(code)).rooms.find(r=>r.code===r1).uploads,1);
assert.equal((await sendFile(bob,r1,png)).status,403,'visitors cannot share files');
assert.equal((await sendFile(alice,r1,new TextEncoder().encode('<html><script>alert(1)</script>'),{name:'x.png'})).status,400,'type comes from the bytes');
assert.equal((await sendFile(alice,code,png)).status,400,'files belong to team rooms');
assert.equal((await sendFile(alice,r1,new Uint8Array(3.2*1024*1024).fill(1).map((v,i)=>i<5?[0x25,0x50,0x44,0x46,0x2d][i]:v))).status,400,'3 MB at most');
await bob.request({action:'file',code:r1,id:up.id,op:'delete'},403);
// Moderated room: a member's file waits for approval and is visible only to its owner and facilitators.
await presenter.request({action:'control',code:r2,patch:{moderated:true}});const pdf=new TextEncoder().encode('%PDF-1.4 demo');
up=await sendFile(carol,r2,pdf,{name:'brief.pdf'});assert.equal(up.body.status,'pending');
assert.equal((await fetch(origin+'/api/upload?id='+up.id)).status,404);assert.equal((await carol.get(r2)).uploads[0].mine,true);assert.equal((await presenter.get(r2)).uploads.length,1);
await bob.request({action:'file',code:r2,id:up.id,op:'approve'});
assert.equal((await fetch(origin+'/api/upload?id='+up.id+'&download=1')).headers.get('content-disposition').startsWith('attachment'),true);
await carol.request({action:'file',code:r2,id:up.id,op:'delete'});assert.equal((await presenter.get(r2)).uploads.length,0);assert.equal((await fetch(origin+'/api/upload?id='+up.id)).status,404);
await presenter.request({action:'control',code:r2,patch:{moderated:false}});
// Privacy: the lead keeps the room to the team, opens it to selected teams, or to all; the presenter always sees inside.
await carol.request({action:'control',code:r1,patch:{visibility:'private'}},403);
await alice.request({action:'control',code:r1,patch:{visibility:'private'}});
let peek=await bob.get(r1);assert.equal(peek.locked,true);assert.equal(peek.ideas.length,0);assert.equal(peek.uploads.length,0);assert.deepEqual(peek.config.canvas,{});
assert.equal((await alice.get(r1)).locked,false);assert.ok((await presenter.get(r1)).ideas.length>0,'the presenter sees private rooms');
await bob.request({action:'comment',code:r1,id:crypto.randomUUID(),parent:ideaId,text:'Should be refused now'},403);
assert.equal((await fetch(origin+'/api/upload?id='+pngId)).status,404,'private files stay private');
let fromMain=(await carol.get(code)).rooms.find(r=>r.code===r1);assert.equal(fromMain.canVisit,false);assert.equal(fromMain.latest,null);assert.equal(fromMain.visibility,'private');
await carol.request({action:'joinRoom',code:r1,role:'guest'},403);
await alice.request({action:'control',code:r1,patch:{visibility:'partners',partners:[r2,'UTAS-999999-R1',r1]}});
assert.deepEqual((await presenter.get(r1)).config.partners,[r2],'only other rooms of this workshop can be partners');
assert.equal((await bob.get(r1)).locked,false,'an invited team can read');await carol.request({action:'joinRoom',code:r1,role:'guest'},201);
assert.equal((await carol.get(code)).rooms.find(r=>r.code===r1).canVisit,true);
await alice.request({action:'control',code:r1,patch:{visibility:'open'}});
// Joining another team as a member moves you; your old room keeps your ideas as a guest.
await bob.request({action:'joinRoom',code:r1});
assert.equal((await bob.get(r1)).me.role,'member');assert.equal((await bob.get(r2)).me.role,'guest');assert.equal((await bob.get(code)).me.room,r1);
await bob.request({action:'leaveRoom',code:r1});assert.equal((await bob.get(r1)).me.role,'guest');assert.equal((await bob.get(code)).me.room,null);

// Presenter: opens any room with the main workshop's key, guides all rooms, broadcasts.
assert.equal((await presenter.get(r2)).isPresenter,true);
await outsider.request({action:'roomsControl',code,patch:{stage:3}},403);await alice.request({action:'roomsControl',code,patch:{stage:3}},403);
await presenter.request({action:'roomsControl',code,patch:{stage:3,paused:true}});
for(const r of [r1,r2,r3]){const s=await presenter.get(r);assert.equal(s.config.stage,3);assert.equal(s.config.paused,true);}
await presenter.request({action:'control',code,patch:{broadcast:'Five minutes left'}});assert.equal((await carol.get(r2)).parent.broadcast,'Five minutes left');
await presenter.request({action:'control',code,patch:{gallery:false}});await carol.request({action:'joinRoom',code:r1,role:'guest'},403);
await alice.request({action:'control',code,patch:{broadcast:'Not the presenter'}},403);
// Dragged room order is saved on the main workshop and every screen lists rooms in it; the latest message shows on the card.
await presenter.request({action:'control',code,patch:{roomOrder:[r3,r1,r2]}});assert.deepEqual((await carol.get(code)).rooms.map(r=>r.code),[r3,r1,r2]);assert.deepEqual((await carol.get(r2)).rooms.map(r=>r.code),[r3,r1,r2]);
await alice.request({action:'control',code,patch:{roomOrder:[r2]}},403);
const fal=(await presenter.get(code)).rooms.find(r=>r.code===r1);assert.equal(fal.latest.nickname,'QA Bob');assert.equal(fal.latest.type,'comment');assert.ok(fal.recent>=2);
// Editing a room and choosing what its screen shows, for one room or all rooms.
await presenter.request({action:'control',code:r2,patch:{name:'Team Oryx',challenge:'Study rooms'}});let listed=(await presenter.get(code)).rooms.find(r=>r.code===r2);assert.equal(listed.name,'Team Oryx');assert.equal(listed.challenge,'Study rooms');assert.ok(listed.created>0);
await presenter.request({action:'roomsControl',code,patch:{screen:'wall'}});assert.ok((await presenter.get(code)).rooms.every(r=>r.screen==='wall'));
await presenter.request({action:'control',code:r1,patch:{screen:'qr'}});assert.equal((await presenter.get(code)).rooms.find(r=>r.code===r1).screen,'qr');
await carol.request({action:'control',code:r1,patch:{name:'Hijack'}},403);

// Showcase: one changeable class vote per student, never for your own team, hidden until allowed.
await presenter.request({action:'control',code,patch:{gallery:true}});
await carol.request({action:'showcaseVote',code,room:r1},400);
await presenter.request({action:'control',code,patch:{showcaseVoting:true,liveResults:false,screen:'showcase',showcaseRoom:r1}});
await alice.request({action:'showcaseVote',code,room:r1},400);
await alice.request({action:'showcaseVote',code,room:r2});await carol.request({action:'showcaseVote',code,room:r1});await carol.request({action:'showcaseVote',code,room:r3});
await outsider.request({action:'showcaseVote',code,room:r2},401);await alice.request({action:'showcaseVote',code:r1,room:r2},400);
assert.equal((await alice.get(code)).rooms.find(r=>r.code===r2).votes,null,'results hidden while voting');assert.equal((await alice.get(code)).me.showcaseVote,r2);
let tally=(await presenter.get(code)).rooms;assert.equal(tally.find(r=>r.code===r2).votes,1);assert.equal(tally.find(r=>r.code===r3).votes,1);assert.equal(tally.find(r=>r.code===r1).votes,0,'a changed vote moves');
assert.equal((await presenter.get(code)).stats.votes,0,'showcase votes are not idea votes');assert.deepEqual((await alice.get(code)).me.votes,[]);
await presenter.request({action:'control',code,patch:{showcaseVoting:false}});await alice.request({action:'showcaseVote',code,room:r3},400);assert.equal((await alice.get(code)).rooms.find(r=>r.code===r2).votes,1);
// Deleting a room, ending/reopening and deleting the workshop cascade to rooms.
await presenter.request({action:'deleteRoom',code,room:r3,confirm:'WRONG'},400);
await presenter.request({action:'deleteRoom',code,room:r3,confirm:r3});await presenter.get(r3,404);assert.equal((await presenter.get(code)).rooms.length,2);
await presenter.request({action:'control',code,patch:{ended:true}});assert.equal((await presenter.get(r1)).config.ended,true);
await carol.request({action:'joinRoom',code:r1},400);
await presenter.request({action:'control',code,patch:{ended:false}});assert.equal((await presenter.get(r1)).config.ended,false);
await presenter.request({action:'deleteWorkshop',code,confirm:code});
await presenter.get(code,404);await presenter.get(r1,404);await presenter.get(r2,404);
console.log('Team rooms verification passed.');
