function guidanceNumber(n){return Number.isFinite(n)?Number(n).toLocaleString('en-US',{maximumFractionDigits:3}):'—';}
const guidanceUp=(n,step=10)=>Math.ceil(n/step)*step;
function reviewSnapshot(p,q,a){
 const layoutFn=typeof beamLayout==='function'?beamLayout:require('./layout').beamLayout;
 const eitFn=typeof checkEitDetailing==='function'?checkEitDetailing:require('./eit-detailing').checkEitDetailing;
 const m=layoutFn(p,q),eit=eitFn(p,q,m,a);return {p,q,a,m,eit};
}
function reviewChecks(s){
 const out=[{key:'layout:top',name:'จัดเหล็กบนตลอดช่วง',ok:s.m.fitTop},{key:'layout:bottom',name:'จัดเหล็กล่างตลอดช่วง',ok:s.m.fitBottom},{key:'layout:vertical',name:'ช่องว่างแนวดิ่งของเหล็กบน–ล่าง',ok:s.m.fitVertical}];
 s.m.stations.forEach((z,i)=>z.result.checks.forEach(([name,ok],j)=>out.push({key:`section:${i}:${j}`,name:`${z.name}: ${name}`,ok})));
 s.eit.checks.forEach(c=>out.push({key:'eit:'+c.name,name:c.name,ok:c.ok}));return out;
}
function buildReview(s){
 const {p,q,m,a,eit:e}=s,items=[],n=guidanceNumber;
 const put=(key,title,ok,values,steps,field,proposal=null)=>{if(ok!==true)items.push({key,title,ok,values,steps,field,proposal,id:'advice-'+items.length});};
 const gap=Math.max(25,p.db,4*p.agg/3),widthFor=count=>guidanceUp(2*(p.cover+p.ds)+count*p.db+(count-1)*gap,25);
 for(const [side,count,ok] of [['top',m.maxTop,m.fitTop],['bottom',m.maxBottom,m.fitBottom]])put('layout:'+side,`จัดเหล็ก${side==='top'?'บน':'ล่าง'}ลงหน้าตัดไม่ได้`,ok,`มากสุด ${count} เส้น • b มี ${n(p.b)} mm • ความกว้างขั้นต่ำสำหรับชุดปัจจุบัน ${widthFor(count)} mm`,['เพิ่มความกว้างหน้าตัดให้พอกับจำนวนเหล็กและช่องว่าง โดยคงระยะหุ้มไว้','หากเปลี่ยนขนาดเหล็กหรือจัดหลายชั้น ต้องคำนวณ d และกำลังใหม่ (ต้นแบบนี้รองรับชั้นเดียวต่อด้าน)'],'b',{kind:'patch',patch:{b:widthFor(count)}});
 put('layout:vertical','เหล็กบน–ล่างอยู่ใกล้กันเกินไป',m.fitVertical,`ช่องว่าง ${n(m.verticalClear)} mm • ต้องการอย่างน้อย ${n(gap)} mm`,['เพิ่มความสูงหน้าตัดและตรวจตำแหน่งเหล็กทั้งสองด้าน','คงระยะหุ้มตามแบบจริง และตรวจคานใหม่หลังปรับขนาด'],'h',{kind:'geometry'});
 m.stations.forEach((z,i)=>z.result.checks.forEach(([name,ok],j)=>{
  if(ok)return;const r=z.result,key=`section:${i}:${j}`;let values='',steps=[],field='h',proposal={kind:'geometry'};
  if(name.startsWith('พื้นที่เหล็กขั้นต่ำ')){values=`As มี ${n(r.As)} mm² • ขั้นต่ำ ${n(r.Asmin)} mm²`;steps=['เพิ่มพื้นที่เหล็กที่จัดให้ถึงขั้นต่ำ พร้อมตรวจช่องว่างและความเหนียว','ไม่ลดค่าแรงหรือคุณสมบัติวัสดุที่ใช้จริงเพื่อเปลี่ยนสถานะ'];}
  else if(name.startsWith('กำลังดัด')||name.startsWith('หน้าตัดควบคุม')){values=`Mu ${n(z.Mu)} kN·m • φMn ${r.flex===null?'ใช้ไม่ได้ในขอบเขตนี้':n(r.flex)+' kN·m'} • εt ${r.eps.toFixed(6)} / ขั้นต่ำ ${r.limit.toFixed(6)}`;steps=['ลองเพิ่มความสูงหรือความกว้างคาน แล้วให้โปรแกรมจัดเหล็กและตรวจใหม่','กรณีความเหนียวไม่ผ่าน การเพิ่มเหล็กอย่างเดียวอาจทำให้แย่ลง ต้องปรับหน้าตัดร่วมด้วย'];}
  else if(name.startsWith('ระยะห่างสุทธิ')){const required=widthFor(r.n);values=`ช่องว่างมี ${n(r.actualGap)} mm • ต้องการ ≥ ${n(r.gap)} mm • b สำหรับชุดนี้ ≥ ${required} mm`;steps=['เพิ่มความกว้างคานให้จัดเหล็กได้โดยคงระยะหุ้มไว้','หลังเปลี่ยน b โปรแกรมจะคำนวณจำนวนเหล็กใหม่อีกครั้ง'];field='b';proposal={kind:'patch',patch:{b:Math.max(p.b,required)}};}
  else if(name.startsWith('ขีดจำกัดกำลังเฉือน')||name.startsWith('กำลังเฉือน')){values=`Vu ${n(p.Vu)} kN • กำลังที่ใช้ ${n(r.shear)} kN • ขีดจำกัดหน้าตัด ${n(r.shearLimit)} kN`;steps=['ลองเพิ่มหน้าตัดและตรวจแรงเฉือนใหม่','ถ้าเกินขีดจำกัดคอนกรีต การเพิ่มปลอกอย่างเดียวแก้เงื่อนไขนี้ไม่ได้'];}
  else if(name.startsWith('ระยะขาปลอก')){values=`ระยะขาปลอก ${n(r.legSpacing)} mm • สูงสุด ${n(r.legMax)} mm`;steps=['เพิ่มความลึกคานเพื่อให้ปลอกสองขาครอบคลุมความกว้างตามเงื่อนไข','อีกทางเลือกคือปลอกหลายขา ซึ่งต้องออกแบบแยกเพราะต้นแบบรองรับสองขา'];}
  else if(name.startsWith('ขนาดมวลรวม')){values=`มวลรวมที่ระบุ ${n(p.agg)} mm • ขนาดที่หน้าตัดนี้รองรับ ≤ ${n(Math.min(p.b,p.h)/5)} mm`;steps=['ตรวจขนาดมวลรวมสูงสุดจากส่วนผสมคอนกรีตจริง','หากวัสดุถูกต้อง ให้เพิ่มมิติหน้าตัด ห้ามลดตัวเลขมวลรวมโดยไม่ได้เปลี่ยนวัสดุจริง'];}
  else{values=`ปลอก Ø${p.ds} • ระยะที่คำนวณ ${n(r.s)} mm • สูงสุด ${n(r.smax)} mm`;steps=['ลองเพิ่มหน้าตัดหรือตรวจขนาดปลอกที่เหมาะสม','ระยะขั้นต่ำ 50 mm เป็นข้อจำกัดของต้นแบบ ต้องจัดเหล็กได้จริงและตรวจข้อกำหนดที่เกี่ยวข้อง'];}
  put(key,`${z.name}: ${name}`,ok,values,steps,field,proposal);
 }));
 e.checks.forEach(c=>{
  if(c.ok===true)return;let steps=[],values=c.detail,field=null,proposal=null;const name=c.name,key='eit:'+name;
  if(name.startsWith('ฝังตรง')){
   const top=name.includes('บน'),left=name.endsWith('ซ้าย'),need=top?e.lengths.top:e.lengths.bottom,have=left?a.embedLeft:a.embedRight;field=left?'embedLeft':'embedRight';
   values=`มีให้ ${n(have)} mm • แนะนำอย่างน้อย ${guidanceUp(need)} mm (ปัดขึ้นทุก 10 mm) • ส่วนต่างจากระยะแนะนำ ${n(Math.max(0,guidanceUp(need)-have))} mm`;
   steps=[`ตรวจระยะฝังที่มีจริงจากผิวรองรับถึงปลายเหล็ก ถ้าออกแบบให้ยาวได้ ต้องไม่น้อยกว่า ${guidanceUp(need)} mm`,'ถ้าที่รองรับสั้นกว่าที่ต้องการ ให้พิจารณาของอมาตรฐานหรืออุปกรณ์ยึดโดยคำนวณแยก (รุ่นนี้ยังไม่รองรับ)','อย่าเปลี่ยนช่อง “ระยะที่มี” ให้เท่าค่าที่ต้องการ เว้นแต่พื้นที่รองรับและแบบได้แก้จริงแล้ว'];
  }else if(name.startsWith('ทาบรับแรงดึง')){
   const top=name.endsWith('บน'),need=top?e.lengths.lapTop:e.lengths.lapBottom;field=top?'lapTopLength':'lapBottomLength';values=`จัดไว้ ${n(a[field])} mm • ต้องการ ≥ ${guidanceUp(need)} mm`;
   steps=[`ทดลองระยะทาบ ${guidanceUp(need)} mm โดยคงชนิดการทาบ B`,'เมื่อเพิ่มความยาว ต้องตรวจว่ารอยทาบยังอยู่ในช่วงคาน ช่องว่างเพียงพอ และตำแหน่งได้รับการตรวจจากผลวิเคราะห์'];proposal={kind:'patch',patch:{[field]:guidanceUp(need)}};
  }else if(name.startsWith('รอยทาบเหล็ก')){
   const top=name.includes('บน'),lap=e.laps.find(l=>l.side===(top?'top':'bottom'));field=top?'lapTopCenter':'lapBottomCenter';values=`รอยทาบ x=${n(lap.start)} ถึง ${n(lap.end)} mm • ช่วงจำลอง 0 ถึง ${q.L} mm`;
   steps=lap.actual>q.L?['ความยาวทาบมากกว่าช่วงจำลอง ต้องปรับผังรอยต่อหรือออกแบบวิธีต่อชนิดอื่น ไม่ลดระยะต่ำกว่าที่ต้องการ']: [`เงื่อนไขเรขาคณิต: ศูนย์กลางต้องอยู่ระหว่าง x=${n(lap.actual/2)} ถึง ${n(q.L-lap.actual/2)} mm`,'เลือกตำแหน่งจากผลวิเคราะห์และแบบจริง ไม่ย้ายจุดต่อเพียงเพื่อให้กรอบจำลองผ่าน'];
  }else if(name.startsWith('จัดเหล็กบริเวณทาบ')){
   const top=name.includes('บน'),lap=e.laps.find(l=>l.side===(top?'top':'bottom'));field='b';const target=widthFor(lap.count);values=`บริเวณทาบเผื่อ ${lap.count} เส้น • b มี ${n(p.b)} mm • สำหรับชุดนี้ต้องการ ≥ ${target} mm`;
   steps=['ทดลองเพิ่มความกว้างคาน แล้วตรวจทั้งชุดเหล็กและระยะฝังใหม่','การเหลื่อมตำแหน่งทาบหรือจัดเหล็กสัมผัสกันอาจทำได้ แต่ต้องจัดรายละเอียดและตรวจโดยวิศวกร รุ่นนี้ใช้เกณฑ์ช่องว่างแบบอนุรักษนิยม'];proposal={kind:'patch',patch:{b:Math.max(p.b,target)}};
  }else if(name.startsWith('สัดส่วนเหล็กล่าง')){
   const target=Math.ceil(m.at(.5).bottom*(a.memberType==='simple'?1/3:1/4));field='bottomBase';values=`เหล็กล่างต่อเนื่อง ${q.bottomBase} เส้น • ต้องการอย่างน้อย ${target} เส้น`;
   steps=[`ทดลองเพิ่มเหล็กล่างต่อเนื่องเป็น ${target} เส้น`,'ต้องตรวจช่องว่าง กำลังหน้าตัด ระยะฝัง และปริมาณเหล็กบริเวณทาบใหม่'];proposal={kind:'patch',patch:{bottomBase:target}};
  }else if(name.startsWith('จุดตัด ')){
   const match=name.match(/^จุดตัด (TL|TR|BML|BMR):/),cut=match&&e.cuts.find(z=>z.key===match[1]);
   if(cut){const sourceField={TL:'cutTL',TR:'cutTR',BML:'cutBML',BMR:'cutBMR'}[cut.key];field=sourceField;
    if(name.includes('ยื่นเลยจุดที่ไม่ต้องการ')){
     steps=cut.point===null?[`กรอก x ของจุดที่ไม่ต้องใช้เหล็กชุด ${cut.key} อีกต่อไปจากซองโมเมนต์ โดยเหล็กที่เหลือต้องรับแรงได้`,'วัด x จากผิวรองรับซ้ายเป็น mm แม้เป็นด้านขวา ห้ามใช้จุดดัดกลับแทนโดยอัตโนมัติ']: [`ส่วนยื่นมี ${n(cut.extension)} mm ต้องการ ≥ ${guidanceUp(e.lengths.extension)} mm`,'ขยายช่วงเหล็กเสริมออกจากจุดตามผลวิเคราะห์ ไม่ขยับจุดอ้างอิงให้ผลผ่าน'];
     if(cut.point!==null)proposal={kind:'cut',cutKey:cut.key};
    }else if(name.includes('หน้าตัดแรงดึงสูงสุด')){steps=[`จากจุดแรงสูงสุดถึงปลายเหล็กมี ${n(cut.criticalDistance)} mm ต้องการ ≥ ${guidanceUp(cut.ld)} mm`,'ทดลองยืดช่วงเหล็กเสริม และตรวจส่วนยื่นจากจุดไม่ต้องการเหล็กกับแรงเฉือนอีกครั้ง'];field={TL:'leftRatio',TR:'rightRatio',BML:'bottomRatio',BMR:'bottomRatio'}[cut.key];proposal={kind:'cut',cutKey:cut.key};
    }else steps=cut.point===null?['กรอกจุดที่ไม่ต้องใช้เหล็กชุดนั้นจากผลวิเคราะห์ก่อน','จากจุดดังกล่าว เหล็กต่อเนื่องที่เหลือต้องมีระยะฝังตามค่าที่ต้องการ']:['ปรับให้เหล็กที่เหลือต่อเนื่องเลยจุดนั้นเป็นระยะฝังที่ต้องการ และตรวจการยึดในที่รองรับ','ห้ามเปลี่ยนตำแหน่งจากผลวิเคราะห์หรือเพิ่มระยะที่มีโดยไม่ได้แก้แบบจริง'];
   }
  }else if(name.startsWith('หยุดเหล็กในบริเวณแรงดึง')){
   field=a.cutVu===null?'cutVu':'cutPhiVn';steps=c.ok===null?['กรอก Vu สูงสุดและ φVn ต่ำสุดที่จุดตัดทั้งหมดจากรายการคำนวณ วสท. หน่วย kN','ไม่ใช้แรงเฉือนที่รองรับหรือกำลัง ACI มาแทนโดยไม่ได้ตรวจฐานการคำนวณ']: [`วิธี (ก) ต้องมี φVn ≥ ${n(1.5*a.cutVu)} kN สำหรับ Vu=${n(a.cutVu)} kN`,'เลือกจุดหยุดใหม่หรือออกแบบให้มีกำลังเพียงพอ แล้ววิเคราะห์ใหม่ ห้ามเพิ่มค่ากำลังที่กรอกหรือลดแรงเพื่อให้ผ่าน','หากใช้วิธีอื่นตามข้อ 12.9.5 ต้องให้วิศวกรตรวจแยก รุ่นนี้ตรวจเฉพาะวิธี (ก)'];
  }else if(name.startsWith('เหล็กโมเมนต์ลบยื่นเลยจุดดัดกลับ')){
   field=name.endsWith('ซ้าย')?'inflectL':'inflectR';steps=c.ok===null?['กรอก x ที่โมเมนต์เปลี่ยนเครื่องหมายจากผลวิเคราะห์รวมชุดน้ำหนักที่เกี่ยวข้อง','วัดจากผิวรองรับซ้ายเป็น mm จุดดัดกลับไม่จำเป็นต้องตรง L/4']: [`ต้องมีเหล็กอย่างน้อยหนึ่งในสามของเหล็กบนที่รองรับ ยื่นเลยจุดดัดกลับ ≥ ${guidanceUp(Math.max(e.lengths.extension,q.L/16))} mm`,'ปรับความต่อเนื่องและช่วงยื่นของเหล็กจากกราฟโมเมนต์ โดยคงจุดดัดกลับที่วิเคราะห์ไว้'];
  }else if(name.includes('ตำแหน่งต่อทาบ')){field=name.includes('บน')?'lapTopCenter':'lapBottomCenter';steps=['ตรวจตำแหน่งรอยต่อกับซองแรง ปริมาณเหล็กที่ยังต่อเนื่อง และแบบรายละเอียดทั้งช่วง','ให้วิศวกรพิจารณา/อนุมัติรอยต่อ รายการนี้ยังไม่ตรวจอัตโนมัติแม้ความยาวทาบผ่านแล้ว'];
  }else if(name.startsWith('แบบจำลองช่วงเดียว')){field='memberType';steps=['ตรวจชนิดการรองรับจริงกับผลวิเคราะห์ หากปลายมีแรงดัดยึดรั้ง ไม่ใช้สมมติฐานช่วงเดียวธรรมดา','เลือกประเภทตามโครงสร้างจริง ไม่ล้างค่าโมเมนต์ปลายเพื่อทำให้ผ่าน'];
  }else if(name.startsWith('เงื่อนไขเหล็กบวก')){steps=['นำ Mn, Vu และระยะเลยศูนย์กลางรองรับ/จุดดัดกลับจากรายการคำนวณมาตรวจตามข้อ 12.10.3','รุ่นนี้ยังไม่มีตัวแก้อัตโนมัติสำหรับเงื่อนไขนี้ ต้องตรวจแยกก่อนอนุมัติแบบ'];
  }else steps=['ตรวจซองโมเมนต์และแรงเฉือนจากทุกชุดน้ำหนัก รวมจุดที่เหล็กหยุดหรือเปลี่ยนชุด','รายการนี้ต้องใช้ผลวิเคราะห์เพิ่มเติม จึงยังแสดง “ยังไม่ตรวจ” แม้ปรับค่ารายการอื่นแล้ว'];
  if(!steps.length)steps=['ตรวจข้อมูลและข้ออ้างอิงที่แสดง แล้วปรับรายละเอียดให้ตรงกับแบบจริง','หากอยู่นอกขอบเขตโปรแกรม ต้องตรวจโดยวิศวกรแยก'];
  put(key,name,c.ok,values,steps,field,proposal);
 });
 return {items,failed:items.filter(i=>i.ok===false).length,pending:items.filter(i=>i.ok===null).length};
}
const guidanceAllowedPatch=new Set(['b','h','db','ds','topBase','bottomBase','leftRatio','rightRatio','bottomRatio','lapTopLength','lapBottomLength']);
function evaluateGuidancePatch(s,patch,targetKey){
 for(const [key,value] of Object.entries(patch))if(!guidanceAllowedPatch.has(key)||!Number.isFinite(value))throw Error('ข้อเสนอแก้ได้เฉพาะตัวเลือกออกแบบ ไม่แก้แรง วัสดุ ระยะที่มีจริง หรือจุดจากการวิเคราะห์');
 const p={...s.p},q={...s.q},a={...s.a};for(const [key,value] of Object.entries(patch)){if(key in p)p[key]=value;else if(key in q)q[key]=value;else if(key in a)a[key]=value;else throw Error('ไม่มีช่องออกแบบนี้');}
 const after=reviewSnapshot(p,q,a),beforeChecks=reviewChecks(s),afterChecks=reviewChecks(after),before=new Map(beforeChecks.map(c=>[c.key,c]));
 const target=afterChecks.find(c=>c.key===targetKey),resolved=beforeChecks.filter(c=>c.ok===false&&afterChecks.some(d=>d.key===c.key&&d.ok===true)),newFailures=afterChecks.filter(c=>c.ok===false&&before.get(c.key)?.ok!==false);
 return {patch,targetResolved:target?.ok===true,after,resolved,newFailures,remaining:afterChecks.filter(c=>c.ok===false),pending:afterChecks.filter(c=>c.ok===null).length};
}
function proposeGuidance(s,item){
 if(!item.proposal)return null;
 const trial=patch=>{try{const result=evaluateGuidancePatch(s,patch,item.key);return result.targetResolved?result:null;}catch{return null;}};
 if(item.proposal.kind==='patch')return trial(item.proposal.patch);
 if(item.proposal.kind==='cut'){
  const key=item.proposal.cutKey,field={TL:'leftRatio',TR:'rightRatio',BML:'bottomRatio',BMR:'bottomRatio'}[key];
  const ratios=field==='bottomRatio'?[.5,.75]:[.25,1/3,.5,.75];
  for(const value of ratios.filter(v=>v>s.q[field])){const r=trial({[field]:value});if(r)return r;}return null;
 }
 // Search only non-decreasing section dimensions, with the same forces/materials.
 const options=[];const maxB=Math.max(1500,s.p.b),startB=guidanceUp(s.p.b,25),startH=guidanceUp(s.p.h,25);
 const bs=[s.p.b,...Array.from({length:Math.max(0,Math.floor((maxB-startB)/25)+1)},(_,i)=>startB+i*25)];
 const hs=[s.p.h,...Array.from({length:Math.max(0,Math.floor((900-startH)/25)+1)},(_,i)=>startH+i*25)];
 for(const b of [...new Set(bs)])for(const h of [...new Set(hs)])if(b!==s.p.b||h!==s.p.h)options.push({b,h,area:b*h});
 options.sort((a,b)=>a.area-b.area);
 let fallback=null;for(const option of options){const patch={};if(option.b!==s.p.b)patch.b=option.b;if(option.h!==s.p.h)patch.h=option.h;const r=trial(patch);if(r){if(r.newFailures.length===0)return r;if(!fallback||r.newFailures.length<fallback.newFailures.length)fallback=r;}}
 return fallback;
}
if(typeof module!=='undefined')module.exports={buildReview,reviewSnapshot,reviewChecks,proposeGuidance,evaluateGuidancePatch,guidanceAllowedPatch};
