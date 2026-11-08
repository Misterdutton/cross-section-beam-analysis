const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const {design}=require('../dist/engine'),{beamLayout}=require('../dist/layout');
test('EX-01 displayed hand substitution agrees with the actual default midspan design',()=>{
 const p={b:300,h:500,cover:40,db:20,ds:9,fc:28,fy:400,fyt:235,Mu:120,Vu:100,agg:20};
 const q={L:5000,ml:150,mr:150,topBase:2,bottomBase:2,leftRatio:.25,rightRatio:.25,bottomRatio:.5};
 const result=beamLayout(p,q).stations[1].result;
 // Numeric targets are from the worked substitutions printed in the user guide,
 // independently evaluated without using the solver to generate expected values.
 for(const [key,value,tolerance] of [['d',441,1e-9],['As',942.478,.001],['Asmin',463.050,.001],['a',52.800,.001],['c',62.118,.001],['eps',.018298,.000001],['flex',140.670,.001],['Vc',119.011,.001],['Av',127.235,.001],['shear',134.210,.001],['actualGap',71,.001]])assert(Math.abs(result[key]-value)<tolerance,key);
 assert.equal(result.n,3);assert.equal(result.s,220);assert(result.ok);
 const html=fs.readFileSync(path.join(__dirname,'../dist/index.html'),'utf8');
 assert(html.includes('data-example-flex="140.670"'));assert(html.includes('data-example-shear="134.210"'));
 assert.equal(design(p).n,result.n);
});
