const $=s=>document.querySelector(s);
const money=n=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',minimumFractionDigits:2}).format(Number(n||0));
let lines=[{description:'Travel package',qty:1,rate:0}],packages=[];
let currentInvoiceId=null;

const iso=d=>d.toISOString().slice(0,10),today=new Date();
$('#invoice-date').value=iso(today);
$('#invoice-due').value=iso(new Date(today.getTime()+7*86400000));
$('#invoice-number').value=`BT-${today.getFullYear()}-${String(Date.now()).slice(-6)}`;

const value=(id,fallback='')=>$(id)?.value?.trim()||fallback;

function readLines(){lines=[...document.querySelectorAll('.line-input-row')].map(r=>({description:r.querySelector('[data-description]').value,qty:Number(r.querySelector('[data-qty]').value||0),rate:Number(r.querySelector('[data-rate]').value||0)}))}

function renderLineInputs(){
  const h=$('#line-inputs');
  h.innerHTML=lines.map((x,i)=>`<div class="line-input-row"><input data-description value="${x.description}" placeholder="Package, flight, hotel or service"><input data-qty type="number" min="0" value="${x.qty}"><input data-rate type="number" min="0" step="0.01" value="${x.rate}"><button type="button" data-remove="${i}" style="width:32px;height:32px;border-radius:8px;border:1px solid var(--line);background:var(--surface);cursor:pointer;display:flex;align-items:center;justify-content:center"><i class="hgi-stroke hgi-cancel-01" style="font-size:14px"></i></button></div>`).join('');
  h.querySelectorAll('input').forEach(x=>x.oninput=()=>{readLines();update();setTimeout(scalePreview,80);});
  h.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{readLines();lines.splice(Number(b.dataset.remove),1);if(!lines.length)lines=[{description:'Travel service',qty:1,rate:0}];renderLineInputs();update();setTimeout(scalePreview,80);});
}

const dl=rows=>rows.filter(x=>x[1]).map(x=>`<dt>${x[0]}</dt><dd>${x[1]}</dd>`).join('');

function travelDetails(){return{package_name:value('#invoice-trip'),package_type:value('#invoice-type'),travel_date:value('#invoice-travel-date'),travellers:Number(value('#invoice-travellers','1')),destination:value('#invoice-destination'),flight:{included:$('#flight-included').checked,airline:value('#flight-airline'),number:value('#flight-number'),pnr:value('#flight-pnr'),cabin:value('#flight-cabin'),from:value('#flight-from'),to:value('#flight-to'),departure:value('#flight-departure'),arrival:value('#flight-arrival'),baggage:value('#flight-baggage')},hotel:{included:$('#hotel-included').checked,name:value('#hotel-name'),city:value('#hotel-city'),category:value('#hotel-category'),checkin:value('#hotel-checkin'),checkout:value('#hotel-checkout'),room_type:value('#hotel-room-type'),rooms:Number(value('#hotel-rooms','1')),meals:value('#hotel-meals'),confirmation:value('#hotel-confirmation')}}}

function update(){
  readLines();
  const t=travelDetails(),international=t.package_type==='international';
  $('#international-controls').classList.toggle('show',international);
  $('#out-number').textContent=value('#invoice-number','\u2014');
  $('#out-status').textContent=value('#payment-status','Draft');
  $('#out-customer').textContent=value('#invoice-customer','Customer name');
  $('#out-address').textContent=value('#invoice-address','Billing address');
  $('#out-contact').textContent=[value('#invoice-phone'),value('#invoice-email')].filter(Boolean).join(' \u00b7 ');
  $('#out-date').textContent=value('#invoice-date','\u2014');
  $('#out-due').textContent=value('#invoice-due','\u2014');
  $('#out-booking').textContent=value('#invoice-booking','\u2014');
  $('#out-trip').textContent=t.package_name||'Travel package';
  $('#out-destination').textContent=t.destination||'Destination';
  $('#out-travel-date').textContent=t.travel_date||'\u2014';
  $('#out-travellers').textContent=t.travellers;
  $('#out-type').textContent=international?'International':'Domestic';
  const f=$('#out-flight-card'),h=$('#out-hotel-card');
  f.hidden=!(international&&t.flight.included);
  h.hidden=!t.hotel.included;
  if(!f.hidden){
    $('#out-flight-title').textContent=[t.flight.airline,t.flight.number].filter(Boolean).join(' \u00b7 ')||'Flight booking';
    $('#out-flight-list').innerHTML=dl([['Route',[t.flight.from,t.flight.to].filter(Boolean).join(' \u2192 ')],['Departure',t.flight.departure?.replace('T',' ')],['Arrival',t.flight.arrival?.replace('T',' ')],['Cabin',t.flight.cabin],['PNR',t.flight.pnr],['Baggage',t.flight.baggage]]);
  }
  if(!h.hidden){
    $('#out-hotel-title').textContent=t.hotel.name||'Accommodation';
    $('#out-hotel-list').innerHTML=dl([['City',t.hotel.city],['Stay',[t.hotel.checkin,t.hotel.checkout].filter(Boolean).join(' \u2192 ')],['Room',`${t.hotel.rooms||1} \u00d7 ${t.hotel.room_type||'Room'}`],['Category',t.hotel.category],['Meals',t.hotel.meals],['Confirmation',t.hotel.confirmation]]);
  }
  $('#out-lines').innerHTML=lines.map(x=>`<tr><td style="padding:10px 28px">${x.description||'Travel service'}</td><td style="padding:10px 12px;text-align:center">${x.qty}</td><td style="padding:10px 12px;text-align:right">${money(x.rate)}</td><td style="padding:10px 28px;text-align:right;font-weight:600">${money(x.qty*x.rate)}</td></tr>`).join('');
  const subtotal=lines.reduce((s,x)=>s+x.qty*x.rate,0),discount=Number(value('#discount','0')),rate=Number(value('#tax-rate','0')),tax=Math.max(0,subtotal-discount)*rate/100,total=Math.max(0,subtotal-discount)+tax;
  $('#out-subtotal').textContent=money(subtotal);
  $('#out-discount').textContent=`\u2212 ${money(discount)}`;
  $('#out-tax-label').textContent=`${value('#tax-label','Tax')} (${rate}%)`;
  $('#out-tax').textContent=money(tax);
  $('#out-total').textContent=money(total);
  $('#out-payment').textContent=value('#payment-details','Payment details will be provided separately.');
  $('#out-notes').textContent=value('#invoice-notes','');
  const status=value('#payment-status','Draft');
  const isPaid=status==='Paid';
  if(currentInvoiceId){
    $('#invoice-mark-paid').style.display=isPaid?'none':'';
    $('#invoice-view-bill').style.display=isPaid?'':'none';
  }
  return{subtotal,discount,tax,total,travel_details:t};
}

function payload(){const x=update();return{invoice_number:value('#invoice-number'),invoice_date:value('#invoice-date'),due_date:value('#invoice-due'),booking_ref:value('#invoice-booking'),customer_name:value('#invoice-customer'),customer_address:value('#invoice-address'),phone:value('#invoice-phone'),email:value('#invoice-email'),items:lines,tax_label:value('#tax-label','GST'),tax_rate:Number(value('#tax-rate','0')),discount:x.discount,subtotal:x.subtotal,tax:x.tax,total:x.total,status:value('#payment-status','Draft'),notes:value('#invoice-notes'),payment_details:value('#payment-details'),travel_details:x.travel_details}}

function getToken(){const t=localStorage.getItem('bahadur-admin-token')||'';if(!t)alert('Please log in as admin first.');return t;}

function populateForm(inv){
  const set=(id,val)=>{if($(id)&&val!=null)$(id).value=val};
  set('#invoice-number',inv.invoice_number);set('#invoice-date',inv.invoice_date);
  set('#invoice-due',inv.due_date);set('#invoice-booking',inv.booking_ref);
  set('#invoice-customer',inv.customer_name);set('#invoice-address',inv.customer_address);
  set('#invoice-phone',inv.phone);set('#invoice-email',inv.email);
  set('#tax-label',inv.tax_label||'GST');set('#tax-rate',inv.tax_rate||0);
  set('#discount',inv.discount||0);set('#payment-status',inv.status||'Draft');
  set('#payment-details',inv.payment_details);set('#invoice-notes',inv.notes);
  const td=inv.travel_details||{};
  set('#invoice-trip',td.package_name);set('#invoice-type',td.package_type||'domestic');
  set('#invoice-travel-date',td.travel_date);set('#invoice-travellers',td.travellers||2);
  set('#invoice-destination',td.destination);
  if(td.flight){
    if($('#flight-included'))$('#flight-included').checked=Boolean(td.flight.included);
    set('#flight-airline',td.flight.airline);set('#flight-number',td.flight.number);
    set('#flight-pnr',td.flight.pnr);set('#flight-cabin',td.flight.cabin);
    set('#flight-from',td.flight.from);set('#flight-to',td.flight.to);
    set('#flight-departure',td.flight.departure);set('#flight-arrival',td.flight.arrival);
    set('#flight-baggage',td.flight.baggage);
  }
  if(td.hotel){
    if($('#hotel-included'))$('#hotel-included').checked=Boolean(td.hotel.included);
    set('#hotel-name',td.hotel.name);set('#hotel-city',td.hotel.city);
    set('#hotel-category',td.hotel.category);set('#hotel-checkin',td.hotel.checkin);
    set('#hotel-checkout',td.hotel.checkout);set('#hotel-room-type',td.hotel.room_type);
    set('#hotel-rooms',td.hotel.rooms||1);set('#hotel-meals',td.hotel.meals);
    set('#hotel-confirmation',td.hotel.confirmation);
  }
  if(Array.isArray(inv.items)&&inv.items.length){lines=inv.items;renderLineInputs();}
  update();setTimeout(scalePreview,150);
}

async function loadPackages(){
  const t=localStorage.getItem('bahadur-admin-token')||'';if(!t)return;
  try{
    const r=await fetch('/api/packages?admin=1',{headers:{Authorization:`Bearer ${t}`}});
    if(!r.ok)return;
    const d=await r.json();
    packages=(d.packages||d||[]);
    const dl=$('#package-list');
    if(dl)dl.innerHTML=packages.map(p=>`<option value="${p.name}">`).join('');
  }catch{}
}

$('#add-line').onclick=()=>{readLines();lines.push({description:'',qty:1,rate:0});renderLineInputs();update();setTimeout(scalePreview,80);};
document.querySelectorAll('.invoice-controls input,.invoice-controls textarea,.invoice-controls select').forEach(x=>x.addEventListener('input',()=>{update();setTimeout(scalePreview,80);}));

/* ── Auto-scale preview to fit the narrow pane ── */
function scalePreview(){
  const pane=document.querySelector('.billing-preview-pane');
  const sheet=document.getElementById('invoice-sheet');
  const scaler=document.getElementById('preview-scaler');
  if(!pane||!sheet||!scaler)return;
  const paneW=Math.max(200,pane.clientWidth-24);
  const scale=Math.min(1,paneW/820);
  sheet.style.transform='scale('+scale+')';
  sheet.style.transformOrigin='top left';
  requestAnimationFrame(function(){
    scaler.style.height=(sheet.offsetHeight*scale+20)+'px';
  });
}
window.addEventListener('resize',scalePreview);

/* ── Print ── */
$('#invoice-print').onclick=()=>{
  update();
  document.title=`${value('#invoice-number')} \u00b7 Bahadur Tours`;
  window.print();
};

/* ── Download PDF ── */
$('#invoice-download').onclick=()=>{
  update();
  const sheet=document.getElementById('invoice-sheet');
  if(!sheet){alert('Invoice not ready.');return;}
  const num=value('#invoice-number','Invoice');
  const linkTags=[...document.querySelectorAll('link[rel="stylesheet"]')]
    .map(l=>`<link rel="stylesheet" href="${l.href}">`).join('\n');
  const pw=window.open('','_blank','width=870,height=1120,scrollbars=yes');
  if(!pw){alert('Pop-up blocked. Please allow pop-ups and try again.');return;}
  pw.document.write(`<!doctype html>
<html lang="en"><head>
  <meta charset="UTF-8">
  <title>${num} \u00b7 Bahadur Tours</title>
  ${linkTags}
  <style>
    @page{size:A4 portrait;margin:10mm 12mm}
    *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
    html,body{margin:0;padding:0;background:#fff!important}
    .invoice-sheet{box-shadow:none!important;border-radius:0!important;transform:none!important;width:100%!important;max-width:none!important}
    .no-print,.live-badge{display:none!important}
  </style>
</head><body>
  ${sheet.outerHTML}
  <script>window.onload=function(){setTimeout(function(){window.document.title='${num} \u00b7 Bahadur Tours';window.print();setTimeout(function(){window.close();},2000);},400);};<\/script>
</body></html>`);
  pw.document.close();
};

$('#invoice-save').onclick=async()=>{
  const t=getToken();if(!t)return;
  $('#invoice-state').textContent='Saving\u2026';
  try{
    let r,d;
    if(currentInvoiceId){
      r=await fetch('/api/admin',{method:'PUT',headers:{'Content-Type':'application/json',Authorization:`Bearer ${t}`},body:JSON.stringify({type:'invoice',id:currentInvoiceId,...payload()})});
    }else{
      r=await fetch('/api/admin',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${t}`},body:JSON.stringify({type:'invoice',...payload()})});
    }
    d=await r.json();
    if(!r.ok)throw new Error(d.error);
    if(!currentInvoiceId&&d.invoice?.id){
      currentInvoiceId=d.invoice.id;
      $('#invoice-db-id').value=currentInvoiceId;
      $('#invoice-mark-paid').style.display='';
    }
    const status=value('#payment-status','Draft');
    if(status==='Paid'){$('#invoice-view-bill').style.display='';$('#invoice-mark-paid').style.display='none';}
    $('#invoice-state').textContent=`Saved \u00b7 ${new Date().toLocaleString('en-IN')}`;
  }catch(e){$('#invoice-state').textContent=`Not saved: ${e.message}`}
};

$('#invoice-mark-paid').onclick=async()=>{
  if(!currentInvoiceId){alert('Save the invoice first before marking as paid.');return;}
  if(!confirm('Mark this invoice as Paid?'))return;
  const t=getToken();if(!t)return;
  $('#invoice-state').textContent='Updating\u2026';
  try{
    const r=await fetch('/api/admin',{method:'PATCH',headers:{'Content-Type':'application/json',Authorization:`Bearer ${t}`},body:JSON.stringify({type:'invoice',id:currentInvoiceId,status:'Paid'})});
    const d=await r.json();if(!r.ok)throw new Error(d.error);
    $('#payment-status').value='Paid';
    $('#invoice-mark-paid').style.display='none';
    $('#invoice-view-bill').style.display='';
    update();
    $('#invoice-state').textContent=`Marked as Paid \u00b7 ${new Date().toLocaleString('en-IN')}`;
  }catch(e){$('#invoice-state').textContent=`Error: ${e.message}`}
};

$('#invoice-view-bill').onclick=()=>{
  if(currentInvoiceId)window.open(`paid-bill.html?id=${currentInvoiceId}`,'_blank');
};

$('#load-invoice-btn').onclick=async()=>{
  const id=$('#load-invoice-id').value.trim();
  if(!id){alert('Enter an invoice ID first');return;}
  const t=getToken();if(!t)return;
  $('#invoice-state').textContent='Loading\u2026';
  try{
    const r=await fetch(`/api/admin?id=${encodeURIComponent(id)}`,{headers:{Authorization:`Bearer ${t}`}});
    const d=await r.json();if(!r.ok)throw new Error(d.error||'Not found');
    currentInvoiceId=d.invoice.id;
    $('#invoice-db-id').value=currentInvoiceId;
    populateForm(d.invoice);
    $('#invoice-state').textContent='Invoice loaded.';
  }catch(e){$('#invoice-state').textContent=`Load failed: ${e.message}`}
};

renderLineInputs();
loadPackages();
update();
setTimeout(scalePreview,150);

(async function autoLoadFromUrl(){
  const params=new URLSearchParams(window.location.search);
  const id=params.get('id')||params.get('invoice_id');
  if(!id)return;
  const t=localStorage.getItem('bahadur-admin-token')||'';
  if(!t)return;
  $('#invoice-state').textContent='Loading invoice\u2026';
  try{
    const r=await fetch(`/api/admin?id=${encodeURIComponent(id)}`,{headers:{Authorization:`Bearer ${t}`}});
    const d=await r.json();if(!r.ok)throw new Error(d.error||'Not found');
    currentInvoiceId=d.invoice.id;
    $('#invoice-db-id').value=currentInvoiceId;
    populateForm(d.invoice);
    $('#invoice-state').textContent='Invoice loaded.';
  }catch(e){$('#invoice-state').textContent=`Auto-load failed: ${e.message}`}
})();
