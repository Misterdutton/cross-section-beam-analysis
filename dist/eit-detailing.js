// EIT 011008-21, Chapter 12. Bounded scope: normal-weight concrete,
// uncoated straight deformed bars of the same diameter; full-fy tension.
function eitLengths(p){
 const {db,fc,fy,h,cover,ds}=p;
 if(![db,fc,fy,h,cover,ds].every(Number.isFinite)||![12,16,20,25,28,32].includes(db)||fc<17||fc>55||fy<280||fy>420||cover<=0||ds<=0||h<=2*(cover+ds+db))throw Error('ข้อมูลอยู่นอกขอบเขตโมดูล วสท. (เหล็กข้ออ้อยไม่เคลือบ ขนาดเดียว คอนกรีตน้ำหนักปกติ)');
 const d=h-cover-ds-db/2,psiTop=d>300?1.3:1,denominator=db<=20?1.4:1.1;
 // Table 12.2.2, "other cases": no favorable cover/spacing/confinement credit.
 const rawBottom=fy*db/(denominator*Math.sqrt(fc)),rawTop=psiTop*rawBottom;
 const bottom=Math.max(300,rawBottom),top=Math.max(300,rawTop);
 return {d,psiTop,denominator,rawBottom,rawTop,bottom,top,lapTop:Math.max(300,1.3*top),lapBottom:Math.max(300,1.3*bottom),extension:Math.max(d,12*db),negativeExtension:Math.max(d,12*db),basis:'วสท. 011008-21 §§12.2.1–12.2.2, 12.2.4, 12.9.3–12.9.4, 12.10.1, 12.11.3, 12.14.1–12.14.2'};
}
function checkEitDetailing(p,q,m,a){
 const lengths=eitLengths(p),checks=[];
 const add=(name,ok,detail,ref)=>checks.push({name,ok,detail,ref});
 const finite=v=>typeof v==='number'&&Number.isFinite(v);
 const requireNonnegative=(v,name)=>{if(!finite(v)||v<0||v>1e6)throw Error(`ตรวจข้อมูล ${name}: ต้องเป็นตัวเลขตั้งแต่ 0 ถึง 1,000,000`);};
 for(const k of ['embedLeft','embedRight','lapTopLength','lapBottomLength'])requireNonnegative(a[k],k);
 if(!['continuous','simple'].includes(a.memberType)||![0,1].includes(a.lapMode))throw Error('เลือกประเภทคานและการต่อทาบ');
 for(const k of ['cutTL','cutTR','cutBML','cutBMR','inflectL','inflectR'])if(a[k]!==null&&(!finite(a[k])||a[k]<0||a[k]>q.L))throw Error('ตำแหน่งจากกราฟโมเมนต์ต้องอยู่ในช่วง 0 ถึง L (mm)');
 for(const k of ['cutVu','cutPhiVn'])if(a[k]!==null)requireNonnegative(a[k],k);
 for(const [label,v] of [['ซ้าย',a.embedLeft],['ขวา',a.embedRight]]){
  add(`ฝังตรงเหล็กบนในที่รองรับ${label}`,v>=lengths.top,`${v} / ${Math.ceil(lengths.top)} mm`,'12.2.1–12.2.2, 12.11.1');
  add(`ฝังตรงเหล็กล่างในที่รองรับ${label}`,v>=Math.max(150,lengths.bottom),`${v} / ${Math.ceil(Math.max(150,lengths.bottom))} mm`,'12.2.1–12.2.2, 12.10.1');
 }
 if(a.memberType==='simple')add('แบบจำลองช่วงเดียวธรรมดาไม่มีโมเมนต์ยึดรั้งที่ปลาย',q.ml===0&&q.mr===0,'หากปลายมีโมเมนต์ลบ ให้ตรวจประเภทการรองรับก่อน','ขอบเขตแบบจำลอง');
 const fraction=a.memberType==='simple'?1/3:1/4,bottomMid=m.at(.5).bottom;
 add('สัดส่วนเหล็กล่างที่ต่อเนื่องเข้าในที่รองรับ',q.bottomBase>=fraction*bottomMid,`${q.bottomBase} / ต้องการ ≥ ${Math.ceil(fraction*bottomMid)} เส้น`,'12.10.1');
 const laps=[];
 if(a.lapMode===1){
  for(const [side,n,center,actual,required] of [['top',q.topBase,a.lapTopCenter,a.lapTopLength,lengths.lapTop],['bottom',q.bottomBase,a.lapBottomCenter,a.lapBottomLength,lengths.lapBottom]]){
   if(!finite(center)||center<0||center>1)throw Error('ตำแหน่งศูนย์กลางทาบต้องอยู่ในช่วงคาน');
   const start=center*q.L-actual/2,end=center*q.L+actual/2,inside=start>=0&&end<=q.L;
   const relevant=m.bands.filter(b=>b.side===side&&b.n>0&&b.end*q.L>=start&&b.start*q.L<=end);
   // Deliberately conservative: require clear spacing for every bar, including lap partners.
   const count=n+relevant.reduce((sum,b)=>sum+b.n,0),gap=Math.max(25,p.db,4*p.agg/3),fit=count*p.db+(count-1)*gap<=p.b-2*(p.cover+p.ds);
   laps.push({side,n,start,end,actual,required,inside,fit,count});
   add(`ทาบรับแรงดึงชั้น B เหล็ก${side==='top'?'บน':'ล่าง'}`,actual>=required,`${actual} / ${Math.ceil(required)} mm`,'12.14.1–12.14.2');
   add(`รอยทาบเหล็ก${side==='top'?'บน':'ล่าง'}อยู่ในช่วงที่จำลอง`,inside,`${start} ถึง ${end} mm`,'ขอบเขตรูปจำลอง');
   add(`จัดเหล็กบริเวณทาบ${side==='top'?'บน':'ล่าง'}ชั้นเดียว`,fit,`ตรวจเผื่อ ${count} เส้น รวมเหล็กคู่ทาบ`,'7.6 (ใช้เกณฑ์ช่องว่างแบบอนุรักษนิยม)');
   add(`ตำแหน่งต่อทาบเหล็ก${side==='top'?'บน':'ล่าง'}ได้รับการยืนยัน`,null,'ต้องตรวจกราฟแรง ความต่อเนื่อง และอนุมัติโดยวิศวกร ไม่ได้อนุมานจาก L/4 หรือ L/2','12.13.1');
  }
 }
 const cuts=[];
 const points={TL:a.cutTL,TR:a.cutTR,BML:a.cutBML,BMR:a.cutBMR};
 const actualCuts=[['TL','TL','end',1],['TR','TR','start',-1],['BM','BML','start',-1],['BM','BMR','end',1]];
 for(const [bandId,key,end,direction] of actualCuts){
  const band=m.bands.find(b=>b.id===bandId);if(!band||band.n===0)continue;
  const actual=band[end]*q.L;if(actual===0||actual===q.L)continue;
  const point=points[key],label=`จุดตัด ${key}`,ld=band.side==='top'?lengths.top:lengths.bottom;
  const extension=point===null?null:direction*(actual-point),continuation=point===null?null:direction===1?q.L+a.embedRight-point:point+a.embedLeft;
  const criticalDistance=bandId==='TL'?actual:bandId==='TR'?q.L-actual:Math.abs(actual-q.L/2);
  cuts.push({key,actual,point,extension,ld,criticalDistance,side:band.side});
  add(`${label}: ยื่นเลยจุดที่ไม่ต้องการรับแรงดัด`,point===null?null:extension>=lengths.extension,point===null?'กรอกตำแหน่งจากผลวิเคราะห์':`${extension} / ${Math.ceil(lengths.extension)} mm`,'12.9.3');
  add(`${label}: ระยะจากหน้าตัดแรงดึงสูงสุดถึงปลายเหล็ก`,criticalDistance>=ld,`${criticalDistance} / ${Math.ceil(ld)} mm (ถือหัว/ท้ายและกลางเป็นจุดแรงสูงสุดตามแบบจำลอง)`,'12.1.1, 12.9.2');
  add(`${label}: เหล็กต่อเนื่องเลยจุดที่ไม่ต้องการเหล็ก`,continuation===null?null:continuation>=ld,continuation===null?'ยังขาดตำแหน่งจากผลวิเคราะห์':`${continuation} / ${Math.ceil(ld)} mm`,'12.9.4');
 }
 if(cuts.length){
  const supplied=a.cutVu!==null&&a.cutPhiVn!==null&&a.cutPhiVn>0;
  add('หยุดเหล็กในบริเวณแรงดึง: ตรวจเฉพาะวิธี (ก)',supplied?a.cutVu<=(2/3)*a.cutPhiVn:null,supplied?`${a.cutVu} ≤ ${2*a.cutPhiVn/3} kN (ใช้ Vu สูงสุด / φVn ต่ำสุดจาก วสท. ที่จุดตัดทั้งหมด)`:'กรอก Vu และ φVn จากรายการคำนวณ วสท. ที่จุดตัด ไม่ใช้กำลังเฉือน ACI อัตโนมัติ','12.9.5(ก)');
  add('ยืนยันตำแหน่งวิกฤต/จุดที่ไม่ต้องการเหล็กจากการวิเคราะห์',null,'ต้องตรวจซองโมเมนต์และแรงเฉือน รวมชุดน้ำหนักทั้งหมด ไม่ได้ตรวจจากสามค่าโมเมนต์เพียงอย่างเดียว','12.9.2–12.9.6');
 }
 for(const [label,point,station,dir] of [['ซ้าย',a.inflectL,m.stations[0],1],['ขวา',a.inflectR,m.stations[2],-1]]){
  const beyond=Math.max(lengths.extension,q.L/16),target=point===null?null:point+dir*beyond;
  const available=target===null?null:target<0||target>q.L?0:m.at(target/q.L).top;
  add(`เหล็กโมเมนต์ลบยื่นเลยจุดดัดกลับ${label}`,point===null?null:available>=station.top/3,point===null?'กรอกจุดดัดกลับจากการวิเคราะห์':`ที่ x=${target} mm มี ${available} เส้น / ต้องการ ≥ ${Math.ceil(station.top/3)} เส้น`,'12.11.3');
 }
 add('เงื่อนไขเหล็กบวกที่ที่รองรับธรรมดา/จุดดัดกลับ',null,'ยังต้องตรวจเงื่อนไข Mn/Vu + la และกรณียกเว้นจากผลวิเคราะห์','12.10.3');
 return {lengths,checks,laps,cuts,embedLeft:a.embedLeft,embedRight:a.embedRight,memberType:a.memberType,lapMode:a.lapMode,hasFailure:checks.some(c=>c.ok===false),pending:checks.filter(c=>c.ok===null).length};
}
function eitBarPieces(q,band,e){
 const lap=e.laps.find(l=>(band.id==='T'&&l.side==='top')||(band.id==='B'&&l.side==='bottom'));
 if(lap&&!lap.inside)return null;
 const left=band.start===0?e.embedLeft:0,right=band.end===1?e.embedRight:0;
 const first=lap?left+lap.end:(band.end-band.start)*q.L+left+right,second=lap?q.L-lap.start+right:0;
 return {first,second,total:first+second};
}
if(typeof module!=='undefined')module.exports={eitLengths,checkEitDetailing,eitBarPieces};
