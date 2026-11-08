(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.BeamJobs=api;})(globalThis,()=>{
 'use strict';
 const APP_VERSION='0.7.0',SCHEMA_VERSION=1,MAX_BEAMS=200,MAX_FILE_BYTES=2*1024*1024;
 const META_KEYS=['project','floor','beam','preparedBy','checkedBy','date'];
 function object(v){return v!==null&&typeof v==='object'&&!Array.isArray(v);}
 function fail(message){throw Error(message);}
 function metadata(raw){
  if(!object(raw)||META_KEYS.some(k=>typeof raw[k]!=='string'||raw[k].length>120)||Object.keys(raw).some(k=>!META_KEYS.includes(k)))fail('ข้อมูลชื่อโครงการหรือคานไม่ถูกต้อง (ไม่เกิน 120 ตัวอักษรต่อช่อง)');
  if(raw.date&&(!/^\d{4}-\d{2}-\d{2}$/.test(raw.date)||!Number.isFinite(Date.parse(raw.date))||new Date(raw.date).toISOString().slice(0,10)!==raw.date))fail('วันที่ในไฟล์ไม่ถูกต้อง');
  return Object.fromEntries(META_KEYS.map(k=>[k,raw[k]]));
 }
 function values(raw,schema){
  if(!object(raw)||Object.keys(raw).length!==Object.keys(schema).length||Object.keys(raw).some(k=>!Object.hasOwn(schema,k)))fail('ชุดช่องข้อมูลไม่ตรงกับแอปรุ่นนี้');
  const result={};
  for(const [key,rule] of Object.entries(schema)){
   const value=raw[key];if(!['string','number'].includes(typeof value)||String(value).length>64)fail('ค่าช่อง '+key+' ไม่ถูกต้อง');
   const text=String(value);
   if(rule.options?!rule.options.includes(text):(text!==''&&(!text.trim()||!Number.isFinite(Number(text)))))fail('ค่าช่อง '+key+' ไม่ถูกต้อง');
   result[key]=text;
  }
  return result;
 }
 function timestamp(value){if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T/.test(value)||!Number.isFinite(Date.parse(value)))fail('วันเวลาบันทึกไม่ถูกต้อง');return value;}
 function validate(raw,schema){
  if(!object(raw)||raw.format!=='sdm-beam-jobs'||raw.schemaVersion!==SCHEMA_VERSION)fail('ไม่ใช่ไฟล์งาน SDM Beam ที่รองรับ');
  if(!['0.6.0',APP_VERSION].includes(raw.appVersion))fail('ไฟล์มาจากแอปคนละรุ่น กรุณาใช้รุ่นที่รองรับไฟล์นี้');
  if(!Array.isArray(raw.beams)||raw.beams.length>MAX_BEAMS)fail('รองรับไม่เกิน '+MAX_BEAMS+' คานต่อชุด');
  const ids=new Set();
  const beams=raw.beams.map(b=>{
   if(!object(b)||typeof b.id!=='string'||!/^[a-zA-Z0-9_-]{1,80}$/.test(b.id)||ids.has(b.id))fail('รหัสคานซ้ำหรือไม่ถูกต้อง');ids.add(b.id);
   return {id:b.id,metadata:metadata(b.metadata),values:values(b.values,schema),savedAt:timestamp(b.savedAt)};
  });
  return {format:'sdm-beam-jobs',schemaVersion:SCHEMA_VERSION,appVersion:APP_VERSION,savedAt:timestamp(raw.savedAt),beams};
 }
 function empty(now=new Date().toISOString()){return {format:'sdm-beam-jobs',schemaVersion:SCHEMA_VERSION,appVersion:APP_VERSION,savedAt:now,beams:[]};}
 function parse(text,schema){if(typeof text!=='string'||new TextEncoder().encode(text).length>MAX_FILE_BYTES)fail('ไฟล์ใหญ่เกิน 2 MB');let data;try{data=JSON.parse(text);}catch{fail('อ่าน JSON ไม่ได้ กรุณาเลือกไฟล์ที่ส่งออกจาก SDM Beam');}return validate(data,schema);}
 function upsert(library,beam,schema,now=new Date().toISOString()){
  const clean=validate(library,schema),index=clean.beams.findIndex(b=>b.id===beam.id);
  if(index<0)clean.beams.push(beam);else clean.beams[index]=beam;
  clean.savedAt=now;return validate(clean,schema);
 }
 function append(library,incoming,schema,makeId,now=new Date().toISOString()){
  const clean=validate(library,schema),add=validate(incoming,schema);
  if(clean.beams.length+add.beams.length>MAX_BEAMS)fail('รวมแล้วเกิน '+MAX_BEAMS+' คาน กรุณาแยกเก็บไฟล์งาน');
  const used=new Set(clean.beams.map(b=>b.id));
  for(const beam of add.beams){const id=makeId();if(used.has(id))fail('สร้างรหัสคานซ้ำ กรุณาลองใหม่');used.add(id);clean.beams.push({...beam,id});}
  clean.savedAt=now;return validate(clean,schema);
 }
 return {APP_VERSION,SCHEMA_VERSION,MAX_BEAMS,MAX_FILE_BYTES,META_KEYS,empty,parse,validate,upsert,append,metadata,values};
});
