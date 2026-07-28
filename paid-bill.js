const $=s=>document.querySelector(s);
const money=n=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',minimumFractionDigits:2}).format(Number(n||0));
const fmt=d=>{if(!d)return '—';try{return new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'long',year:'numeric'})}catch{return d}};
const fmtDT=d=>{if(!d)return '—';try{return new Date(d.replace('T',' ')).toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}catch{return d}};
const esc=s=>String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

let invoiceId=null;

function getToken(){
  const t=localStorage.getItem('bahadur-admin-token');
  if(!t){window.location.href='admin.html?return=paid-bill';return null;}
  return t;
}

function dl(rows){return rows.filter(x=>x[1]).map(x=>`<dt>${esc(x[0])}</dt><dd>${x[1]}</dd>`).join('')}

function renderReceipt(inv){
  const td=inv.travel_details||{};
  const flight=td.flight||{};
  const hotel=td.hotel||{};
  const items=inv.items||[];
  const subtotal=Number(inv.subtotal||0),discount=Number(inv.discount||0),tax=Number(inv.tax||0),total=Number(inv.total||0);
  const isIntl=td.package_type==='international';

  const flightCard=isIntl&&flight.included?`
    <div class="receipt-travel-card">
      <small><i class="hgi-stroke hgi-airplane-01"></i> Flight</small>
      <strong>${esc([flight.airline,flight.number].filter(Boolean).join(' · ')||'Flight booking')}</strong>
      <dl>
        ${dl([
          ['Route',[flight.from,flight.to].filter(Boolean).join(' → ')],
          ['Departure',fmtDT(flight.departure)],
          ['Arrival',fmtDT(flight.arrival)],
          ['Cabin',flight.cabin],
          ['PNR / Ticket',flight.pnr],
          ['Baggage',flight.baggage]
        ])}
      </dl>
    </div>`:'';

  const hotelCard=hotel.included?`
    <div class="receipt-travel-card">
      <small><i class="hgi-stroke hgi-building-05"></i> Accommodation</small>
      <strong>${esc(hotel.name||'Hotel booking')}</strong>
      <dl>
        ${dl([
          ['City',hotel.city],
          ['Check-in',fmt(hotel.checkin)],
          ['Check-out',fmt(hotel.checkout)],
          ['Room',hotel.rooms&&hotel.room_type?`${hotel.rooms} × ${hotel.room_type}`:(hotel.room_type||hotel.rooms)],
          ['Category',hotel.category],
          ['Meals',hotel.meals],
          ['Confirmation',hotel.confirmation]
        ])}
      </dl>
    </div>`:'';

  const travelCards=(flightCard||hotelCard)?`<div class="receipt-travel-cards">${flightCard}${hotelCard}</div>`:'';

  const itemRows=items.map(x=>`
    <tr>
      <td>${esc(x.description||'Travel service')}</td>
      <td>${x.qty||1}</td>
      <td>${money(x.rate)}</td>
      <td>${money((x.qty||1)*x.rate)}</td>
    </tr>`).join('');

  const paymentNote=inv.payment_details?`
    <div class="receipt-payment-note">
      <small>Payment received</small>
      <p>${esc(inv.payment_details)}</p>
    </div>`:'';

  const noteSection=inv.notes?`
    <div style="margin-bottom:24px;padding:14px 18px;background:#fafcfb;border-radius:10px;border:1px solid #dde9e4">
      <small style="font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#7a8b84;display:block;margin-bottom:6px">Note</small>
      <p style="margin:0;font-size:13px;color:#17251f;white-space:pre-line">${esc(inv.notes)}</p>
    </div>`:'';

  $('#receipt-card').innerHTML=`
    <div class="receipt-head">
      <div class="receipt-head-left">
        <img src="assets/bahadur-logo.png" alt="Bahadur Tours">
        <span>Tours &amp; Travels</span>
      </div>
      <div class="receipt-head-right">
        <small>Payment Receipt</small>
        <strong>${esc(inv.invoice_number||'—')}</strong>
        <span class="paid-stamp"><i class="hgi-stroke hgi-checkmark-circle-02"></i> Paid</span>
      </div>
    </div>

    <div class="receipt-body">
      <!-- Customer Details -->
      <div class="receipt-customer">
        <div class="receipt-customer-col">
          <div class="receipt-label">Bill To</div>
          <strong>${esc(inv.customer_name||'—')}</strong>
          ${inv.customer_address?`<span>${esc(inv.customer_address)}</span>`:''}
          ${inv.phone?`<a href="tel:${esc(inv.phone)}"><i class="hgi-stroke hgi-call" style="font-size:12px"></i> ${esc(inv.phone)}</a>`:''}
          ${inv.email?`<a href="mailto:${esc(inv.email)}"><i class="hgi-stroke hgi-mail-01" style="font-size:12px"></i> ${esc(inv.email)}</a>`:''}
        </div>
        <div class="receipt-customer-col">
          <div class="receipt-label">From</div>
          <strong>Bahadur Tours &amp; Travels</strong>
          <span>Mangaluru, Karnataka, India</span>
          <a href="mailto:bahadurtourstravels@gmail.com">bahadurtourstravels@gmail.com</a>
          <a href="tel:+919187440916">+91 91874 40916</a>
        </div>
      </div>

      <!-- Invoice Meta -->
      <div class="receipt-meta-row">
        <div class="receipt-meta-box">
          <small>Invoice Date</small>
          <strong>${fmt(inv.invoice_date)}</strong>
        </div>
        <div class="receipt-meta-box">
          <small>Due Date</small>
          <strong>${fmt(inv.due_date)}</strong>
        </div>
        <div class="receipt-meta-box">
          <small>Booking Ref.</small>
          <strong>${esc(inv.booking_ref||'—')}</strong>
        </div>
        <div class="receipt-meta-box">
          <small>Status</small>
          <strong style="color:#22753a">${esc(inv.status||'Paid')}</strong>
        </div>
      </div>

      <!-- Journey Summary -->
      ${td.package_name?`
      <div class="receipt-journey">
        <div class="receipt-journey-col">
          <small>Journey</small>
          <strong>${esc(td.package_name)}</strong>
          ${td.destination?`<span>${esc(td.destination)}</span>`:''}
        </div>
        <div class="receipt-journey-col">
          <small>Travel Date</small>
          <strong>${fmt(td.travel_date)}</strong>
        </div>
        <div class="receipt-journey-col">
          <small>Travellers</small>
          <strong>${td.travellers||'—'}</strong>
        </div>
        <div class="receipt-journey-col">
          <small>Type</small>
          <strong>${isIntl?'International':'Domestic'}</strong>
        </div>
      </div>`:''}

      <!-- Flight & Hotel Cards -->
      ${travelCards}

      <!-- Line Items Table -->
      <table class="receipt-table">
        <thead>
          <tr>
            <th>Description</th>
            <th>Qty</th>
            <th>Unit Price</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows||'<tr><td colspan="4" style="color:#7a8b84;text-align:center;padding:20px">No items</td></tr>'}
        </tbody>
      </table>

      <!-- Totals -->
      <div class="receipt-totals">
        <div class="receipt-totals-inner">
          <dl>
            <dt>Subtotal</dt><dd>${money(subtotal)}</dd>
            <dt>Discount</dt><dd>− ${money(discount)}</dd>
            <dt>${esc(inv.tax_label||'GST')} (${inv.tax_rate||0}%)</dt><dd>${money(tax)}</dd>
            <dt class="grand-total">Total Paid</dt><dd class="grand-total">${money(total)}</dd>
          </dl>
        </div>
      </div>

      <!-- Payment note -->
      ${paymentNote}
      ${noteSection}

      <!-- Terms -->
      <div class="receipt-terms">
        <strong>Booking Conditions</strong>
        <span>1. Services are confirmed only as stated in the final itinerary.</span>
        <span>2. Airline, hotel and cancellation rules apply to their respective services.</span>
        <span>3. Quote the invoice and booking references with every payment.</span>
      </div>
    </div>

    <div class="receipt-footer">
      <span>bahadurtourstravels@gmail.com · +91 91874 40916</span>
      <strong>Thank you for travelling with Bahadur.</strong>
    </div>
  `;

  // Toolbar buttons
  $('#btn-edit-invoice').onclick=()=>{window.location.href=`billing.html?id=${invoiceId}`;};
  $('#btn-print').onclick=()=>{document.title=`Receipt · ${inv.invoice_number}`;window.print();};
  document.title=`Receipt · ${inv.invoice_number||'Bahadur Tours'}`;
}

async function load(){
  const params=new URLSearchParams(location.search);
  invoiceId=params.get('id');
  if(!invoiceId){
    $('#receipt-card').innerHTML='<div class="receipt-loading"><i class="hgi-stroke hgi-alert-02"></i><p>No invoice ID provided. Open this page from an invoice in the dashboard.</p></div>';
    return;
  }
  const t=getToken();
  if(!t){
    $('#receipt-card').innerHTML='<div class="receipt-loading"><i class="hgi-stroke hgi-lock-01"></i><p>Authentication required.</p></div>';
    return;
  }
  try{
    const r=await fetch(`/api/admin?id=${encodeURIComponent(invoiceId)}`,{headers:{Authorization:`Bearer ${t}`}});
    const d=await r.json();
    if(!r.ok)throw new Error(d.error||'Invoice not found');
    renderReceipt(d.invoice);
  }catch(e){
    $('#receipt-card').innerHTML=`<div class="receipt-loading"><i class="hgi-stroke hgi-alert-02"></i><p>Failed to load: ${e.message}</p></div>`;
  }
}

load();
