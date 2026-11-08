const eitFieldDefs=[
 ['memberType','ประเภทช่วงคาน','continuous',[['continuous','ช่วงต่อเนื่อง'],['simple','ช่วงเดียวธรรมดา']]],
 ['embedLeft','ฝังตรงจากผิวรองรับซ้าย (mm)',300],['embedRight','ฝังตรงจากผิวรองรับขวา (mm)',300],
 ['lapMode','ต่อทาบเหล็กต่อเนื่อง',0,[[0,'ยังไม่กำหนดรอยทาบ'],[1,'ตรวจรอยทาบบนและล่าง']]],
 ['lapTopLength','ระยะทาบบนที่จัด (mm)',800],['lapBottomLength','ระยะทาบล่างที่จัด (mm)',800],
 ['lapTopCenter','ศูนย์กลางทาบบน',.5,[[.25,'L/4'],[.5,'L/2'],[.75,'3L/4']]],
 ['lapBottomCenter','ศูนย์กลางทาบล่าง',.25,[[.25,'L/4'],[.5,'L/2'],[.75,'3L/4']]],
 ['cutTL','จุดไม่ต้องการเหล็ก TL: x (mm)',null],['cutTR','จุดไม่ต้องการเหล็ก TR: x (mm)',null],
 ['cutBML','จุดไม่ต้องการ BM ด้านซ้าย: x (mm)',null],['cutBMR','จุดไม่ต้องการ BM ด้านขวา: x (mm)',null],
 ['inflectL','จุดดัดกลับใกล้ซ้าย: x (mm)',null],['inflectR','จุดดัดกลับใกล้ขวา: x (mm)',null],
 ['cutVu','Vu สูงสุดที่จุดตัด จาก วสท. (kN)',null],['cutPhiVn','φVn ต่ำสุดที่จุดตัด จาก วสท. (kN)',null]
];
function initEitFields(){document.querySelector('#eitFields').innerHTML=eitFieldDefs.map(([id,label,v,opts])=>`<div><label for="${id}">${label}</label>${opts?`<select id="${id}" name="${id}">${opts.map(([n,t])=>`<option value="${n}" ${n===v?'selected':''}>${t}</option>`).join('')}</select>`:`<input id="${id}" name="${id}" type="number" step="any" min="0" value="${v??''}" ${v===null?'placeholder="จากผลวิเคราะห์"':'required'}>`}</div>`).join('');}
function readEitFields(form){const raw=new FormData(form);return Object.fromEntries(eitFieldDefs.map(([id,,defaultValue])=>{const value=raw.get(id);if(id==='memberType')return[id,value];if(value===null||value.trim()===''){if(defaultValue!==null)throw Error('กรอกข้อมูลระยะฝังและทาบให้ครบ');return[id,null];}return[id,Number(value)];}));}
function eitSideSvg(p,q,m,e){
 const total=q.L+e.embedLeft+e.embedRight,X=x=>80+720*(x+e.embedLeft)/total,Y={T:100,TL:130,TR:158,B:230,BM:202};
 const dim=(a,b,y,t)=>`<path d="M${X(a)} ${y-5}v10 M${X(a)} ${y}H${X(b)} M${X(b)} ${y-5}v10" fill="none" stroke="#648088"/><text x="${(X(a)+X(b))/2}" y="${y-8}" font-size="11" text-anchor="middle">${t}</text>`;
 return `<svg class="sideSvg" viewBox="0 0 900 435" role="img" aria-label="รูปด้านข้างคานพร้อมระยะฝังและรอยทาบ"><rect x="${X(-e.embedLeft)}" y="70" width="${X(0)-X(-e.embedLeft)}" height="195" fill="#dae5e7"/><rect x="${X(q.L)}" y="70" width="${X(q.L+e.embedRight)-X(q.L)}" height="195" fill="#dae5e7"/><rect x="${X(0)}" y="75" width="${X(q.L)-X(0)}" height="185" fill="#f5f8f8" stroke="#9ab0b4"/>
 ${[0,.25,.5,.75,1].map((v,i)=>`<path d="M${X(v*q.L)} 45v240" stroke="#a8bdc1" stroke-dasharray="4 5"/><text x="${X(v*q.L)}" y="32" text-anchor="middle" font-size="12">${['0','L/4','L/2','3L/4','L'][i]}</text>`).join('')}
 ${m.bands.filter(b=>b.n>0).map(b=>{const start=b.start===0?-e.embedLeft:b.start*q.L,end=b.end===1?q.L+e.embedRight:b.end*q.L;return `<path d="M${X(start)} ${Y[b.id]}H${X(end)}" stroke="${b.color}" stroke-width="4"/><text x="${(X(start)+X(end))/2}" y="${Y[b.id]-7}" fill="${b.color}" text-anchor="middle" font-size="12">${b.id}: ${b.n}–DB${p.db}</text>`;}).join('')}
 ${e.laps.filter(l=>l.inside&&l.actual>0).map(l=>`<rect x="${X(l.start)}" y="${l.side==='top'?80:210}" width="${X(l.end)-X(l.start)}" height="35" fill="#e8b65d" fill-opacity=".3" stroke="#af7929" stroke-dasharray="4 3"/><text x="${(X(l.start)+X(l.end))/2}" y="${l.side==='top'?65:285}" text-anchor="middle" font-size="11">ทาบ B: ${l.actual} mm</text>`).join('')}
 ${dim(-e.embedLeft,0,320,`ฝัง ${e.embedLeft} mm`)}${dim(0,q.L,350,`L = ${q.L} mm`)}${dim(q.L,q.L+e.embedRight,320,`ฝัง ${e.embedRight} mm`)}
 <text x="450" y="390" text-anchor="middle" font-size="12">เส้นปลายตรงตามระยะที่กรอก • พื้นที่สีคือช่วงฝังที่มีให้ ไม่ได้แสดงหน้าตัดเสาหรือขอเหล็ก</text>
 <text x="450" y="414" text-anchor="middle" font-size="12">ปลอก Ø${p.ds} @ ${m.stations[0].result.s} mm • ตรวจจุดตัดและตำแหน่งทาบในตาราง วสท.</text></svg>`;
}
function renderEitDetails(p,q,m,e){
 const r=e.lengths,up=x=>Math.ceil(x/10)*10;
 const status=c=>c.ok===null?'ยังไม่ตรวจ':c.ok?'ผ่าน':'ไม่ผ่าน';
 document.querySelector('#eitResult').innerHTML=`<p class="warn">${e.hasFailure?'มีรายการไม่ผ่าน':'ผลตรวจบางรายการคำนวณได้'} • ยังมี ${e.pending} รายการที่ต้องตรวจเพิ่มเติม ไม่มีสถานะอนุมัติแบบก่อสร้างอัตโนมัติ</p>
 <div class="cards"><div class="card">ฝังตรงเหล็กบน ld<b>${up(r.top)} mm</b></div><div class="card">ฝังตรงเหล็กล่าง ld<b>${up(r.bottom)} mm</b></div><div class="card">ยื่นเลยจุดไม่ต้องการเหล็ก<b>${up(r.extension)} mm</b></div><div class="card">ทาบชั้น B เหล็กบน<b>${up(r.lapTop)} mm</b></div><div class="card">ทาบชั้น B เหล็กล่าง<b>${up(r.lapBottom)} mm</b></div></div>
 <p class="muted">ค่าการ์ดปัดขึ้นทุก 10 mm ตารางตรวจเทียบค่าที่คำนวณจริง ใช้กรณี “อื่น ๆ” ของข้อ 12.2.2 โดยไม่ลดจากระยะหุ้ม/การกักหรือเหล็กส่วนเกิน เหล็กไม่เคลือบ คอนกรีตน้ำหนักปกติ เทเต็มความลึกคาน ψt บน = ${r.psiTop} ล่าง = 1.0 • เลือกทาบ B ไม่ใช้สิทธิ์ลดเป็น A</p>
 ${e.checks.map(c=>`<div class="row"><span>${c.name}<small style="display:block;color:#60787c">ข้อ ${c.ref} • ${c.detail.replace(/(-?\d+\.\d{4,})/g,v=>fmt(Number(v)))}</small></span><b class="${c.ok===null?'pending':c.ok?'pass':'fail'}">${status(c)}${reviewLink('eit:'+c.name)}</b></div>`).join('')}
 <h3>ความยาวแนวเหล็กตามระยะที่กรอก</h3><p class="muted">ยังไม่ใช่รายการตัดเหล็กอนุมัติ ไม่รวมขอหรือส่วนโค้ง เมื่อเปิดทาบ คำนวณเหล็กต่อเนื่องเป็นสองท่อนต่อแนวที่ตำแหน่งเลือกไว้</p><div class="scroll"><table><tr><th>ชุด</th><th>จำนวนแนว</th><th>ท่อนที่ 1 (mm)</th><th>ท่อนที่ 2 (mm)</th><th>รวมต่อแนว (mm)</th></tr>${m.bands.filter(b=>b.n>0).map(b=>{const pieces=eitBarPieces(q,b,e);if(!pieces)return `<tr><td>${b.id}</td><td>${b.n}–DB${p.db}</td><td colspan="3">รอยทาบอยู่นอกช่วงจำลอง ไม่ออกรายการความยาว</td></tr>`;const one=pieces.first,two=pieces.second;return `<tr><td>${b.id}</td><td>${b.n}–DB${p.db}</td><td>${fmt(one)}</td><td>${two?fmt(two):'—'}</td><td>${fmt(one+two)}</td></tr>`;}).join('')}</table></div>
 <details><summary>สมการ ขอบเขต และแหล่งอ้างอิง</summary><p>ld = max(300, ψt fy db / (${r.denominator} √f′c)) mm; ทาบ B = max(300, 1.3ld); ส่วนยื่นขั้นต่ำ = max(d,12db) • ไม่ใช้ค่า 40db ตายตัว</p><p>โมดูลนี้ตรวจเฉพาะเหล็กข้ออ้อยขนาดเดียว ไม่เคลือบ ปลายตรงรับแรงดึง DB12–DB32 ไม่ครอบคลุมของอ การฝังรับแรงอัด เหล็กมัดกำ ข้อต่อเชิงกล การเจาะเสียบ การทาบต่างขนาด หรือข้อกำหนดแผ่นดินไหว ผลกำลังหน้าตัดยังใช้ ACI 318-19 ส่วนตารางระยะนี้อ้าง วสท. 011008-21 ไม่ถือว่าทั้งโครงการได้รับการตรวจครบตาม วสท.</p><p><a href="https://eit.or.th/api/public/file/book/173" target="_blank" rel="noopener">สารบัญฉบับ วสท. จากผู้จัดทำ</a> · <a href="https://www.scribd.com/document/978870261/10104-64-gwt5lu" target="_blank" rel="noopener">ตัวบทฉบับที่ตรวจอ่าน บท 12 หน้า 97–106 (สำเนาที่เผยแพร่โดยบุคคลอื่น)</a> • ควรตรวจเทียบกับเล่มมาตรฐานที่ได้รับอนุญาตก่อนออกแบบใช้งานจริง</p></details>`;
}
