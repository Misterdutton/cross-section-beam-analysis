const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm');
const dist=path.resolve(__dirname,'../dist'),source=fs.readFileSync(path.join(dist,'sw.js'),'utf8');
function worker(base='https://example.test/cross-section-beam-analysis/',options={}){
 const handlers={},stores=new Map(),state={online:true,calls:0,skips:0,claims:0,maxInFlight:0};let inFlight=0;const networkQueue=[];
 const open=async name=>{if(!stores.has(name))stores.set(name,new Map());const store=stores.get(name);return {put:async(key,response)=>store.set(typeof key==='string'?key:key.url,response.clone()),match:async key=>store.get(typeof key==='string'?key:key.url)?.clone()};};
 const context={URL,Request,Response,Promise,console,caches:{open,keys:async()=>[...stores.keys()],delete:async name=>stores.delete(name)},self:{location:{href:base+'sw.js'},clients:{claim:async()=>state.claims++},skipWaiting:()=>{state.skips++;},addEventListener:(name,handler)=>handlers[name]=handler},fetch:async request=>{
  state.calls++;if(!state.online)throw Error('Network unavailable');const url=typeof request==='string'?request:request.url;
  const name=new URL(url).pathname.slice(new URL(base).pathname.length)||'index.html';
  if(name===options.failAsset)return new Response('missing',{status:404});
  let body=fs.readFileSync(path.join(dist,name));if(options.staleShell&&name==='index.html')body=Buffer.from(body.toString().replace('name="sdm-app-version" content="0.7.0"','name="sdm-app-version" content="0.5.0"'));
  if(options.drainGatedNetwork){if(inFlight>=3)await new Promise(resolve=>networkQueue.push(resolve));inFlight++;state.maxInFlight=Math.max(state.maxInFlight,inFlight);}
  const response=new Response(body,{status:200});
  if(options.drainGatedNetwork){let released=false;const clone=response.clone.bind(response);response.clone=()=>{const copy=clone(),read=copy.arrayBuffer.bind(copy);copy.arrayBuffer=async()=>{const bytes=await read();if(!released){released=true;inFlight--;networkQueue.shift()?.();}return bytes;};return copy;};}
  return response;
 }};
 vm.runInNewContext(source,context);
 const dispatch=async(name,event={})=>{const pending=[];handlers[name]({...event,waitUntil:p=>pending.push(p)});await Promise.all(pending);};
 const get=async(url,method='GET')=>{let result;handlers.fetch({request:new Request(url,{method}),respondWith:p=>result=p});return result?await result:null;};
 const status=async()=>{let value;await dispatch('message',{data:{type:'SHELL_STATUS'},ports:[{postMessage:v=>value=v}]});return value;};
 return {handlers,stores,state,dispatch,get,status,base};
}
test('full shell installs under a GitHub project subpath and serves offline without network requests',async()=>{
 const w=worker();await w.dispatch('install');await w.dispatch('activate');const status=await w.status();assert(status.ready);assert.equal(status.version,'0.7.0');assert.equal(w.state.skips,0);
 const before=w.state.calls;w.state.online=false;
 for(const file of ['', 'engine.js','mobile.js','icon-192.png','manifest.webmanifest']){const response=await w.get(w.base+file);assert.equal(response.status,200);}
 assert((await (await w.get(w.base)).text()).includes('id="form"'));assert.equal(w.state.calls,before);
});
test('a failed asset never leaves a newly installed partial shell',async()=>{
 const w=worker(undefined,{failAsset:'guidance.js'});await assert.rejects(()=>w.dispatch('install'));assert.equal(w.stores.size,0);
});
test('connection-limited hosts finish installation by draining bodies before queuing the full shell',async()=>{
 const w=worker(undefined,{drainGatedNetwork:true});let timeout;
 try{await Promise.race([w.dispatch('install'),new Promise((_,reject)=>{timeout=setTimeout(()=>reject(Error('Asset bodies were not consumed; queued requests stalled')),3000);})]);}finally{clearTimeout(timeout);}
 assert((await w.status()).ready);assert.equal(w.state.maxInFlight,3);
});
test('old or sign-in shell is rejected before offline availability is announced',async()=>{
 const w=worker(undefined,{staleShell:true});await assert.rejects(()=>w.dispatch('install'));assert.equal((await w.status()).ready,false);
});
test('only known application GET requests are intercepted; authentication, external links and queries stay on the network',async()=>{
 const w=worker();await w.dispatch('install');for(const [url,method] of [[w.base+'signin','GET'],[w.base+'?code=secret','GET'],[w.base+'?other=value','GET'],['https://other.test/engine.js','GET'],[w.base+'unknown.js','GET'],[w.base,'POST']])assert.equal(await w.get(url,method),null);
});
test('activation cleans only older app caches and an update needs an explicit message',async()=>{
 const w=worker();await w.dispatch('install');w.stores.set('sdm-beam-shell-0.5.0',new Map());w.stores.set('unrelated-cache',new Map());await w.dispatch('activate');assert(!w.stores.has('sdm-beam-shell-0.5.0'));assert(w.stores.has('unrelated-cache'));assert.equal(w.state.skips,0);await w.dispatch('message',{data:{type:'SKIP_WAITING'}});assert.equal(w.state.skips,1);
});
test('the root hosting scope and a trailing empty query use the same offline shell',async()=>{
 const w=worker('https://example.test/');await w.dispatch('install');w.state.online=false;const response=await w.get(w.base+'?');assert.equal(response.status,200);
});
