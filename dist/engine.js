function design(p,providedCount){
 const {b,h,cover,db,ds,fc,fy,fyt,Mu,Vu,agg}=p;
 if([b,h,cover,db,ds,fc,fy,fyt,Mu,Vu,agg].some(v=>!Number.isFinite(v))||b<=0||h<=0||cover<=0||agg<=0||Mu<0||Vu<0||fc<17||fc>55||fy<280||fy>420||fyt<235||fyt>420||![12,16,20,25,28,32].includes(db)||![6,9,10,12].includes(ds))throw Error('กรอกข้อมูลให้ครบ: f′c 17–55 MPa, fy 280–420 MPa, fyt 235–420 MPa มิติเป็นบวก และแรงไม่ติดลบ');
 const d=h-cover-ds-db/2,inner=b-2*(cover+ds),gap=Math.max(25,db,4*agg/3);
 if(h<2*(cover+ds)+db||inner<2*db+gap||h>900)throw Error('หน้าตัดจัดเหล็กชั้นเดียวไม่ได้ หรือสูงเกินขอบเขตต้นแบบ 900 mm');
 const beta=Math.max(.65,.85-.05*Math.max(0,fc-28)/7),Asmin=Math.max(.25*Math.sqrt(fc)/fy,1.4/fy)*b*d;
 const disc=d*d-2*Mu*1e6/(.9*.85*fc*b);
 if(disc<0)throw Error('โมเมนต์สูงเกินขอบเขตคานเสริมเหล็กดึงอย่างเดียว กรุณาเพิ่มหน้าตัด');
 // Rationalized quadratic root avoids subtracting nearly equal values at small Mu.
 if(providedCount!==undefined&&(!Number.isSafeInteger(providedCount)||providedCount<2))throw Error('จำนวนเหล็กที่จัดต้องเป็นจำนวนเต็มอย่างน้อย 2 เส้น');
 const Asreq=Math.max(Asmin,2*Mu*1e6/(.9*fy*(d+Math.sqrt(disc)))),n=providedCount??Math.max(2,Math.ceil(Asreq/(Math.PI*db*db/4))),As=n*Math.PI*db*db/4;
 const actualGap=(inner-n*db)/(n-1),a=As*fy/(.85*fc*b),c=a/beta,eps=.003*(d-c)/c,limit=fy/200000+.003;
 // This solver supports tension-controlled beams only. Never present phi=0.9 as
 // an available capacity when the assumed yielding/tension regime is invalid.
 const tensionControlled=eps>=limit;
 const flex=tensionControlled?.9*As*fy*(d-a/2)/1e6:null,Av=2*Math.PI*ds*ds/4,Vc=.17*Math.sqrt(fc)*b*d,vsreq=Math.max(0,Vu*1000/.75-Vc),avmin=Math.max(.062*Math.sqrt(fc),.35)*b/fyt;
 const smax=Math.min(d/(vsreq>.33*Math.sqrt(fc)*b*d?4:2),vsreq>.33*Math.sqrt(fc)*b*d?300:600),s=Math.floor(Math.min(smax,Av/avmin,vsreq>0?Av*fyt*d/vsreq:Infinity)/10)*10;
 const shearLimit=.75*(Vc+.66*Math.sqrt(fc)*b*d)/1000;
 const shearRaw=s>0?.75*(Vc+Av*fyt*d/s)/1000:0,shear=Math.min(shearRaw,shearLimit);
 // Two-legged stirrup: distance between leg centerlines, Table 9.7.6.2.2.
 const legSpacing=b-2*cover-ds,legMax=vsreq>.33*Math.sqrt(fc)*b*d?d/2:d;
 const checks=[['พื้นที่เหล็กขั้นต่ำ',As>=Asmin],['กำลังดัด φMn ≥ Mu (เฉพาะหน้าตัดควบคุมด้วยแรงดึง)',flex!==null&&flex>=Mu],['หน้าตัดควบคุมด้วยแรงดึง',tensionControlled],['ระยะห่างสุทธิของเหล็ก',actualGap>=gap],['กำลังเฉือนที่จำกัดด้วยหน้าตัด ≥ Vu',s>0&&shear>=Vu],['ขีดจำกัดกำลังเฉือนหน้าตัด',Vu<=shearLimit],['ระยะปลอกตามแนวคาน',s>0&&s<=smax],['ระยะขาปลอกข้ามความกว้างคาน',legSpacing<=legMax],['เหล็กปลอกขั้นต่ำ Av/s',s>0&&Av/s>=avmin],['ขนาดมวลรวม ≤ 1/5 ของมิติหน้าตัดเล็กสุด',agg<=Math.min(b,h)/5],['ระยะปลอกที่จัดได้ ≥ 50 mm (เกณฑ์ต้นแบบ)',s>=50]];
 if([d,Asmin,Asreq,n,As,a,c,eps,actualGap,Av,Vc,s,shear,shearLimit,legSpacing,legMax].some(v=>!Number.isFinite(v)))throw Error('ค่าที่กรอกเกินขอบเขตตัวเลขที่โปรแกรมคำนวณได้');
 return {d,beta,Asmin,Asreq,n,As,a,c,eps,limit,flex,actualGap,gap,Av,Vc:Vc/1000,s,smax,shear,shearRaw,shearLimit,legSpacing,legMax,avmin,tensionControlled,checks,ok:checks.every(x=>x[1])};
}
if(typeof module!=='undefined')module.exports={design};
