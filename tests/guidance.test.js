const {test}=require('node:test'),assert=require('node:assert/strict');
const {reviewSnapshot,reviewChecks,buildReview,proposeGuidance,evaluateGuidancePatch}=require('../dist/guidance');
const p={b:300,h:500,cover:40,db:20,ds:9,fc:28,fy:400,fyt:235,Mu:120,Vu:100,agg:20};
const q={L:5000,ml:150,mr:150,topBase:2,bottomBase:2,leftRatio:.25,rightRatio:.25,bottomRatio:.5};
const a={memberType:'continuous',embedLeft:300,embedRight:300,lapMode:0,lapTopLength:800,lapBottomLength:800,lapTopCenter:.5,lapBottomCenter:.25,cutTL:null,cutTR:null,cutBML:null,cutBMR:null,inflectL:null,inflectR:null,cutVu:null,cutPhiVn:null};
const snapshot=(pp={},qq={},aa={})=>reviewSnapshot({...p,...pp},{...q,...qq},{...a,...aa});
test('every unresolved check has actionable guidance, and physical anchors have no fill-to-pass action',()=>{
 const s=snapshot(),r=buildReview(s);assert.equal(r.failed,6);assert.equal(r.pending,13);
 assert.equal(r.items.length,reviewChecks(s).filter(c=>c.ok!==true).length);
 for(const i of r.items){assert(i.values.length>0);assert(i.steps.length>0);assert(i.title.length>0);}
 for(const item of r.items.filter(i=>i.title.startsWith('ฝังตรง'))){assert.equal(item.proposal,null);assert.match(item.steps.join(' '),/มีจริง|พื้นที่รองรับ/);}
});
test('cut extension proposal is verified with the same analysis, and does not clear pending items',()=>{
 const s=snapshot(),item=buildReview(s).items.find(i=>i.title==='จุดตัด TL: ระยะจากหน้าตัดแรงดึงสูงสุดถึงปลายเหล็ก');
 const r=proposeGuidance(s,item);assert(r.targetResolved);assert.equal(r.patch.leftRatio,1/3);assert.equal(r.after.p.Mu,p.Mu);assert.deepEqual(r.after.a,a);assert(r.pending>0);assert.equal(s.q.leftRatio,.25);
});
test('lap recommendation calculates a sufficient length but exposes other failures',()=>{
 const s=snapshot({}, {}, {lapMode:1}),item=buildReview(s).items.find(i=>i.title==='ทาบรับแรงดึงชั้น B เหล็กบน'),r=proposeGuidance(s,item);
 assert.equal(r.patch.lapTopLength,1830);assert(r.targetResolved);assert(r.remaining.length>0);assert(r.pending>0);assert.equal(s.a.lapTopLength,800);
});
test('candidate comparison explicitly reports a new overlap failure',()=>{
 const s=snapshot(),target='eit:จุดตัด TL: ระยะจากหน้าตัดแรงดึงสูงสุดถึงปลายเหล็ก',r=evaluateGuidancePatch(s,{leftRatio:.75},target);
 assert(r.targetResolved);assert(r.newFailures.some(c=>c.key==='layout:top'));
});
test('proposal layer rejects alterations to loads, measured availability, materials and analysis positions',()=>{
 const s=snapshot();for(const key of ['Mu','Vu','ml','mr','cover','fc','fy','fyt','agg','embedLeft','embedRight','cutTL','cutTR','inflectL','inflectR','cutVu','cutPhiVn','memberType'])assert.throws(()=>evaluateGuidancePatch(s,{[key]:1},'layout:top'),key);
});
test('missing analysis and splice approval never get fabricated automatic fixes',()=>{
 const s=snapshot({}, {}, {lapMode:1}),r=buildReview(s);
 for(const item of r.items.filter(i=>i.ok===null)){assert.equal(item.proposal,null);assert.equal(proposeGuidance(s,item),null);}
});
test('section dimension search verifies the target rather than assuming more steel helps',()=>{
 const s=snapshot({b:200,db:32,Mu:220}),item=buildReview(s).items.find(i=>i.key==='section:1:2');assert(item);
 const r=proposeGuidance(s,item);assert(r?.targetResolved);assert(r.after.p.h>=s.p.h);assert(r.after.p.b>=s.p.b);assert.deepEqual(r.after.a,s.a);assert.equal(r.after.p.Mu,220);assert.equal(r.after.p.cover,40);
});
test('containment advice gives bounds without choosing an unverified splice position',()=>{
 const s=snapshot({}, {}, {lapMode:1,lapTopCenter:0}),item=buildReview(s).items.find(i=>i.title==='รอยทาบเหล็กบนอยู่ในช่วงที่จำลอง');assert(item);assert.equal(item.proposal,null);assert.match(item.steps.join(' '),/ศูนย์กลาง/);
});
