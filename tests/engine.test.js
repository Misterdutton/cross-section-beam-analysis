const {test}=require('node:test');
const assert=require('node:assert/strict');
const {design}=require('../dist/engine');
const p={b:300,h:500,cover:40,db:20,ds:9,fc:28,fy:400,fyt:235,Mu:120,Vu:100,agg:20};
test('reference example retains checked reinforcement and capacity',()=>{
 const r=design(p);assert.equal(r.n,3);assert.equal(r.s,220);assert.equal(r.d,441);assert(r.ok);
 assert(Math.abs(r.flex-140.6704868773)<1e-8);assert(Math.abs(r.shear-134.2104834132)<1e-8);
});
test('wide beam cannot pass two-leg transverse spacing',()=>{
 const r=design({...p,b:800,Mu:100,Vu:80});assert(!r.ok);assert.equal(r.legSpacing,711);assert.equal(r.legMax,441);
 assert.equal(r.checks.find(x=>x[0].includes('ข้ามความกว้าง'))[1],false);
});
test('missing, nonfinite, invalid geometry and out-of-scope values are rejected',()=>{
 for(const k of Object.keys(p)){const q={...p};delete q[k];assert.throws(()=>design(q),k);for(const v of [NaN,Infinity,''])assert.throws(()=>design({...p,[k]:v}),k);}
 for(const q of [{h:100},{fc:16},{fc:56},{Mu:-1},{Vu:-1},{Mu:10000},{b:100},{b:1e308}])assert.throws(()=>design({...p,...q}));
 assert(Number.isFinite(design({...p,Mu:0,Vu:0}).Asreq));
});
test('non-tension-controlled section has no usable phi=0.9 capacity',()=>{
 const r=design({...p,b:200,db:32,Mu:220,Vu:20});assert(!r.tensionControlled);assert.equal(r.flex,null);assert(!r.ok);
});
test('shear capacity respects section ceiling and fails excessive demand',()=>{
 const r=design({...p,Vu:450});assert(r.shearRaw>r.shearLimit);assert.equal(r.shear,r.shearLimit);assert(!r.ok);
});
test('spacing regime switches at required Vs threshold',()=>{
 const r=design(p),threshold=.33*Math.sqrt(p.fc)*p.b*r.d,vc=r.Vc*1000;
 const low=design({...p,Vu:.75*(vc+threshold-1)/1000}),high=design({...p,Vu:.75*(vc+threshold+1)/1000});
 assert.equal(low.smax,r.d/2);assert.equal(high.smax,r.d/4);assert.equal(low.legMax,r.d);assert.equal(high.legMax,r.d/2);
});
test('reverse checks use strain compatibility and equilibrium over 720 cases',()=>{
 let passed=0,total=0;
 for(const b of [200,300,500,800])for(const h of [300,500,700])for(const fc of [17,28,41,55])for(const db of [16,20,32])for(const Mu of [0,50,120,250,500]){
  total++;const q={...p,b,h,fc,db,Mu};let r;try{r=design(q);}catch{continue;}if(!r.ok)continue;passed++;
  // Independent equilibrium solution: concrete C(c) equals steel T(c).
  const d=h-q.cover-q.ds-db/2,As=r.n*Math.PI*db**2/4;
  let lo=1e-10,hi=d;for(let i=0;i<100;i++){const c=(lo+hi)/2,eps=.003*(d-c)/c,fs=Math.min(200000*eps,q.fy);if(.85*fc*b*r.beta*c>As*fs)hi=c;else lo=c;}
  const c=(lo+hi)/2,a=r.beta*c,T=As*Math.min(200000*.003*(d-c)/c,q.fy),C=.85*fc*b*a;
  assert(Math.abs(T-C)/T<1e-10);assert(Math.abs(.9*C*(d-a/2)/1e6-r.flex)<1e-7);assert(r.flex>=Mu);
  const av=2*Math.PI*q.ds**2/4,vc=.17*Math.sqrt(fc)*b*d,vs=av*q.fyt*d/r.s;
  assert(r.shear<=.75*(vc+.66*Math.sqrt(fc)*b*d)/1000+1e-9);assert(.75*(vc+vs)/1000>=q.Vu);
  assert(av/r.s>=Math.max(.062*Math.sqrt(fc),.35)*b/q.fyt);assert(r.legSpacing<=r.legMax);
 }
 assert.equal(total,720);assert(passed>100);console.log(`Reverse checked ${total} cases; ${passed} passing designs independently verified.`);
});
