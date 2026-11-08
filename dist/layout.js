function beamLayout(p,q){
 const calc=typeof design==='function'?design:require('./engine').design;
 const {L,ml,mr,topBase,bottomBase,leftRatio,rightRatio,bottomRatio}=q;
 if(![L,ml,mr,topBase,bottomBase,leftRatio,rightRatio,bottomRatio].every(Number.isFinite)||L<=0||L>50000||ml<0||mr<0||![topBase,bottomBase].every(n=>Number.isSafeInteger(n)&&n>=2&&n<=30)||![leftRatio,rightRatio,bottomRatio].every(v=>v>0&&v<=1))throw Error('ตรวจข้อมูลรูปด้านข้าง: L มากกว่า 0 ถึง 50,000 mm เหล็กต่อเนื่อง 2–30 เส้น สัดส่วนมากกว่า 0 ถึง 1');
 const needed=[calc({...p,Mu:ml}),calc(p),calc({...p,Mu:mr})];
 const bands=[{id:'T',name:'เหล็กบนต่อเนื่อง',side:'top',n:topBase,start:0,end:1,color:'#125b88'},
 {id:'TL',name:'เหล็กบนเสริมซ้าย',side:'top',n:Math.max(0,needed[0].n-topBase),start:0,end:leftRatio,color:'#ce5a38'},
 {id:'TR',name:'เหล็กบนเสริมขวา',side:'top',n:Math.max(0,needed[2].n-topBase),start:1-rightRatio,end:1,color:'#ce5a38'},
 {id:'B',name:'เหล็กล่างต่อเนื่อง',side:'bottom',n:bottomBase,start:0,end:1,color:'#147d76'},
 {id:'BM',name:'เหล็กล่างเสริมกลาง',side:'bottom',n:Math.max(0,needed[1].n-bottomBase),start:(1-bottomRatio)/2,end:(1+bottomRatio)/2,color:'#8852a2'}];
 const at=x=>({top:bands.filter(z=>z.side==='top'&&z.start<=x&&z.end>=x).reduce((a,z)=>a+z.n,0),bottom:bands.filter(z=>z.side==='bottom'&&z.start<=x&&z.end>=x).reduce((a,z)=>a+z.n,0)});
 const stations=[{name:'A–A หัวคาน',x:0,Mu:ml,side:'top'},{name:'B–B กลางคาน',x:.5,Mu:p.Mu,side:'bottom'},{name:'C–C ท้ายคาน',x:1,Mu:mr,side:'top'}].map(z=>{const counts=at(z.x);return {...z,...counts,result:calc({...p,Mu:z.Mu},counts[z.side])};});
 const edges=[...new Set([0,1,...bands.flatMap(z=>[z.start,z.end])])].sort((a,b)=>a-b);
 const samples=[...edges,...edges.slice(1).map((v,i)=>(v+edges[i])/2)];
 const inner=p.b-2*(p.cover+p.ds),gap=Math.max(25,p.db,4*p.agg/3);
 const maxTop=Math.max(...samples.map(x=>at(x).top)),maxBottom=Math.max(...samples.map(x=>at(x).bottom));
 const fits=n=>n*p.db+(n-1)*gap<=inner;
 const verticalClear=p.h-2*(p.cover+p.ds+p.db);
 return {bands,stations,needed,maxTop,maxBottom,fitTop:fits(maxTop),fitBottom:fits(maxBottom),verticalClear,fitVertical:verticalClear>=gap,L,at};
}
if(typeof module!=='undefined')module.exports={beamLayout};
