'use strict';
(function(){
 const jobs=BeamJobs,KEY='sdm-beam-library-v1',LEGACY='sdm-beam-saved-draft-v1';
 const form=document.getElementById('form'),byId=id=>document.getElementById(id);
 const schema=Object.fromEntries([...form.elements].filter(e=>e.name).map(e=>[e.name,e.tagName==='SELECT'?{options:[...e.options].map(o=>o.value)}:{}]));
 const metaFields={project:'jobProject',floor:'jobFloor',beam:'jobBeam',preparedBy:'jobPreparedBy',checkedBy:'jobCheckedBy',date:'jobDate'};
 let activeId=null,pendingImport=null,cleanSignature='',library=jobs.empty();
 const today=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');};
 const metadata=()=>Object.fromEntries(Object.entries(metaFields).map(([k,id])=>[k,byId(id).value]));
 function setMetadata(data){for(const [k,id] of Object.entries(metaFields))byId(id).value=data?.[k]??(k==='date'?today():'');}
 const signature=()=>JSON.stringify({values:mobileInputs(),metadata:metadata()});
 const dirty=()=>signature()!==cleanSignature;
 function notice(text){byId('jobNotice').textContent=text;}
 function guard(){return !dirty()||window.confirm('ข้อมูลคานปัจจุบันยังไม่ได้บันทึก ต้องการเปลี่ยนรายการและละทิ้งการแก้ไขนี้หรือไม่?');}
 function read(){const text=localStorage.getItem(KEY);return text===null?jobs.empty():jobs.parse(text,schema);}
 function write(data){localStorage.setItem(KEY,JSON.stringify(data));library=data;}
 function render(){
  const select=byId('savedBeams'),chosen=select.value;select.replaceChildren();
  const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent='เลือกคานที่บันทึก ('+library.beams.length+'/'+jobs.MAX_BEAMS+')';select.append(placeholder);
  for(const b of library.beams){const option=document.createElement('option');option.value=b.id;option.textContent=[b.metadata.project||'ไม่ระบุโครงการ',b.metadata.floor,b.metadata.beam||'ไม่ระบุชื่อคาน'].filter(Boolean).join(' / ')+' · '+new Date(b.savedAt).toLocaleString('th-TH');select.append(option);}
  select.value=library.beams.some(b=>b.id===activeId)?activeId:library.beams.some(b=>b.id===chosen)?chosen:'';byId('loadMobileDraft').disabled=!library.beams.length;
 }
 function snapshot(id=activeId||crypto.randomUUID()){return {id,metadata:jobs.metadata(metadata()),values:jobs.values(mobileInputs(),schema),savedAt:new Date().toISOString()};}
 function requireName(){if(!byId('jobBeam').value.trim()){notice('กรุณาระบุหมายเลขหรือชื่อคานก่อนบันทึกและส่งออก');byId('jobBeam').focus();return false;}return true;}
 function save(){
  if(!requireName())return null;
  const beam=snapshot(),data=jobs.upsert(read(),beam,schema);write(data);activeId=beam.id;cleanSignature=signature();render();notice('บันทึก '+beam.metadata.beam+' ในเบราว์เซอร์นี้แล้ว ('+data.beams.length+' คาน) ควรส่งออกไฟล์เพื่อสำรอง');return data;
 }
 function action(fn){return async()=>{try{await fn();}catch(e){notice('ยังทำรายการไม่ได้: '+e.message+' • ไม่เขียนทับรายการเดิม');}};}
 setMetadata();cleanSignature=signature();
 try{
  library=read();
  if(localStorage.getItem(KEY)===null){
   const text=localStorage.getItem(LEGACY);
   if(text){const old=JSON.parse(text);if(!old?.values)throw Error('ข้อมูลบันทึกรุ่นเดิมไม่ครบ');const b={id:crypto.randomUUID(),metadata:{project:'งานบันทึกเดิม',floor:'',beam:'คานเดิม',preparedBy:'',checkedBy:'',date:today()},values:jobs.values(old.values,schema),savedAt:old.savedAt||new Date().toISOString()};library=jobs.upsert(library,b,schema);write(library);notice('ย้ายข้อมูลบันทึกเดิมเข้ารายการคานแล้ว เลือก “คานเดิม” แล้วกดโหลด ข้อมูลต้นฉบับเดิมยังอยู่');}
  }
 }catch(e){notice('อ่านรายการเดิมไม่ได้: '+e.message+' ระบบจะไม่เขียนทับข้อมูลที่อ่านไม่ได้');}
 render();
 byId('saveMobileDraft').onclick=action(save);
 byId('loadMobileDraft').onclick=action(()=>{
  const id=byId('savedBeams').value;if(!id){notice('เลือกรายการคานก่อนกดโหลด');return;}if(!guard())return;
  const fresh=read(),beam=fresh.beams.find(b=>b.id===id);if(!beam)throw Error('ไม่พบคานนี้ กรุณาเปิดรายการใหม่');
  library=fresh;activeId=id;setMetadata(beam.metadata);restoreMobileInputs(beam.values);cleanSignature=signature();render();notice('โหลด '+beam.metadata.beam+' แล้ว กรุณาตรวจข้อมูลและกดคำนวณใหม่');
 });
 byId('newBeam').onclick=()=>{if(!guard())return;activeId=null;form.reset();setMetadata();form.dispatchEvent(new Event('input',{bubbles:true}));cleanSignature=signature();byId('savedBeams').value='';notice('เริ่มคานใหม่แล้ว รายการที่บันทึกไว้ยังอยู่');};
 const originalExample=byId('resetExample').onclick;
 byId('resetExample').onclick=()=>{if(!guard())return;activeId=null;setMetadata({project:'ตัวอย่างตรวจเทียบ',floor:'',beam:'EX-01',preparedBy:'',checkedBy:'',date:today()});originalExample();byId('savedBeams').value='';cleanSignature='';notice('โหลด EX-01 แล้ว ตรวจค่าที่หน้าตัดกลางคานและรายการที่ยังไม่ผ่านหรือยังไม่ตรวจ ก่อนบันทึกเป็นคานใหม่');};
 byId('loadWorkedExample').onclick=()=>{byId('resetExample').click();byId('sectionResults').scrollIntoView({behavior:'smooth'});};
 byId('exportJobs').onclick=action(()=>{
  if(!requireName())return;
  const beam=snapshot(),data=jobs.upsert(read(),beam,schema);let saved=true;
  try{write(data);activeId=beam.id;cleanSignature=signature();render();}catch{saved=false;}
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='sdm-beam-jobs-'+today()+'.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);
  notice('ส่งออก '+data.beams.length+' คาน รวมค่าปัจจุบันแล้ว'+(saved?'':' แต่บันทึกในเบราว์เซอร์ไม่ได้')+' กรุณาเก็บไฟล์ไว้ในที่ปลอดภัย ไฟล์มีชื่อผู้จัดทำและข้อมูลโครงการที่กรอก');
 });
 byId('importJobs').onclick=()=>byId('importFile').click();
 byId('importFile').onchange=action(async()=>{
  const file=byId('importFile').files[0];byId('importFile').value='';if(!file)return;
  if(file.size>jobs.MAX_FILE_BYTES)throw Error('ไฟล์ใหญ่เกิน 2 MB');pendingImport=jobs.parse(await file.text(),schema);
  if(!pendingImport.beams.length)throw Error('ไฟล์ไม่มีรายการคาน');
  byId('importSummary').textContent='พบ '+pendingImport.beams.length+' คาน: '+pendingImport.beams.slice(0,5).map(b=>[b.metadata.project,b.metadata.beam].filter(Boolean).join(' / ')).join(', ')+(pendingImport.beams.length>5?' …':'');
  byId('importDialog').showModal();
 });
 byId('cancelImport').onclick=()=>{pendingImport=null;byId('importDialog').close();};
 byId('confirmImport').onclick=action(()=>{if(!pendingImport)return;const n=pendingImport.beams.length;const data=jobs.append(read(),pendingImport,schema,()=>crypto.randomUUID());write(data);pendingImport=null;render();byId('importDialog').close();notice('เพิ่ม '+n+' คานจากไฟล์แล้ว ไม่ทับรายการเดิม เลือกคานแล้วกดโหลดเพื่อใช้งาน');});
 byId('importDialog').addEventListener('cancel',()=>{pendingImport=null;});
 window.addEventListener('storage',event=>{if(event.key===KEY){try{library=read();render();notice('รายการในเครื่องเปลี่ยนจากอีกแท็บ ข้อมูลที่กำลังกรอกยังอยู่');}catch(e){notice(e.message);}}});
 window.workspaceSnapshot=()=>({values:mobileInputs(),metadata:metadata(),activeId});
 if(window.sdmRestoredWorkspace){const draft=window.sdmRestoredWorkspace;try{setMetadata(jobs.metadata(draft.metadata));activeId=draft.activeId||null;render();cleanSignature='';notice('คืนข้อมูลก่อนอัปเดตแล้ว กรุณาตรวจและคำนวณใหม่ก่อนออกรายงาน');}catch(e){notice('คืนชื่อโครงการไม่ได้: '+e.message);}delete window.sdmRestoredWorkspace;}
 function node(tag,text,parent){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;parent.append(e);return e;}
 function table(parent,headers,rows){const t=node('table',undefined,parent),thead=node('thead',undefined,t),head=node('tr',undefined,thead);headers.forEach(h=>node('th',h,head));const body=node('tbody',undefined,t);for(const row of rows){const tr=node('tr',undefined,body);row.forEach(v=>node('td',String(v),tr));}return t;}
 function printReport(){
  const output=byId('printReport');output.replaceChildren();const meta=metadata();
  node('h2','รายงานตรวจทานหน้าตัดคาน • SDM Beam '+jobs.APP_VERSION,output);
  table(output,['ข้อมูลรายงาน','รายละเอียด'],[['โครงการ',meta.project||'ไม่ระบุ'],['ชั้น / คาน',[meta.floor,meta.beam].filter(Boolean).join(' / ')||'ไม่ระบุ'],['วันที่รายการ',meta.date||'ไม่ระบุ'],['ผู้จัดทำ (ชื่อที่กรอก)',meta.preparedBy||'ไม่ระบุ'],['ผู้ตรวจ (ชื่อที่กรอก ยังไม่ใช่ลายเซ็นอนุมัติ)',meta.checkedBy||'ไม่ระบุ'],['ออกรายงาน',new Date().toLocaleString('th-TH')],['มาตรฐานในโมดูล','กำลังหน้าตัด ACI 318-19 • ฝัง–ทาบ วสท. 011008-21']]);
  if(!current){node('p','ยังไม่มีผลคำนวณที่ตรงกับข้อมูลปัจจุบัน กรุณากดคำนวณก่อนออกรายงาน',output).className='warn';return;}
  node('p','ผลเฉพาะขอบเขตต้นแบบ ไม่ใช่การอนุมัติแบบก่อสร้าง • '+current.review.failed+' รายการต้องแก้ • '+current.review.pending+' รายการยังไม่ตรวจ',output).className='warn';
  node('h3','ข้อมูลที่ใช้คำนวณ',output);
  table(output,['รายการ (พร้อมหน่วย)','ค่าที่กรอก'],[...form.elements].filter(e=>e.name).map(e=>[guidanceLabel(e.name),e.value===''?'ยังไม่มีข้อมูล':e.tagName==='SELECT'?e.options[e.selectedIndex]?.textContent:e.value]));
  for(const z of current.m.stations){const r=z.result;const section=node('div',undefined,output);section.className='print-station';node('h3','หน้าตัด '+z.name+' • |Mu| = '+fmt(z.Mu)+' kN·m',section);table(section,['รายการ','ผล'],[['เหล็กบน / ล่าง',z.top+' / '+z.bottom+' เส้น DB'+current.p.db],['d / As',fmt(r.d)+' mm / '+fmt(r.As)+' mm²'],['กำลังดัด φMn',r.flex===null?'นอกขอบเขต':fmt(r.flex)+' kN·m'],['กำลังเฉือนที่ใช้',fmt(r.shear)+' kN'],['ปลอก',current.p.ds+' mm @ '+r.s+' mm'],...r.checks.map(([title,ok])=>[title,ok?'ผ่าน':'ไม่ผ่าน'])]);}
  node('h3','รายการต้องแก้และรายการยังไม่ตรวจ',output);table(output,['รายการ','สถานะ'],current.review.items.filter(i=>i.ok!==true).map(i=>[i.title,i.ok===null?'ยังไม่ตรวจ':'ไม่ผ่าน']));
 }
 window.addEventListener('beforeprint',printReport);
 byId('print').onclick=()=>{if(!current){notice('ข้อมูลเปลี่ยนหรือยังคำนวณไม่ได้ กรุณากดคำนวณก่อนพิมพ์');byId('jobNotice').scrollIntoView({behavior:'smooth'});return;}printReport();window.print();};
})();
