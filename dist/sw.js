/* Bump VERSION whenever any shell asset changes. Each release is cached as one unit. */
const VERSION='0.7.0';
const CACHE_PREFIX='sdm-beam-shell-';
const CACHE_NAME=CACHE_PREFIX+VERSION;
const SHELL_FILES=['./','index.html','style.css','engine.js','layout.js','eit-detailing.js','eit-ui.js','guidance.js','guidance-ui.js','jobs.js','workspace.js','app.js','mobile.js','manifest.webmanifest','icon.svg','icon-192.png','icon-512.png','icon-maskable.png','apple-touch-icon.png'];
const SCOPE_URL=new URL('./',self.location.href);
const SHELL_URLS=SHELL_FILES.map(path=>new URL(path,SCOPE_URL).href);
function shellRequestUrl(request){
 if(request.method!=='GET')return null;
 const url=new URL(request.url);
 if(url.origin!==SCOPE_URL.origin||url.search)return null;
 url.search=''; // Normalize an empty trailing '?' without accepting actual query parameters.
 return SHELL_URLS.includes(url.href)?url.href:null;
}
async function installShell(){
 const responses=await Promise.all(SHELL_URLS.map(async url=>{
  const response=await fetch(new Request(url,{cache:'reload',credentials:'same-origin',redirect:'error'}));
  if(!response.ok||response.type==='opaque')throw Error('Shell asset unavailable');
  // Drain each body before awaiting the full batch. Otherwise connection-limited
  // HTTP/1 hosts can stall queued fetches while earlier bodies remain unread.
  await response.clone().arrayBuffer();
  if(url===SCOPE_URL.href||url===new URL('index.html',SCOPE_URL).href){const text=await response.clone().text();if(!text.includes('name="sdm-app-version" content="'+VERSION+'"')||!text.includes('id="form"'))throw Error('Unexpected shell version or sign-in page');}
  return [url,response];
 }));
 const cache=await caches.open(CACHE_NAME);
 await Promise.all(responses.map(([url,response])=>cache.put(url,response)));
}
async function shellComplete(){const cache=await caches.open(CACHE_NAME);return (await Promise.all(SHELL_URLS.map(url=>cache.match(url)))).every(Boolean);}
self.addEventListener('install',event=>event.waitUntil(installShell()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 if(!await shellComplete())throw Error('Incomplete shell');
 for(const name of await caches.keys())if(name.startsWith(CACHE_PREFIX)&&name!==CACHE_NAME)await caches.delete(name);
 await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
 const url=shellRequestUrl(event.request);if(!url)return;
 // Cache-first keeps HTML and calculator scripts on the same release, online or offline.
 event.respondWith((async()=>{const cache=await caches.open(CACHE_NAME);return await cache.match(url)||fetch(event.request);})());
});
self.addEventListener('message',event=>{
 if(event.data?.type==='SKIP_WAITING'){event.waitUntil(self.skipWaiting());return;}
 if(event.data?.type==='SHELL_STATUS')event.waitUntil((async()=>{event.ports?.[0]?.postMessage({version:VERSION,ready:await shellComplete()});})());
});
