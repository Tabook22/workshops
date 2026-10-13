import assert from 'node:assert/strict';
const origin=process.env.WORKSHOP_TEST_ORIGIN||'http://127.0.0.1:3818/workshops';
if(!['127.0.0.1','localhost','[::1]'].includes(new URL(origin).hostname))throw new Error('Entry verification requires a local test server.');
function client(){const cookies=new Map();return{async request(body,status=200){const res=await fetch(origin+'/api/workshop',{method:'POST',headers:{'content-type':'application/json',cookie:[...cookies].map(([k,v])=>k+'='+v).join('; ')},body:JSON.stringify(body)});for(const raw of res.headers.getSetCookie()){const pair=raw.split(';')[0],i=pair.indexOf('=');cookies.set(pair.slice(0,i),pair.slice(i+1))}const data=await res.json();assert.equal(res.status,status,body.action+': '+JSON.stringify(data));return data},async get(code){return(await fetch(origin+'/api/workshop?code='+code,{headers:{cookie:[...cookies].map(([k,v])=>k+'='+v).join('; ')}})).json()}};}
const presenter=client(),visitor=client();const created=[];
async function directory(){const res=await fetch(origin+'/api/workshop?directory=1');assert.equal(res.status,200);assert.equal(res.headers.get('cache-control'),'no-store');return(await res.json()).workshops;}
try{
 const a=await presenter.request({action:'create',name:'Opt-in entry QA',anonymous:false,teamRooms:true},201);created.push(a.code);
 const b=await presenter.request({action:'create',name:'Listed at creation QA',showOnJoinPage:true},201);created.push(b.code);
 assert.ok(!(await directory()).some(w=>w.code===a.code),'default remains private/unlisted');
 assert.ok((await directory()).some(w=>w.code===b.code),'explicit creation opt-in');
 await visitor.request({action:'control',code:a.code,patch:{showOnJoinPage:true}},403);
 await presenter.request({action:'control',code:a.code,patch:{showOnJoinPage:'true'}});
 assert.ok(!(await directory()).some(w=>w.code===a.code),'string cannot opt in');
 await presenter.request({action:'control',code:a.code,patch:{showOnJoinPage:true}});
 const publicItem=(await directory()).find(w=>w.code===a.code);assert.ok(publicItem);
 assert.deepEqual(Object.keys(publicItem).sort(),['challenge','code','language','name']);
 const {codes:[room]}=await presenter.request({action:'createRoom',code:a.code,name:'Private room'},201);
 await presenter.request({action:'control',code:room,patch:{visibility:'private',showOnJoinPage:true}},400);
 await presenter.request({action:'control',code:room,patch:{visibility:'private',showOnJoinPage:false}});
 assert.equal((await presenter.get(room)).config.visibility,'private','room settings save with a default-off flag');
 assert.ok(!(await directory()).some(w=>w.code===room),'rooms never public-listed');
 const before=await visitor.get(a.code);assert.equal(before.me,null);
 const page=await fetch(origin+'/join?code='+a.code);assert.equal(page.status,200);
 await visitor.request({action:'join',code:a.code,nickname:''},400);
 await visitor.request({action:'join',code:a.code,nickname:'Direct link participant'},201);
 assert.equal((await visitor.get(a.code)).me.nickname,'Direct link participant');
 await presenter.request({action:'control',code:a.code,patch:{ended:true}});
 assert.ok(!(await directory()).some(w=>w.code===a.code),'ended hidden');
 await presenter.request({action:'control',code:a.code,patch:{ended:false}});
 assert.ok((await directory()).some(w=>w.code===a.code),'opt-in survives reopen');
 await presenter.request({action:'control',code:a.code,patch:{showOnJoinPage:false}});
 assert.ok(!(await directory()).some(w=>w.code===a.code),'unlisting immediate');
 assert.equal((await visitor.get(a.code)).me.nickname,'Direct link participant','unlisting does not revoke shared-link access');
 console.log('PASS: directory default-off, explicit opt-in, field minimization, presenter authorization, no private rooms, ended/reopen behavior, unlisting, and direct-link nickname flow.');
}finally{for(const code of created)await presenter.request({action:'deleteWorkshop',code,confirm:code});}
