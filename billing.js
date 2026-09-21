const $=s=>document.querySelector(s);

const money=n=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',minimumFractionDigits:2}).format(Number(n||0));

let lines=[{description:'Travel package',qty:1,rate:0}],packages=[];

let currentInvoiceId=null;

let customers=[];



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



function esc(s){return String(s).replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));}



function getPassengers(){

  const passengers=[];

  // Read from plain text input (paste names)

  const plain=value('#invoice-names-plain');

  if(plain){

    plain.split('\n').filter(l=>l.trim()).forEach(line=>{

      const parts=line.split('-').map(p=>p.trim());

      if(parts.length>=1){

        let type='adult';

        if(parts[0].toLowerCase().includes('kid')||parts[0].toLowerCase().includes('child')||parts[0].toLowerCase().includes('baby'))type='kid';

        passengers.push({name:parts[0],type,age:parts[1]?Number(parts[1]):null});

      }

    });

  }

  // Read from ALL passenger table rows (including first row = main customer)

  const tbody=$('#passenger-table tbody');

  if(tbody){

    const rows=tbody.querySelectorAll('tr');

    rows.forEach((row)=>{

      const nameInput=row.querySelector('input[type="text"]');

      const typeSelect=row.querySelector('select');

      const ageInput=row.querySelector('input[type="number"]');

      if(nameInput && nameInput.value.trim()){

        let type='adult';

        if(typeSelect && typeSelect.value==='kid')type='kid';

        const age=ageInput?Number(ageInput.value):null;

        passengers.push({name:nameInput.value.trim(),type,age});

      }

    });

  }

  // If no passengers from table, use dropdown customer as fallback

  if(!passengers.length){

    const mainName=value('#invoice-customer');

    if(mainName && mainName!=='')passengers.push({name:mainName,type:'adult',age:null});

  }

  return passengers;

}



function travelDetails(){

  return{

    package_name:value('#invoice-trip'),

    package_type:value('#invoice-type'),

    travel_date:value('#invoice-travel-date'),

    travellers:Number(value('#invoice-travellers','1')),

    kids:Number(value('#invoice-kids','0')),

    kids_price:Number(value('#invoice-kids-price','0')),

    destination:value('#invoice-destination'),

    passenger_names:getPassengers(),

    kids_names:value('#invoice-kids-names'),

    multi_customers:value('#invoice-multi-customers'),

    payment_remarks:value('#invoice-payment-remarks'),

    flight:{

      included:$('#flight-included').checked,

      airline:value('#flight-airline'),

      number:value('#flight-number'),

      pnr:value('#flight-pnr'),

      cabin:value('#flight-cabin'),

      from:value('#flight-from'),

      to:value('#flight-to'),

      departure:value('#flight-departure'),

      arrival:value('#flight-arrival'),

      baggage:value('#flight-baggage')

    },

    hotel:{

      included:$('#hotel-included').checked,

      name:value('#hotel-name'),

      city:value('#hotel-city'),

      category:value('#hotel-category'),

      checkin:value('#hotel-checkin'),

      checkout:value('#hotel-checkout'),

      room_type:value('#hotel-room-type'),

      rooms:Number(value('#hotel-rooms','1')),

      meals:value('#hotel-meals'),

      confirmation:value('#hotel-confirmation')

    }

  }

}



function update(){

  readLines();

  const t=travelDetails(),international=t.package_type==='international';

  $('#international-controls').classList.toggle('show',international);

  $('#out-number').textContent=value('#invoice-number','\u2014');

  $('#out-status').textContent=value('#payment-status','Draft');

  // Customer display - handle both dropdown and manual mode

  const customerVal=value('#invoice-customer');

  $('#out-customer').textContent=customerVal==='__manual__'?value('#invoice-customer-new','Customer name'):customerVal||'Customer name';

  $('#out-address').textContent=value('#invoice-address','Billing address');

  $('#out-contact').textContent=[value('#invoice-phone'),value('#invoice-email')].filter(Boolean).join(' \u00b7 ');

  $('#out-date').textContent=value('#invoice-date','\u2014');

  $('#out-due').textContent=value('#invoice-due','\u2014');

  $('#out-booking').textContent=value('#invoice-booking','\u2014');

  $('#out-trip').textContent=t.package_name||'Travel package';

  $('#out-destination').textContent=t.destination||'Destination';

  $('#out-travel-date').textContent=t.travel_date||'\u2014';

  $('#out-travellers').textContent=t.travellers;

  $('#out-kids').textContent=t.kids>0?t.kids+' kids':'\u2014';

  $('#out-kids-price').textContent=t.kids_price>0?'₹'+t.kids_price.toLocaleString()+' per kid':'\u2014';

  $('#out-kids-names').textContent=t.kids_names||(t.kids>0?'Kids names required':'—');

  $('#out-multi-customers').innerHTML=t.passenger_names&&t.passenger_names.length?t.passenger_names.map((p,i)=>'<div style="padding:5px 0;border-bottom:1px solid #e8efec"><strong style="color:#1a2332">'+(i+1)+'. '+esc(p.name)+'</strong> <span style="color:#74807c;font-size:11px">'+p.type.toUpperCase()+(p.age!=null?'  ·  Age '+p.age:'')+'</span></div>').join(''):(t.multi_customers?t.multi_customers.split('\n').filter(l=>l.trim()).map(n=>'<div>'+n.trim()+'</div>').join(''):'');



  // MakeMyTrip-style bold traveler list

  const travelersList=$('#out-travelers-list');

  const travelerCount=$('#traveler-count');

  if(travelersList && t.passenger_names&&t.passenger_names.length){

    travelersList.innerHTML=t.passenger_names.map((p,i)=>
      '<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #e8efec">'+
        '<strong style="color:#1a2332;font-size:14px;min-width:22px">'+(i+1)+'.</strong>'+
        '<span style="color:#1a2332;font-size:14px;flex:1;font-weight:600">'+esc(p.name)+'</span>'+
        '<span style="color:#74807c;font-size:11px;text-transform:uppercase;letter-spacing:.04em">'+p.type.toUpperCase()+(p.age!=null?'  ·  Age '+p.age:'')+'</span>'+
      '</div>').join('');

    travelerCount.textContent='('+t.passenger_names.length+')';

  }else if(travelersList){ travelersList.innerHTML=''; travelerCount.textContent=''; }



  $('#out-payment-remarks').textContent=t.payment_remarks||'';

    // Hide empty remark box

    const remarksBox=$('#out-payment-remarks');

    if(remarksBox){

      remarksBox.style.display=t.payment_remarks?'':'none';

    }

    $('#out-type').textContent=international?'International':'Domestic';

  

  const f=$('#out-flight-card'),h=$('#out-hotel-card');

  f.hidden=!(international&&t.flight.included);

  h.hidden=!t.hotel.included;

  

  if(!f.hidden){

    $('#out-flight-title').textContent=[t.flight.airline,t.flight.number].filter(Boolean).join(' \u00b7 ')||'Flight booking';

    $('#out-flight-list').innerHTML=dl([

      ['Route',[t.flight.from,t.flight.to].filter(Boolean).join(' \u2192 ')],

      ['Departure',t.flight.departure?.replace('T',' ')],

      ['Arrival',t.flight.arrival?.replace('T',' ')],

      ['Cabin',t.flight.cabin],

      ['PNR',t.flight.pnr],

      ['Baggage',t.flight.baggage]

    ]);

  }

  if(!h.hidden){

    $('#out-hotel-title').textContent=t.hotel.name||'Accommodation';

    $('#out-hotel-list').innerHTML=dl([

      ['City',t.hotel.city],

      ['Stay',[t.hotel.checkin,t.hotel.checkout].filter(Boolean).join(' \u2192 ')],

      ['Room',`${t.hotel.rooms||1} \u00d7 ${t.hotel.room_type||'Room'}`],

      ['Category',t.hotel.category],

      ['Meals',t.hotel.meals],

      ['Confirmation',t.hotel.confirmation]

    ]);

  }

  

  $('#out-lines').innerHTML=lines.map(x=>`<tr>

    <td style="padding:10px 28px">${x.description||'Travel service'}</td>

    <td style="padding:10px 12px;text-align:center">${x.qty}</td>

    <td style="padding:10px 12px;text-align:right">${money(x.rate)}</td>

    <td style="padding:10px 28px;text-align:right;font-weight:600">${money(x.qty*x.rate)}</td>

  </tr>`).join('');

  

  // Calculate totals including kids price

  const baseSubtotal=lines.reduce((s,x)=>s+x.qty*x.rate,0);

  const kidsCost=t.kids*t.kids_price;

  const subtotal=baseSubtotal+kidsCost;

  const discount=Number(value('#discount','0'));

  const rate=Number(value('#tax-rate','0'));

  const tax=Math.max(0,subtotal-discount)*rate/100;

  const total=Math.max(0,subtotal-discount)+tax;

  

  $('#out-subtotal').textContent=money(subtotal);

  $('#out-discount').textContent=`\u2212 ${money(discount)}`;

  $('#out-tax-label').textContent=`${value('#tax-label','Tax')} (${rate}%)`;

  $('#out-tax').textContent=money(tax);

  $('#out-total').textContent=money(total);

  $('#out-payment').textContent=value('#payment-details','Payment details will be provided separately.');

  $('#out-pending').textContent=value('#invoice-pending-amount','0');
  $('#out-paid').textContent=value('#invoice-paid-amount','0');

  const paidVal=Number(value('#invoice-paid-amount',0));
  // Show paid status in green if fully paid
  if(paidVal>0){
    const paidRow=document.querySelector('dl pro-invoice-bottom dl')?.querySelector('#out-paid')?.parentElement;
    // just update text - styling is in HTML
  }

  // Show paid success box if amount paid
  const paidBox=$('#out-paid-success-box');
  if(paidBox){
    if(paidVal>0){ paidBox.style.display=''; $('#out-paid-alert').textContent=money(paidVal); }
    else { paidBox.style.display='none'; }
  }

  // Show pending alert box if there's a pending amount

  const pendingVal=Number(value('#invoice-pending-amount',0));

  const alertBox=$('#out-pending-alert-box');

  if(alertBox){

    alertBox.style.display=pendingVal>0?'':'none';

    $('#out-pending-alert').textContent=money(pendingVal);

  }

  $('#out-notes').textContent=value('#invoice-notes','');

  

  const status=value('#payment-status','Draft');

  const isPaid=status==='Paid';

  if(currentInvoiceId){

    $('#invoice-mark-paid').style.display=isPaid?'none':'';

    $('#invoice-view-bill').style.display=isPaid?'':'none';

  }

  return{

    subtotal,discount,tax,total,

    travel_details:t,

    pending_amount:Number(value('#invoice-pending-amount',0)),
    paid_amount:Number(value('#invoice-paid-amount',0))

  };

}



function payload(){

  const x=update();

  return{

    invoice_number:value('#invoice-number'),

    invoice_date:value('#invoice-date'),

    due_date:value('#invoice-due'),

    booking_ref:value('#invoice-booking'),

    customer_name:value('#invoice-customer')==='__manual__'?value('#invoice-customer-new'):value('#invoice-customer'),

    customer_address:value('#invoice-address'),

    phone:value('#invoice-phone'),

    email:value('#invoice-email'),

    items:lines,

    tax_label:value('#tax-label','GST'),

    tax_rate:Number(value('#tax-rate','0')),

    discount:x.discount,

    subtotal:x.subtotal,

    tax:x.tax,

    total:x.total,

    status:value('#payment-status','Draft'),

    notes:value('#invoice-notes'),

    payment_details:value('#payment-details'),

    pending_amount:x.pending_amount,

    paid_amount:x.paid_amount,

    payment_remarks:value('#invoice-payment-remarks'),

    passenger_names:x.travel_details.passenger_names,

    kids_names:x.travel_details.kids_names,

    travel_details:x.travel_details

  };

}



function getToken(){

  try{

    const t=localStorage.getItem('bahadur-admin-token')||'';

    if(!t)alert('Please log in as admin first.');

    return t;

  }catch(e){

    alert('Storage unavailable. Please use standard browser mode.');

    return '';

  }

}



function populateForm(inv){

  const set=(id,val)=>{if($(id)&&val!=null)$(id).value=val};

  

  set('#invoice-number',inv.invoice_number);

  set('#invoice-date',inv.invoice_date);

  set('#invoice-due',inv.due_date);

  set('#invoice-booking',inv.booking_ref);

  

  // Customer: try to find in dropdown, else use manual mode

  const customerSel=$('#invoice-customer');

  if(customerSel && customers.length){

    const match=customers.find(c=>c.name===inv.customer_name);

    if(match){

      customerSel.value=match.name;

      $('#new-customer-field').style.display='none';

    }else{

      customerSel.value='__manual__';

      $('#invoice-customer-new').value=inv.customer_name;

      $('#new-customer-field').style.display='';

    }

 }else{

    set('#invoice-customer',inv.customer_name);

  }

  

  set('#invoice-address',inv.customer_address);

  set('#invoice-phone',inv.phone);

  set('#invoice-email',inv.email);

  set('#tax-label',inv.tax_label||'GST');

  set('#tax-rate',inv.tax_rate||0);

  set('#discount',inv.discount||0);

  set('#payment-status',inv.status||'Draft');

  set('#payment-details',inv.payment_details);

  set('#invoice-notes',inv.notes);

  set('#invoice-paid-amount',inv.paid_amount||0);

  set('#invoice-pending-amount',inv.pending_amount||0);

  set('#invoice-multi-customers',inv.multi_customers||'');

    set('#invoice-kids-names',inv.kids_names||'');

    set('#invoice-names-plain',inv.multi_customers||'');

    set('#invoice-payment-remarks',inv.payment_remarks||inv.payment_details||'');

    // Show kids names section if kids > 0

    if(Number(value('#invoice-kids','0'))>0){$('#kids-names-section').style.display='';}

  

  const td=inv.travel_details||{};

  set('#invoice-trip',td.package_name);

  set('#invoice-type',td.package_type||'domestic');

  set('#invoice-travel-date',td.travel_date);

  set('#invoice-travellers',td.travellers||2);

  set('#invoice-kids',td.kids||0);

  set('#invoice-kids-price',td.kids_price||0);

  set('#invoice-destination',td.destination);

  

  if(td.flight){

    if($('#flight-included'))$('#flight-included').checked=Boolean(td.flight.included);

    set('#flight-airline',td.flight.airline);

    set('#flight-number',td.flight.number);

    set('#flight-pnr',td.flight.pnr);

    set('#flight-cabin',td.flight.cabin);

    set('#flight-from',td.flight.from);

    set('#flight-to',td.flight.to);

    set('#flight-departure',td.flight.departure);

    set('#flight-arrival',td.flight.arrival);

    set('#flight-baggage',td.flight.baggage);

  }

  if(td.hotel){

    if($('#hotel-included'))$('#hotel-included').checked=Boolean(td.hotel.included);

    set('#hotel-name',td.hotel.name);

    set('#hotel-city',td.hotel.city);

    set('#hotel-category',td.hotel.category);

    set('#hotel-checkin',td.hotel.checkin);

    set('#hotel-checkout',td.hotel.checkout);

    set('#hotel-room-type',td.hotel.room_type);

    set('#hotel-rooms',td.hotel.rooms||1);

    set('#hotel-meals',td.hotel.meals);

    set('#hotel-confirmation',td.hotel.confirmation);

  }

  

  if(Array.isArray(inv.items)&&inv.items.length){

    lines=inv.items;

    renderLineInputs();

  }

  update();

  setTimeout(scalePreview,150);

}



async function loadPackages(){

  const t=localStorage.getItem('bahadur-admin-token')||'';

  if(!t)return;

  try{

    const r=await fetch('/api/packages?admin=1',{headers:{Authorization:'Bearer '+t}});

    if(!r.ok)return;

    const d=await r.json();

    packages=(d.packages||d||[]);

    const dl=$('#package-list');

    if(dl)dl.innerHTML=packages.map(p=>`<option value="${p.name}">`).join('');

  }catch(e){console.warn('Package load failed:',e.message);}

}



async function loadCustomers(){

  const t=localStorage.getItem('bahadur-admin-token')||'';

  if(!t)return;

  try{

    const r=await fetch('/api/admin?type=customers&limit=200',{headers:{Authorization:'Bearer '+t}});

    if(!r.ok)return;

    const d=await r.json();

    customers=d.customers||[];

    const sel=$('#invoice-customer');

    if(sel && customers.length){

      const currentVal=sel.value;

      sel.innerHTML='<option value="">Select a customer</option>'+

        customers.map(c=>`<option value="${c.name}" ${c.name===currentVal?'selected':''}>${c.name} — ${c.phone} — ${c.city||'—'}</option>`).join('')+

        '<option value="__manual__">+ Enter new customer name</option>';

    }

  }catch(e){console.warn('Customer load failed:',e.message);}

}



$('#add-line').onclick=()=>{

  readLines();

  lines.push({description:'',qty:1,rate:0});

  renderLineInputs();

  update();

  setTimeout(scalePreview,80);

};



document.querySelectorAll('.invoice-controls input,.invoice-controls textarea,.invoice-controls select,#passenger-table input,#passenger-table select').forEach(x=>{

  x.addEventListener('input',()=>{update();setTimeout(scalePreview,80);});

});



// Customer dropdown handler

const customerSel=$('#invoice-customer');

if(customerSel){

  customerSel.onchange=()=>{

    const field=$('#new-customer-field');

    if(customerSel.value==='__manual__'){

      field.style.display='';

      $('#invoice-customer-new').focus();

    }else{

      field.style.display='none';

      $('#invoice-customer-new').value='';

    }

    update();

  };

}



// Kids field handlers

$('#invoice-kids')?.addEventListener('input',()=>{update();setTimeout(scalePreview,80);});

$('#invoice-kids-price')?.addEventListener('input',()=>{update();setTimeout(scalePreview,80);});

$('#invoice-paid-amount')?.addEventListener('input',()=>{update();setTimeout(scalePreview,80);});



// Add Passenger button handler

$('#add-passenger-btn')?.addEventListener('click',()=>{

  const tbody=$('#passenger-table tbody');

  if(!tbody)return;

  const rowCount=tbody.querySelectorAll('tr').length;

  const newRow=document.createElement('tr');

  newRow.innerHTML=`<td>${rowCount+1}</td>

    <td><input type="text" id="passenger-${rowCount+1}-name" placeholder="Passenger ${rowCount+1}" style="width:100%;padding:8px 10px;border:1px solid var(--line);border-radius:6px;font-size:14px"></td>

    <td><select id="passenger-${rowCount+1}-type" style="padding:6px;border:1px solid var(--line);border-radius:6px;font-size:13px;background:#fff"><option value="adult">Adult</option><option value="kid">Kid</option></select></td>

    <td><input type="number" id="passenger-${rowCount+1}-age" min="0" max="120" placeholder="Age" style="width:70px;padding:6px 8px;border:1px solid var(--line);border-radius:6px;font-size:13px"></td>`;

  tbody.appendChild(newRow);

  // Bind input events for new row

  newRow.querySelectorAll('input,select').forEach(el=>{

    el.addEventListener('input',()=>{update();setTimeout(scalePreview,80);});

  });

  update();

});



// Bind input events for ORIGINAL passenger table row (main-passenger-row)

const origRow=document.querySelector('#main-passenger-row');

if(origRow){

  origRow.querySelectorAll('input,select').forEach(el=>{

    el.addEventListener('input',()=>{update();setTimeout(scalePreview,80);});

  });

}



// Bind listeners for other name-related fields

$('#invoice-names-plain')?.addEventListener('input',()=>{update();setTimeout(scalePreview,80);});

$('#invoice-kids-names')?.addEventListener('input',()=>{update();setTimeout(scalePreview,80);});

$('#invoice-customer')?.addEventListener('change',()=>{update();setTimeout(scalePreview,80);});

$('#invoice-customer-new')?.addEventListener('input',()=>{update();setTimeout(scalePreview,80);});



/* ── Auto-scale preview to fit the narrow pane ── */

function scalePreview(){

  const sheet=document.getElementById('invoice-sheet');

  if(!sheet)return;

  // Auto-scale removed - let invoice-sheet render at natural size

  // The sheet is hidden on screen, only shown in print/PDF

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
    @page{size:A4;margin:0}
    *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
    html,body{margin:0;padding:0;background:#fff!important;font-family:'Poppins',Helvetica Neue,Arial,sans-serif;min-height:296mm;display:flex;flex-direction:column}
    .invoice-sheet{max-width:none!important;width:210mm!important;min-height:296mm!important;box-shadow:none!important;border-radius:0!important;transform:none!important;font-family:'Poppins',Helvetica Neue,Arial,sans-serif;font-size:13px;color:#26312c;background:#fff;position:relative;page-break-after:always}
    .no-print,.live-badge{display:none!important}
    #out-payment-remarks:empty{display:none!important}
    #out-kids-names:empty{display:none!important}
    #out-multi-customers:empty{display:none!important}
    #out-travelers-list:empty{display:none!important}
    .pro-invoice-spacer{display:none!important}
    .pro-invoice-head{background:#0d3b2e;color:#fff;padding:38px 50px 36px;display:flex;justify-content:space-between;align-items:flex-start;position:relative}
    .pro-invoice-head .logo-plate{background:#fff;border-radius:10px;padding:8px 12px;display:flex;align-items:center;height:68px}
    .pro-invoice-head .logo-plate img{height:54px}
    .pro-invoice-head .right-side{text-align:right}
    .pro-invoice-head .gold-label{font-size:10px;letter-spacing:3px;color:#d3a038;text-transform:uppercase;margin-bottom:4px}
    .pro-invoice-head .invoice-number{font-size:26px;font-weight:700;color:#fff;line-height:1.1}
    .pro-invoice-head .status-badge{display:inline-block;margin-top:8px;padding:3px 12px;border-radius:20px;border:1.5px solid #d3a038;background:rgba(211,160,56,0.12);color:#d3a038;font-size:11px;font-weight:600;letter-spacing:.04em;text-transform:uppercase}
    .pro-invoice-head::after{content:'';position:absolute;left:50px;right:50px;bottom:0;height:6px;background:linear-gradient(to right,#d3a038 40%,#7a1f1f 40%)}
    .pro-invoice-meta{display:flex;gap:30px;padding:30px 50px 0}
    .pro-invoice-meta .col{flex:1;min-width:0}
    .pro-invoice-meta .col.right{flex:0 0 auto;text-align:right}
    .pro-invoice-meta .col h4{font-size:10px;letter-spacing:2px;color:#d3a038;text-transform:uppercase;margin:0 0 6px;padding-bottom:4px;border-bottom:1px solid #d3a038}
    .pro-invoice-meta .col strong{display:block;font-size:15px;font-weight:600;margin-bottom:3px}
    .pro-invoice-meta .col span{display:block;font-size:12px;color:#888;margin-bottom:1px}
    .pro-invoice-meta .col.right span strong{display:inline;font-weight:600;color:#26312c}
    .pro-invoice-meta .col.right span{display:inline-block;text-align:right;margin-left:18px}
    .pro-invoice-meta .col.right span+span{margin-top:6px}
    .info-strip{display:flex;gap:14px;padding:28px 50px 0}
    .info-strip .panel{flex:1;border:1px solid #ddd;border-radius:10px;padding:16px 18px;background:#fff}
    .info-strip .panel.journey{background:#faf7ee}
    .info-strip .panel h4{font-size:10px;letter-spacing:2px;color:#d3a038;text-transform:uppercase;margin:0 0 12px;padding-bottom:4px;border-bottom:1px solid #d3a038}
    .info-strip .travelers-chips{display:flex;flex-wrap:wrap;gap:8px}
    .info-strip .traveler-chip{display:inline-flex;align-items:center;gap:6px;padding:5px 12px;border-radius:20px;background:#fff;border:1px solid #d8e5e0;font-size:12px;font-weight:600;color:#1a2332}
    .info-strip .traveler-chip .role{font-size:10px;font-weight:400;color:#999;text-transform:uppercase;letter-spacing:.04em}
    .info-strip .journey-facts{display:flex;flex-wrap:wrap;gap:0}
    .info-strip .journey-facts .fact{padding:2px 0}
    .info-strip .journey-facts .fact .lbl{display:inline-block;width:80px;font-size:11px;color:#888}
    .info-strip .journey-facts .fact .val{display:inline-block;font-size:12px;font-weight:500;color:#26312c;margin-right:24px}
    .pro-invoice-table-wrap{padding:28px 50px 0}
    .pro-invoice-table{width:100%;border-collapse:collapse;font-size:13px}
    .pro-invoice-table thead th{background:#0d3b2e;color:#fff;padding:12px 16px;text-align:left;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;border-bottom:2px solid #0d3b2e}
    .pro-invoice-table thead th:last-child,.pro-invoice-table thead th:nth-child(3),.pro-invoice-table thead th:nth-child(4){text-align:right}
    .pro-invoice-table tbody tr:nth-child(odd){background:#fafafa}
    .pro-invoice-table tbody tr:nth-child(even){background:#fff}
    .pro-invoice-table td{padding:14px 16px;border-bottom:1px solid #ececec;vertical-align:top}
    .pro-invoice-table td.desc{font-weight:600;color:#26312c}
    .pro-invoice-table td.subdesc{display:block;font-size:11px;color:#999;font-weight:400;margin-top:2px}
    .pro-invoice-table td:last-child,.pro-invoice-table td:nth-child(3),.pro-invoice-table td:nth-child(4){text-align:right}
    .pro-invoice-table td.amount{font-weight:600;color:#0d3b2e}
    .pro-invoice-bottom{display:flex;gap:24px;padding:26px 50px 0}
    .pro-invoice-bottom .left{flex:1;min-width:0}
    .pro-invoice-bottom .left .pi-block{margin-bottom:14px}
    .pro-invoice-bottom .left .pi-block .lbl{font-size:10px;letter-spacing:2px;color:#d3a038;text-transform:uppercase;margin-bottom:4px}
    .pro-invoice-bottom .left .pi-block p{margin:0;font-size:12px;color:#555;line-height:1.5}
    .pro-invoice-bottom .right{flex:0 0 340px;border:1px solid #ddd;border-radius:8px;padding:16px 18px;background:#fff}
    .pro-invoice-bottom .right .total-row{display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #eee}
    .pro-invoice-bottom .right .total-row:last-child{border-bottom:none}
    .pro-invoice-bottom .right .total-row .lbl{font-size:12px;color:#555}
    .pro-invoice-bottom .right .total-row .val{font-size:13px;font-weight:600}
    .pro-invoice-bottom .right .total-row.grand .lbl{color:#0d3b2e;font-weight:700;font-size:14px}
    .pro-invoice-bottom .right .total-row.grand .val{color:#0d3b2e;font-weight:700;font-size:16px}
    .pro-invoice-bottom .right .total-row.paid .lbl{color:#16a34a;font-weight:600}
    .pro-invoice-bottom .right .total-row.paid .val{color:#16a34a;font-weight:700;font-size:14px}
    .pro-invoice-bottom .right .total-row.pending .lbl{color:#a02c22;font-weight:600}
    .pro-invoice-bottom .right .total-row.pending .val{color:#a02c22;font-weight:700;font-size:14px}
    .alert-bar{margin:16px 50px 0;padding:10px 14px;background:#fee8e8;border:1px solid #a02c22;border-left:4px solid #a02c22;border-radius:4px;display:flex;align-items:center;gap:10px;font-size:12px;color:#a02c22}
    .alert-bar .alert-icon{font-size:16px;font-weight:700}
    .alert-bar .alert-text strong{font-weight:700}
    .signature-row{display:flex;justify-content:space-between;align-items:flex-end;padding:28px 50px 0;gap:20px}
    .signature-row .sig-block{flex:1;min-width:0}
    .signature-row .sig-line{border-bottom:1.5px solid #26312c;height:40px}
    .signature-row .sig-label{font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.05em;margin-top:4px}
    .signature-row .sig-seal{width:72px;height:72px;border:2px dashed #d3a038;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;color:#d3a038;text-align:center;transform:rotate(-6deg);font-weight:600;letter-spacing:.04em;text-transform:uppercase;line-height:1.3;flex-shrink:0}
    .pro-invoice-footer{border-top:1px solid #ddd;padding:14px 50px;display:flex;justify-content:space-between;font-size:11px;color:#888;background:#fff}
    .pro-invoice-footer .conditions ol{margin:0;padding:0 0 0 16px;display:inline}
    .pro-invoice-footer .conditions li{margin-bottom:2px}
    .pro-invoice-footer .contact{text-align:right;line-height:1.6}
    .pro-invoice-footer .thank-you{font-size:13px;font-weight:700;color:#0d3b2e;display:block;margin-top:2px}
    </style>

  </head><body>

    ${sheet.outerHTML}

    <script>window.onload=function(){setTimeout(function(){window.document.title='${num} \u00b7 Bahadur Tours';window.print();setTimeout(function(){window.close();},2000);},400);};<\/script>

  </body></html>`);

  pw.document.close();

};



$('#invoice-save').onclick=async()=>{

  const t=getToken();

  if(!t)return;

  $('#invoice-state').textContent='Saving\u2026';

  try{

    let r,d;

    if(currentInvoiceId){

      r=await fetch('/api/admin',{

        method:'PUT',

        headers:{'Content-Type':'application/json',Authorization:'Bearer '+t},

        body:JSON.stringify({type:'invoice',id:currentInvoiceId,...payload()})

      });

    }else{

      r=await fetch('/api/admin',{

        method:'POST',

        headers:{'Content-Type':'application/json',Authorization:'Bearer '+t},

        body:JSON.stringify({type:'invoice',...payload()})

      });

    }

    d=await r.json();

    if(!r.ok)throw new Error(d.error);

    if(!currentInvoiceId&&d.invoice?.id){

      currentInvoiceId=d.invoice.id;

      $('#invoice-db-id').value=currentInvoiceId;

      $('#invoice-mark-paid').style.display='';

    }

    const status=value('#payment-status','Draft');

    if(status==='Paid'){

      $('#invoice-view-bill').style.display='';

      $('#invoice-mark-paid').style.display='none';

    }

    $('#invoice-state').textContent=`Saved \u00b7 ${new Date().toLocaleString('en-IN')}`;

  }catch(e){$('#invoice-state').textContent=`Not saved: ${e.message}`}

};



$('#invoice-mark-paid').onclick=async()=>{

  if(!currentInvoiceId){alert('Save the invoice first before marking as paid.');return;}

  if(!confirm('Mark this invoice as Paid?'))return;

  const t=getToken();

  if(!t)return;

  $('#invoice-state').textContent='Updating\u2026';

  try{

    const r=await fetch('/api/admin',{

      method:'PATCH',

      headers:{'Content-Type':'application/json',Authorization:'Bearer '+t},

      body:JSON.stringify({type:'invoice',id:currentInvoiceId,status:'Paid'})

    });

    const d=await r.json();

    if(!r.ok)throw new Error(d.error);

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

  const t=getToken();

  if(!t)return;

  $('#invoice-state').textContent='Loading\u2026';

  try{

    const r=await fetch(`/api/admin?id=${encodeURIComponent(id)}`,{headers:{Authorization:'Bearer '+t}});

    const d=await r.json();

    if(!r.ok)throw new Error(d.error||'Not found');

    currentInvoiceId=d.invoice.id;

    $('#invoice-db-id').value=currentInvoiceId;

    populateForm(d.invoice);

    $('#invoice-state').textContent='Invoice loaded.';

  }catch(e){$('#invoice-state').textContent=`Load failed: ${e.message}`}

};



renderLineInputs();

loadPackages();

loadCustomers();

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

    const r=await fetch(`/api/admin?id=${encodeURIComponent(id)}`,{headers:{Authorization:'Bearer '+t}});

    const d=await r.json();

    if(!r.ok)throw new Error(d.error||'Not found');

    currentInvoiceId=d.invoice.id;

    $('#invoice-db-id').value=currentInvoiceId;

    populateForm(d.invoice);

    $('#invoice-state').textContent='Invoice loaded.';

  }catch(e){$('#invoice-state').textContent=`Auto-load failed: ${e.message}`}

})();

