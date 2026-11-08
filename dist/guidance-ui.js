function guidanceEscape(value){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
const guidanceFieldRules={b:{positive:true,tip:'ความกว้างหน้าตัดจริง หน่วย mm; 1 m = 1,000 mm'},h:{positive:true,max:900,tip:'ความสูงหน้าตัดจริง หน่วย mm; ต้นแบบรองรับไม่เกิน 900 mm'},cover:{positive:true,tip:'ระยะจากผิวคอนกรีตถึงผิวนอกปลอก หน่วย mm; ใช้ตามแบบและสภาพแวดล้อมจริง'},fc:{min:17,max:55,tip:'กำลังอัดทรงกระบอก 17–55 MPa; ไม่ใช่ค่าทรงลูกบาศก์'},fy:{min:280,max:420,tip:'กำลังครากเหล็กหลัก 280–420 MPa ตามวัสดุที่ใช้จริง'},fyt:{min:235,max:420,tip:'กำลังครากเหล็กปลอก 235–420 MPa ตามวัสดุจริง'},Mu:{min:0,tip:'ขนาดโมเมนต์บวกที่คูณตัวคูณแล้ว หน่วย kN·m จากผลวิเคราะห์'},Vu:{min:0,tip:'ขนาดแรงเฉือนสูงสุดที่คูณตัวคูณแล้ว หน่วย kN จากผลวิเคราะห์'},ml:{min:0,tip:'ขนาดโมเมนต์ลบหัวคานที่คูณตัวคูณแล้ว หน่วย kN·m'},mr:{min:0,tip:'ขนาดโมเมนต์ลบท้ายคานที่คูณตัวคูณแล้ว หน่วย kN·m'},agg:{positive:true,tip:'ขนาดมวลรวมหยาบใหญ่สุดตามส่วนผสมจริง หน่วย mm'},L:{positive:true,max:50000,tip:'ช่วงว่างระหว่างผิวรองรับ หน่วย mm; ไม่ใช่ระยะศูนย์กลางเสา'},topBase:{min:2,max:30,integer:true,tip:'จำนวนเหล็กบนต่อเนื่อง 2–30 เส้น เป็นจำนวนเต็ม'},bottomBase:{min:2,max:30,integer:true,tip:'จำนวนเหล็กล่างต่อเนื่อง 2–30 เส้น เป็นจำนวนเต็ม'},embedLeft:{min:0,max:1e6,tip:'ระยะฝังตรงที่มีจริงจากผิวรองรับซ้ายถึงปลายเหล็ก ไม่ใช่ค่าที่ต้องการจากสูตร'},embedRight:{min:0,max:1e6,tip:'ระยะฝังตรงที่มีจริงจากผิวรองรับขวาถึงปลายเหล็ก ไม่ใช่ค่าที่ต้องการจากสูตร'},lapTopLength:{min:0,max:1e6,tip:'ความยาวที่ออกแบบให้เหล็กบนทาบกัน หน่วย mm; ต้องตรวจตำแหน่งและช่องว่างด้วย'},lapBottomLength:{min:0,max:1e6,tip:'ความยาวที่ออกแบบให้เหล็กล่างทาบกัน หน่วย mm; ต้องตรวจตำแหน่งและช่องว่างด้วย'}};
for(const id of ['cutTL','cutTR','cutBML','cutBMR','inflectL','inflectR'])guidanceFieldRules[id]={min:0,span:true,optional:true,tip:id.startsWith('inflect')?'จุดที่โมเมนต์เปลี่ยนเครื่องหมาย วัด x จากผิวรองรับซ้ายเป็น mm; เว้นว่างเมื่อยังไม่มีผลวิเคราะห์':'จุดที่ไม่ต้องใช้เหล็กชุดนี้จากซองโมเมนต์ วัด x จากผิวรองรับซ้ายเป็น mm; ไม่ใช่ปลายเหล็กที่จัด'};
for(const id of ['cutVu','cutPhiVn'])guidanceFieldRules[id]={min:0,max:1e6,optional:true,tip:id==='cutVu'?'Vu สูงสุดที่จุดตัดทั้งหมด จากรายการคำนวณ วสท. หน่วย kN':'φVn ต่ำสุดที่จุดตัดทั้งหมด จากรายการคำนวณ วสท. หน่วย kN; ไม่กรอกกำลังที่คาดหวัง'};
let guidancePreview=null,guidanceUndo=null;
function guidanceLabel(id){return document.querySelector(`label[for="${id}"]`)?.textContent||id;}
function displayGuidanceValue(id,value){const field=document.getElementById(id);return field?.tagName==='SELECT'?[...field.options].find(o=>o.value===String(value))?.textContent??guidanceNumber(Number(value)):guidanceNumber(Number(value));}
function initGuidanceUi(){
 document.querySelector('form').noValidate=true;
 for(const [id,rule] of Object.entries(guidanceFieldRules)){const input=document.getElementById(id);if(!input)continue;const hint=document.createElement('small');hint.id='help-'+id;hint.className='field-help';hint.textContent=rule.tip;input.insertAdjacentElement('afterend',hint);input.setAttribute('aria-describedby',hint.id);}
 document.addEventListener('click',event=>{
  const focus=event.target.closest('[data-guide-field]');if(focus){focusGuidanceField(focus.dataset.guideField);return;}
  const link=event.target.closest('[data-review-link]');if(link){event.preventDefault();const node=document.getElementById(link.dataset.reviewLink);if(node){for(let d=node.parentElement?.closest('details');d;d=d.parentElement?.closest('details'))d.open=true;node.scrollIntoView({behavior:'smooth',block:'start'});}return;}
  const propose=event.target.closest('[data-propose]');if(propose){previewGuidance(propose.dataset.propose);return;}
  if(event.target.closest('#applyGuidance'))applyGuidance();
  if(event.target.closest('#undoGuidance'))undoGuidance();
 });
}
function focusGuidanceField(id){const input=document.getElementById(id);if(!input)return;for(let d=input.closest('details');d;d=d.parentElement?.closest('details'))d.open=true;input.scrollIntoView({behavior:'smooth',block:'center'});input.focus({preventScroll:true});}
function validateGuidanceForm(){
 const errors=[],form=document.querySelector('form'),span=Number(form.elements.namedItem('L').value);
 for(const [id,rule] of Object.entries(guidanceFieldRules)){
  const input=document.getElementById(id);if(!input)continue;input.removeAttribute('aria-invalid');const raw=input.value.trim(),value=Number(raw);
  if(raw===''&&rule.optional)continue;
  const max=rule.span?span:rule.max;
  if(raw===''||!Number.isFinite(value)||(rule.positive&&value<=0)||(rule.min!==undefined&&value<rule.min)||(Number.isFinite(max)&&value>max)||(rule.integer&&!Number.isInteger(value))){
   input.setAttribute('aria-invalid','true');const range=rule.positive?'มากกว่า 0':`ตั้งแต่ ${rule.min??0}`;errors.push({id,label:guidanceLabel(id),expected:`${range}${Number.isFinite(max)?' ถึง '+max:''}${rule.integer?' และเป็นจำนวนเต็ม':''}`,tip:rule.tip});
  }
 }
 if(errors.length){document.querySelector('#guidanceResult').innerHTML=`<div class="guidance-error"><h3>ยังคำนวณไม่ได้: ตรวจข้อมูล ${errors.length} ช่อง</h3>${errors.map(e=>`<article><b>${guidanceEscape(e.label)}</b><p>ค่าที่รองรับ: ${guidanceEscape(e.expected)}</p><p>${guidanceEscape(e.tip)}</p><button type="button" data-guide-field="${e.id}" class="small-button">ไปแก้ช่องนี้</button></article>`).join('')}<p>ใช้ข้อมูลจากแบบ วัสดุ และผลวิเคราะห์จริง ไม่เปลี่ยนแรงให้ต่ำลงเพื่อทำให้ผลผ่าน</p></div>`;return false;}
 return true;
}
function showGuidanceException(error){
 const message=String(error.message),geometry=/หน้าตัด|โมเมนต์สูง|จัดเหล็ก|เกินขอบเขต/.test(message);
 document.querySelector('#guidanceResult').innerHTML=`<div class="guidance-error"><h3>ยังคำนวณไม่ได้</h3><p>${guidanceEscape(message)}</p><p>${geometry?'ตรวจขนาดหน้าตัด ระยะหุ้ม ขนาดเหล็ก และหน่วยก่อน หากแรงถูกต้องให้ลองเพิ่มความกว้างหรือความสูงแล้วคำนวณใหม่ โดยคงแรงออกแบบและวัสดุจริงไว้':'ตรวจข้อมูลที่กรอกและขอบเขตของโมดูล แล้วคำนวณใหม่ หากมีข้อมูลจากผลวิเคราะห์ไม่ครบให้เว้นเฉพาะช่องที่ระบุว่าเว้นว่างได้'}</p><button type="button" data-guide-field="${geometry?'h':'b'}" class="small-button">ไปตรวจข้อมูลคาน</button><p class="muted">ยังไม่มีค่าที่แนะนำเป็นตัวเลข เพราะยังตรวจยืนยันแบบทดลองไม่ได้</p></div>`;
}
function reviewLink(key){const item=current?.review?.items.find(x=>x.key===key);return item?`<a class="review-link" href="#${item.id}" data-review-link="${item.id}">${item.ok===false?'ดูวิธีแก้':'ต้องเพิ่มอะไร'}</a>`:'';}
function renderGuidanceReview(){
 const review=current.review;
 const card=item=>`<article id="${item.id}" class="advice-card ${item.ok===null?'advice-pending':''}"><div class="advice-title"><h3>${guidanceEscape(item.title)}</h3><b class="${item.ok===null?'pending':'fail'}">${item.ok===null?'ยังไม่ตรวจ':'ไม่ผ่าน'}</b></div><p class="advice-values">ข้อมูลที่ใช้ตรวจ: ${guidanceEscape(item.values)}</p><ol>${item.steps.map(s=>`<li>${guidanceEscape(s)}</li>`).join('')}</ol><div class="advice-actions">${item.field?`<button type="button" data-guide-field="${item.field}" class="small-button secondary">ไปที่ช่องข้อมูล</button>`:''}${item.proposal?`<button type="button" data-propose="${item.id}" class="small-button">ดูแบบทดลองที่แนะนำ</button>`:''}</div></article>`;
 document.querySelector('#guidanceResult').innerHTML=`<div class="review-counts"><b class="${review.failed?'fail':'pass'}">${review.failed} รายการต้องแก้</b><b class="pending">${review.pending} รายการยังต้องตรวจ</b></div><p class="muted">แบบทดลองจะคำนวณใหม่ด้วยแรงและวัสดุเดิม พร้อมแจ้งรายการที่ดีขึ้นและรายการที่อาจไม่ผ่านเพิ่ม ต้องตรวจผลวิเคราะห์ใหม่เมื่อเปลี่ยนขนาดคาน</p>${guidanceUndo?'<button type="button" id="undoGuidance" class="secondary small-button">ย้อนค่าที่แนะนำล่าสุด</button>':''}<div id="guidancePreview" aria-live="polite"></div>${review.items.filter(i=>i.ok===false).map(card).join('')}${review.pending?`<details class="pending-group"><summary>ข้อมูลที่ต้องเพิ่มและวิธีตรวจรายการที่เหลือ (${review.pending})</summary>${review.items.filter(i=>i.ok===null).map(card).join('')}</details>`:''}${!review.failed&&!review.pending?'<p>ไม่มีรายการค้างในขอบเขตที่ตรวจ แต่ยังต้องตรวจขอบเขตอื่นก่อนใช้เป็นแบบก่อสร้าง</p>':''}`;
}
function previewGuidance(id){
 if(!current)return;const item=current.review.items.find(x=>x.id===id);if(!item)return;const output=document.getElementById('guidancePreview');output.innerHTML='<p>กำลังตรวจแบบทดลอง…</p>';
 const result=proposeGuidance(current,item);guidancePreview=result;
 if(!result){output.innerHTML='<div class="warn">ยังไม่พบค่าที่แก้รายการนี้ได้ในขอบเขตต้นแบบ กรุณาปรับรายละเอียดตามคำแนะนำและคำนวณใหม่ หรือให้วิศวกรตรวจวิธีอื่น ไม่ได้เปลี่ยนข้อมูลเดิม</div>';output.scrollIntoView({behavior:'smooth',block:'start'});return;}
 const changes=Object.entries(result.patch).map(([field,value])=>({field,value,old:document.getElementById(field).value}));
 output.innerHTML=`<div class="proposal-box"><h3>แบบทดลอง: ${guidanceEscape(item.title)}</h3><table><tr><th>รายการ</th><th>เดิม</th><th>เสนอ</th></tr>${changes.map(c=>`<tr><td>${guidanceEscape(guidanceLabel(c.field))}</td><td>${guidanceEscape(displayGuidanceValue(c.field,c.old))}</td><td>${guidanceEscape(displayGuidanceValue(c.field,c.value))}</td></tr>`).join('')}</table><p class="pass"><b>คำนวณซ้ำแล้ว: รายการที่เลือกผ่านในแบบทดลองนี้</b></p><p>แก้รายการเดิมได้ ${result.resolved.length} รายการ • ยังมี ${result.remaining.length} รายการไม่ผ่าน • ${result.pending} รายการยังไม่ตรวจ</p>${result.newFailures.length?`<p class="fail"><b>มีรายการไม่ผ่านเพิ่ม ${result.newFailures.length} รายการ</b></p><ul>${result.newFailures.map(c=>`<li>${guidanceEscape(c.name)}</li>`).join('')}</ul>`:'<p>ไม่พบรายการไม่ผ่านเพิ่มในขอบเขตที่โปรแกรมตรวจ</p>'}<p class="muted">ใช้ได้เมื่อปรับรายละเอียดในแบบจริงได้เท่านั้น ขนาดคานที่เปลี่ยนมีผลต่อน้ำหนักและความแข็ง ต้องวิเคราะห์แรงใหม่ก่อนใช้งานจริง ระยะฝังที่มีและจุดจากผลวิเคราะห์ยังคงเดิม</p><button type="button" id="applyGuidance">ใช้แบบทดลองนี้และคำนวณใหม่</button></div>`;
 output.scrollIntoView({behavior:'smooth',block:'start'});
}
function applyGuidance(){
 if(!current||!guidancePreview?.targetResolved)return;const patch=guidancePreview.patch;
 guidanceUndo=Object.fromEntries(Object.keys(patch).map(k=>[k,document.getElementById(k).value]));
 for(const [key,value] of Object.entries(patch))document.getElementById(key).value=String(value);
 guidancePreview=null;run();document.getElementById('guidanceNotice').textContent='ใช้ค่าทดลองและคำนวณใหม่แล้ว ตรวจรายการที่ยังไม่ผ่านและยังไม่ตรวจด้านล่าง';
}
function undoGuidance(){if(!guidanceUndo)return;for(const [key,value] of Object.entries(guidanceUndo))document.getElementById(key).value=value;guidanceUndo=null;guidancePreview=null;run();document.getElementById('guidanceNotice').textContent='ย้อนค่าที่แนะนำล่าสุดแล้ว และคำนวณใหม่ตามข้อมูลก่อนปรับ';}
function clearGuidanceForEdit(){guidancePreview=null;guidanceUndo=null;document.getElementById('guidanceNotice').textContent='';document.querySelector('#guidanceResult').innerHTML='<p class="warn">ข้อมูลเปลี่ยนแล้ว กดคำนวณเพื่อปรับคำแนะนำตามข้อมูลใหม่</p>';}
