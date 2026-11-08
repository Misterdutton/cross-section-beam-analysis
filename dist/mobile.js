const MOBILE_VERSION='0.6.0';
const MOBILE_DRAFT_KEY='sdm-beam-saved-draft-v1';
const MOBILE_UPDATE_KEY='sdm-beam-before-update';
let installPrompt=null,mobileRegistration=null,updateRequested=false,offlineReady=false,offlineWatchdog=null;
function mobileStatus(id,message){const target=document.getElementById(id);if(target)target.textContent=message;}
function mobileInputs(){return Object.fromEntries([...document.querySelector('form').elements].filter(e=>e.name).map(e=>[e.name,e.value]));}
function restoreMobileInputs(values){
 for(const [key,value] of Object.entries(values||{})){const input=document.querySelector('form').elements.namedItem(key);if(input&&(typeof value==='string'||typeof value==='number')){if(input.tagName!=='SELECT'||[...input.options].some(o=>o.value===String(value)))input.value=String(value);}}
 document.querySelector('form').dispatchEvent(new Event('input',{bubbles:true}));
 mobileStatus('mobileNotice','โหลดข้อมูลแล้ว กรุณาตรวจหน่วยและกดคำนวณเพื่อแสดงผลใหม่');
}
function checkOfflineReady(worker){
 if(!worker){mobileStatus('offlineStatus','กำลังเตรียมออฟไลน์…');return;}
 const channel=new MessageChannel();
 const timeout=setTimeout(()=>mobileStatus('offlineStatus','ยังยืนยันออฟไลน์ไม่ได้ เปิดออนไลน์แล้วลองใหม่'),6000);
 channel.port1.onmessage=event=>{clearTimeout(timeout);const status=event.data;
  offlineReady=status.ready&&status.version===MOBILE_VERSION;if(offlineReady)clearTimeout(offlineWatchdog);
  mobileStatus('offlineStatus',offlineReady?'พร้อมใช้ออฟไลน์ • รุ่น '+MOBILE_VERSION:status.ready?'มีรุ่นใหม่ กรุณาอัปเดตก่อนออกหน้างาน':'ยังเตรียมออฟไลน์ไม่ครบ');
 };
 worker.postMessage({type:'SHELL_STATUS'},[channel.port2]);
}
function offerMobileUpdate(){if(mobileRegistration?.waiting){document.getElementById('updateApp').hidden=false;mobileStatus('mobileNotice','มีแอปรุ่นใหม่ กดอัปเดตเมื่อพร้อม ข้อมูลที่กำลังกรอกจะเก็บไว้ในเครื่องชั่วคราว');}}
function initMobile(){
 const network=()=>mobileStatus('networkStatus',navigator.onLine?'อุปกรณ์ออนไลน์':'อุปกรณ์ออฟไลน์');network();window.addEventListener('online',network);window.addEventListener('offline',network);
 const instructions=document.getElementById('installHelp'),drawing=document.getElementById('drawingDialog');
 document.getElementById('installApp').onclick=async()=>{if(installPrompt){await installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;}else instructions.showModal();};
 window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;});
 document.getElementById('closeInstallHelp').onclick=()=>instructions.close();
 document.getElementById('expandDiagram').onclick=()=>{
  const svg=document.querySelector('#side svg');if(!svg){mobileStatus('mobileNotice','กรอกข้อมูลและคำนวณก่อนเปิดรูปเต็มจอ');return;}
  const copy=svg.cloneNode(true);copy.style.minWidth='0';copy.style.width='100%';copy.removeAttribute('class');copy.style.height='auto';
  document.getElementById('drawingFull').replaceChildren(copy);document.getElementById('drawingFull').style.width='100%';document.getElementById('drawingZoom').value='100';drawing.showModal();
 };
 document.getElementById('drawingZoom').oninput=event=>{document.getElementById('drawingFull').style.width=event.target.value+'%';};
 document.getElementById('closeDrawing').onclick=()=>{drawing.close();document.getElementById('drawingFull').style.width='100%';};
 document.getElementById('fieldCalculate').onclick=()=>{document.querySelector('form').requestSubmit();document.getElementById('guidanceSection').scrollIntoView({behavior:'smooth'});};
 document.getElementById('saveMobileDraft').onclick=()=>{try{localStorage.setItem(MOBILE_DRAFT_KEY,JSON.stringify({version:MOBILE_VERSION,savedAt:new Date().toISOString(),values:mobileInputs()}));mobileStatus('mobileNotice','บันทึกข้อมูลในเบราว์เซอร์เครื่องนี้แล้ว ไม่ได้ส่งค่าคานไป GitHub');}catch{mobileStatus('mobileNotice','บันทึกในเครื่องไม่ได้ กรุณาตรวจพื้นที่หรือการตั้งค่าเบราว์เซอร์');}};
 document.getElementById('loadMobileDraft').onclick=()=>{try{const draft=JSON.parse(localStorage.getItem(MOBILE_DRAFT_KEY)||'null');if(!draft?.values){mobileStatus('mobileNotice','ยังไม่มีข้อมูลที่บันทึกในเบราว์เซอร์เครื่องนี้');return;}restoreMobileInputs(draft.values);}catch{mobileStatus('mobileNotice','อ่านข้อมูลที่บันทึกไว้ไม่ได้ กรุณากรอกใหม่');}};
 try{const draft=sessionStorage.getItem(MOBILE_UPDATE_KEY);if(draft){sessionStorage.removeItem(MOBILE_UPDATE_KEY);restoreMobileInputs(JSON.parse(draft));}}catch{}
 document.getElementById('updateApp').onclick=()=>{
  if(!mobileRegistration?.waiting){mobileStatus('mobileNotice','ยังไม่มีรุ่นใหม่รออัปเดต');return;}
  try{sessionStorage.setItem(MOBILE_UPDATE_KEY,JSON.stringify(mobileInputs()));}catch{mobileStatus('mobileNotice','เก็บข้อมูลก่อนอัปเดตไม่ได้ กรุณาบันทึกข้อมูลก่อนแล้วเปิดแอปใหม่');return;}
  updateRequested=true;mobileRegistration.waiting.postMessage({type:'SKIP_WAITING'});
 };
 if(!('serviceWorker' in navigator)||!window.isSecureContext){mobileStatus('offlineStatus','เบราว์เซอร์นี้ยังไม่รองรับโหมดออฟไลน์ ใช้ลิงก์ออนไลน์แทน');return;}
 offlineWatchdog=setTimeout(()=>{if(!offlineReady)mobileStatus('offlineStatus','ยังไม่พร้อมออฟไลน์ กรุณาเปิดด้วย Chrome หรือ Safari บนมือถือแล้วลองใหม่');},15000);
 navigator.serviceWorker.addEventListener('controllerchange',()=>{if(updateRequested)location.reload();else checkOfflineReady(navigator.serviceWorker.controller);});
 navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'}).then(async registration=>{
  mobileRegistration=registration;offerMobileUpdate();
  registration.addEventListener('updatefound',()=>{const installing=registration.installing;installing?.addEventListener('statechange',()=>{if(installing.state==='installed'){offerMobileUpdate();checkOfflineReady(registration.active||navigator.serviceWorker.controller);}});});
  const ready=await navigator.serviceWorker.ready;checkOfflineReady(ready.active);
  if(navigator.onLine)registration.update().catch(()=>{});
 }).catch(()=>{clearTimeout(offlineWatchdog);mobileStatus('offlineStatus','เตรียมออฟไลน์ไม่สำเร็จ เปิดลิงก์ออนไลน์แล้วลองใหม่');});
}
initMobile();
