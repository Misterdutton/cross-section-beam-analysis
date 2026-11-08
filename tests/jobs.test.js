const {test}=require('node:test'),assert=require('node:assert/strict');
const jobs=require('../dist/jobs');
const schema={b:{},Mu:{},cutTL:{},db:{options:['16','20']},memberType:{options:['continuous','simple']}};
const now='2026-11-08T12:00:00.000Z';
const beam=(id='beam-1')=>({id,metadata:{project:'โครงการทดสอบ',floor:'2',beam:'B1',preparedBy:'ผู้จัดทำ',checkedBy:'',date:'2026-11-08'},values:{b:'300',Mu:'120',cutTL:'',db:'20',memberType:'continuous'},savedAt:now});
const library=(...beams)=>({...jobs.empty(now),beams});
test('backup round trip preserves Thai project identity, numeric input and blank unresolved analysis',()=>{
 const input=library(beam()),restored=jobs.parse(JSON.stringify(input),schema);assert.deepEqual(restored,input);assert.equal(restored.beams[0].values.cutTL,'');assert.equal(restored.beams[0].metadata.project,'โครงการทดสอบ');
});
test('saving a loaded beam replaces only its ID; a new beam preserves all existing beams',()=>{
 const original=library(beam('a'),beam('b')),edited=beam('a');edited.values.Mu='150';const result=jobs.upsert(original,edited,schema,now);assert.equal(result.beams.length,2);assert.equal(result.beams[0].values.Mu,'150');assert.deepEqual(result.beams[1],original.beams[1]);assert.equal(original.beams[0].values.Mu,'120');assert.equal(jobs.upsert(result,beam('c'),schema,now).beams.length,3);
});
test('import adds a copy even when IDs collide, preserving existing project data and source file',()=>{
 const existing=library(beam()),incoming=library(beam());incoming.beams[0].metadata.beam='B2';const merged=jobs.append(existing,incoming,schema,()=> 'new-id',now);assert.equal(merged.beams.length,2);assert.equal(merged.beams[0].metadata.beam,'B1');assert.equal(merged.beams[1].metadata.beam,'B2');assert.equal(merged.beams[1].id,'new-id');assert.equal(incoming.beams[0].id,'beam-1');assert.equal(existing.beams.length,1);
});
test('newer schemas and incompatible app versions are rejected before importing',()=>{
 for(const patch of [{format:'other'},{schemaVersion:2},{appVersion:'9.0.0'},{beams:{}}])assert.throws(()=>jobs.validate({...library(beam()),...patch},schema));
 assert.equal(jobs.validate({...library(beam()),appVersion:'0.6.0'},schema).appVersion,jobs.APP_VERSION);
 assert.equal(jobs.validate({...library(beam()),appVersion:'0.7.0'},schema).appVersion,jobs.APP_VERSION);
 assert.throws(()=>jobs.validate({...library(beam()),appVersion:'0.7.999'},schema));
});
test('untrusted backups cannot inject unknown inputs, result status, nonfinite numbers or arbitrary select values',()=>{
 for(const patch of [{b:'Infinity'},{b:'<script>1</script>'},{b:' '},{db:'999'},{memberType:'../../private'},{extra:'1'},{__proto__:null,constructor:'1'}]){const b=beam();b.values={...b.values,...patch};assert.throws(()=>jobs.validate(library(b),schema));}
 const input=library(beam());input.beams[0].checks={approved:true};const result=jobs.validate(input,schema);assert(!Object.hasOwn(result.beams[0],'checks'));
 const missing=beam();delete missing.values.cutTL;assert.throws(()=>jobs.validate(library(missing),schema));
});
test('invalid dates, duplicate IDs, oversized metadata, broken JSON and oversized files are rejected',()=>{
 assert.throws(()=>jobs.validate(library(beam(),beam()),schema));
 for(const patch of [{date:'2026-02-30'},{date:'invalid'},{beam:'x'.repeat(121)},{preparedBy:42}]){const b=beam();b.metadata={...b.metadata,...patch};assert.throws(()=>jobs.validate(library(b),schema));}
 const bad=beam();bad.savedAt='not a date';assert.throws(()=>jobs.validate(library(bad),schema));
 assert.throws(()=>jobs.parse('{',schema));assert.throws(()=>jobs.parse(' '.repeat(jobs.MAX_FILE_BYTES+1),schema));
});
test('capacity overflow and generated ID collisions leave saved libraries intact',()=>{
 const full=library(...Array.from({length:jobs.MAX_BEAMS},(_,i)=>beam('b'+i))),snapshot=JSON.stringify(full);
 assert.throws(()=>jobs.append(full,library(beam()),schema,()=> 'new',now));assert.throws(()=>jobs.upsert(full,beam('new'),schema,now));assert.equal(JSON.stringify(full),snapshot);
 assert.throws(()=>jobs.append(library(beam()),library(beam()),schema,()=> 'beam-1',now));
});
test('HTML-like project labels remain plain data in backup round trips',()=>{
 const b=beam();b.metadata.project='<img src=x onerror=alert(1)>';assert.equal(jobs.parse(JSON.stringify(library(b)),schema).beams[0].metadata.project,b.metadata.project);
});
