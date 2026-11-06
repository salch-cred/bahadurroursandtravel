// Renders invoices, quotations and receipts to HTML, and saves them as real PDF files.
import { esc, money, niceDate, statusOf, isoDay } from './admin-ui.js';

const LOGO = 'assets/brand/bahadur-logo.png';

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
const below100 = (n) => (n < 20 ? ONES[n] : TENS[Math.floor(n / 10)] + (n % 10 ? '-' + ONES[n % 10] : ''));
const below1000 = (n) => (n >= 100 ? ONES[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + below100(n % 100) : '') : below100(n));

// Indian numbering: crore, lakh, thousand
export function amountInWords(value) {
  const total = Math.round(Math.abs(Number(value || 0)) * 100);
  let rupees = Math.floor(total / 100);
  const paise = total % 100;
  if (!rupees && !paise) return 'Rupees Zero Only';
  const parts = [];
  const crore = Math.floor(rupees / 10000000); rupees %= 10000000;
  const lakh = Math.floor(rupees / 100000); rupees %= 100000;
  const thousand = Math.floor(rupees / 1000); rupees %= 1000;
  if (crore) parts.push(below1000(crore) + ' Crore');
  if (lakh) parts.push(below100(lakh) + ' Lakh');
  if (thousand) parts.push(below100(thousand) + ' Thousand');
  if (rupees) parts.push(below1000(rupees));
  const words = parts.join(' ');
  return `${words ? 'Rupees ' + words : ''}${words && paise ? ' and ' : ''}${paise ? below100(paise) + ' Paise' : ''} Only`.trim();
}

export function computeTotals(doc) {
  const round = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
  const lines = (doc.items || []).map((l) => ({ ...l, qty: Number(l.qty || 0), rate: Number(l.rate || 0), amount: round(Number(l.qty || 0) * Number(l.rate || 0)) }));
  const subtotal = round(lines.reduce((s, l) => s + l.amount, 0));
  const discount = Math.min(round(Math.max(0, Number(doc.discount || 0))), subtotal);
  const taxable = round(subtotal - discount);
  const rate = doc.tax_mode === 'none' ? 0 : Number(doc.tax_rate || 0);
  const tax = round(taxable * rate / 100);
  const percent = Number(doc.travel_details?.discount_percent) || 0;
  return { lines, subtotal, discount, percent, taxable, rate, tax, total: round(taxable + tax) };
}

function upiQr(settings, amount, ref) {
  if (!settings.upi_id || !window.qrcode || !(amount > 0)) return '';
  const uri = `upi://pay?pa=${encodeURIComponent(settings.upi_id)}&pn=${encodeURIComponent(settings.company_name)}&am=${amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(ref || 'Invoice')}`;
  const qr = window.qrcode(0, 'M');
  qr.addData(uri);
  qr.make();
  return `<div class="inv-qr"><img src="${qr.createDataURL(5, 0)}" alt="UPI QR code">Scan to pay by UPI</div>`;
}

const companyBlock = (s) => `<div class="inv-brand"><img src="${LOGO}" width="128" height="86" alt="${esc(s.company_name)}"><div class="inv-co"><strong>${esc(s.company_name)}</strong>${esc(s.address_line1)}<br>${esc(s.address_line2)}<br>${esc(s.phone)}<br>${esc(s.email)}${s.gstin ? `<br>GSTIN: ${esc(s.gstin)}` : ''}${s.pan ? ` · PAN: ${esc(s.pan)}` : ''}</div></div>`;

const PLANE_ICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%230284c7' transform='rotate(90 12 12)' d='M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.500L13 19v-5.500l8 2.500Z'/%3E%3C/svg%3E";
const WAVE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 794 38' preserveAspectRatio='none'%3E%3Cpath fill='%237dd3fc' fill-opacity='.45' d='M0 26C130 2 260 2 400 18S660 36 794 10V38H0Z'/%3E%3Cpath fill='%230284c7' d='M0 32C150 12 290 14 420 26S670 38 794 22V38H0Z'/%3E%3C/svg%3E";
const routeLine = `<div class="inv-route" aria-hidden="true"><span>Lakshadweep</span><i></i><img src="${PLANE_ICON}" alt=""><i></i><span>Umrah</span><i></i><img src="${PLANE_ICON}" alt=""><i></i><span>The world</span></div>`;
const watermark = '<img class="inv-wm" src="assets/brand/bahadur-mark.png" alt="">';
const footer = (s) => `<img class="inv-wave" src="${WAVE}" alt=""><svg class="inv-wave-solid" viewBox="0 0 794 30" preserveAspectRatio="none" aria-hidden="true"><path fill="#0369a1" d="M0 16C180 2 300 2 460 14S700 26 794 6V30H0Z"/></svg><footer class="inv-foot"><strong>Thank you for travelling with Bahadur.</strong><span>${esc(s.website)} · ${esc(s.phone)} · ${esc(s.email)}</span></footer>`;

const dateTime = (v) => {
  if (!v) return '';
  const d = new Date(v);
  return Number.isNaN(+d) ? String(v) : d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
};

function kv(rows) {
  return `<dl class="inv-kv">${rows.filter((r) => r[1]).map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>`;
}

export function renderInvoice(doc, settings, payments = []) {
  const t = computeTotals(doc);
  const td = doc.travel_details || {};
  const isQuote = doc.doc_type === 'quotation';
  const status = statusOf({ ...doc, total: t.total });
  const paid = payments.length ? payments.reduce((s, p) => s + Number(p.amount), 0) : Number(doc.paid_amount || doc.advance_preview || 0);
  const balance = Math.max(0, t.total - paid);
  const title = isQuote ? 'Quotation' : settings.gstin && doc.tax_mode !== 'none' ? 'Tax invoice' : 'Invoice';
  const dateLabel = isQuote ? 'Valid until' : 'Due date';
  const pax = (td.passenger_names || []).filter((p) => p.name);
  const half = Math.ceil(pax.length / 2);
  const paxRows = (rows, start) => `<table class="inv-pax">${rows.map((p, i) => `<tr><td>${start + i + 1}.</td><td>${esc(p.name)}</td><td>${p.type === 'kid' ? 'Child' : 'Adult'}${Number(p.age) > 0 ? ' · ' + esc(p.age) + ' yrs' : ''}${p.passport ? ' · ' + esc(p.passport) : ''}</td></tr>`).join('')}</table>`;
  const flight = td.flight || {}, hotel = td.hotel || {};
  // The two halves must always add back to the tax on the total line
  const cgst = Math.round((t.tax / 2) * 100) / 100;
  const taxRows = doc.tax_mode === 'cgst_sgst'
    ? `<div><span>CGST @ ${t.rate / 2}%</span><b>${money(cgst)}</b></div><div><span>SGST @ ${t.rate / 2}%</span><b>${money(t.tax - cgst)}</b></div>`
    : doc.tax_mode === 'igst' ? `<div><span>IGST @ ${t.rate}%</span><b>${money(t.tax)}</b></div>` : '';
  const terms = String(settings.terms || '').split('\n').map((x) => x.trim()).filter(Boolean);
  const paymentBlock = !isQuote && (settings.bank_account || settings.upi_id || doc.payment_details)
    ? `<div class="inv-box line"><h4>Pay to</h4><div class="inv-pay"><div class="kv">${settings.bank_account ? `<div><span>Bank</span><b>${esc(settings.bank_name)}</b></div><div><span>Account</span><b>${esc(settings.bank_account)}</b></div><div><span>Name</span><b>${esc(settings.bank_account_name || settings.company_name)}</b></div><div><span>IFSC</span><b>${esc(settings.bank_ifsc)}</b></div>` : ''}${settings.upi_id ? `<div><span>UPI</span><b>${esc(settings.upi_id)}</b></div>` : ''}${doc.payment_details ? `<p class="inv-notes" style="margin-top:3px">${esc(doc.payment_details)}</p>` : ''}</div>${balance > 0 ? upiQr(settings, balance, doc.invoice_number) : ''}</div></div>` : '';
  return `<article class="inv">
    <div class="inv-top"></div>
    ${status === 'Paid' ? '<div class="inv-stamp">PAID</div>' : status === 'Cancelled' ? '<div class="inv-stamp void">CANCELLED</div>' : ''}
    <header class="inv-head brk">${companyBlock(settings)}<div class="inv-title"><span>${title}</span><strong>${esc(doc.invoice_number || 'Auto-numbered on save')}</strong><em class="${status === 'Paid' ? 'paid' : status === 'Overdue' ? 'due' : ''}">${esc(status)}</em></div></header>
    ${routeLine}${watermark}
    <div class="inv-body">
      <section class="inv-grid3 brk">
        <div class="inv-box"><h4>Billed to</h4><strong class="big">${esc(doc.customer_name || 'Customer name')}</strong><p>${esc(doc.customer_address || '')}</p>${doc.phone ? `<p>${esc(doc.phone)}</p>` : ''}${doc.email ? `<p>${esc(doc.email)}</p>` : ''}${doc.customer_gstin ? `<p>GSTIN: ${esc(doc.customer_gstin)}</p>` : ''}</div>
        <div class="inv-box"><h4>Journey</h4><strong class="big">${esc(td.package_name || 'Travel package')}</strong>${kv([['Destination', td.destination], ['Travel', [niceDate(td.travel_date), td.return_date ? niceDate(td.return_date) : ''].map((x) => String(x).replace(/ /g, ' ')).filter((x) => x && x !== '—').join(' → ')], ['Travellers', pax.length ? [[pax.filter((p) => p.type !== 'kid').length, 'adult'], [pax.filter((p) => p.type === 'kid').length, 'child']].filter(([n]) => n).map(([n, w]) => `${n} ${w}`).join(', ') : '']])}</div>
        <div class="inv-box"><h4>Details</h4>${kv([[isQuote ? 'Quote date' : 'Invoice date', niceDate(doc.invoice_date)], [dateLabel, doc.due_date ? niceDate(doc.due_date) : ''], ['Booking ref', doc.booking_ref], ['Supply', doc.place_of_supply]])}</div>
      </section>
      ${pax.length ? `<section class="inv-box line brk"><h4>Travellers (${pax.length})</h4><div class="inv-paxcols">${paxRows(pax.slice(0, half), 0)}${paxRows(pax.slice(half), half)}</div></section>` : ''}
      ${flight.included || hotel.included ? `<section class="inv-grid2 brk" ${flight.included && hotel.included ? '' : 'style="grid-template-columns:1fr"'}>
        ${flight.included ? `<div class="inv-box line"><h4>Flight</h4>${kv([['Airline', [flight.airline, flight.number].filter(Boolean).join(' ')], ['Route', [flight.from, flight.to].filter(Boolean).join(' → ')], ['Departure', dateTime(flight.departure)], ['Arrival', dateTime(flight.arrival)], ['PNR · Cabin', [flight.pnr, flight.cabin].filter(Boolean).join(' · ')], ['Baggage', flight.baggage]])}</div>` : ''}
        ${hotel.included ? `<div class="inv-box line"><h4>Stay</h4>${kv([['Hotel', [hotel.name, hotel.city].filter(Boolean).join(', ')], ['Dates', [hotel.checkin ? niceDate(hotel.checkin) : '', hotel.checkout ? niceDate(hotel.checkout) : ''].filter(Boolean).join(' → ')], ['Room', [hotel.room_type ? `${hotel.rooms || 1} × ${hotel.room_type}` : '', hotel.category].filter(Boolean).join(' · ')], ['Meals', hotel.meals], ['Confirmation', hotel.confirmation]])}</div>` : ''}
      </section>` : ''}
      <table class="inv-table"><thead class="brk"><tr><th style="width:26px">#</th><th>Description</th><th style="width:64px">SAC</th><th class="c" style="width:44px">Qty</th><th class="r" style="width:102px">Rate</th><th class="r" style="width:112px">Amount</th></tr></thead>
        <tbody>${t.lines.length ? t.lines.map((l, i) => `<tr class="brk"><td>${i + 1}</td><td class="d">${esc(l.description || 'Travel service')}</td><td>${esc(l.sac || '')}</td><td class="c">${l.qty}</td><td class="r">${money(l.rate)}</td><td class="r">${money(l.amount)}</td></tr>`).join('') : '<tr><td colspan="6" style="text-align:center;color:#8aa">Add charges to fill this table</td></tr>'}</tbody></table>
      <section class="inv-low brk">
        <div class="inv-left">
          <div class="inv-words"><b>Amount in words</b>${esc(amountInWords(t.total))}</div>
          ${paymentBlock}
          ${doc.notes ? `<p class="inv-notes"><b>Note:</b> ${esc(doc.notes)}</p>` : ''}
          ${doc.payment_remarks ? `<p class="inv-notes"><b>Remarks:</b> ${esc(doc.payment_remarks)}</p>` : ''}
        </div>
        <div class="inv-totals">
          <div><span>Subtotal</span><b>${money(t.subtotal)}</b></div>
          ${t.discount ? `<div><span>Discount${t.percent ? ` (${t.percent}%)` : ''}</span><b>− ${money(t.discount)}</b></div><div><span>Taxable value</span><b>${money(t.taxable)}</b></div>` : ''}
          ${taxRows}
          <div class="grand"><span>${isQuote ? 'Quoted total' : 'Invoice total'}</span><b>${money(t.total)}</b></div>
          ${isQuote ? '' : `<div class="paid"><span>Paid</span><b>${money(paid)}</b></div><div class="bal ${balance <= 0 && t.total > 0 ? 'settled' : ''}"><span>${balance <= 0 && t.total > 0 ? 'Fully paid' : 'Balance due'}</span><b>${money(balance)}</b></div>`}
        </div>
      </section>
      ${payments.length ? `<section class="inv-box line brk"><h4>Payments received</h4><table class="inv-ledger"><thead><tr><th>Date</th><th>Receipt</th><th>Mode</th><th>Reference</th><th class="r">Amount</th></tr></thead><tbody>${payments.map((p) => `<tr><td>${niceDate(p.paid_on)}</td><td>${esc(p.receipt_no)}</td><td>${esc(p.mode)}</td><td>${esc(p.reference || '—')}</td><td class="r">${money(p.amount)}</td></tr>`).join('')}</tbody></table></section>` : ''}
      <section class="inv-sign brk">
        <div class="terms"><h4>Booking conditions</h4><ol>${terms.map((x) => `<li>${esc(x)}</li>`).join('')}</ol></div>
        <div class="inv-seal">Company<br>seal</div>
        <div class="s"><div class="gap"></div><strong>For ${esc(settings.company_name)}</strong>${esc(settings.signatory)}</div>
      </section>
    </div>
    ${footer(settings)}
  </article>`;
}

export function renderReceipt(payment, invoice, settings) {
  const refund = payment.kind === 'refund' || Number(payment.amount) < 0;
  const amount = Math.abs(Number(payment.amount));
  const td = invoice.travel_details || {};
  return `<article class="inv inv-receipt">
    <div class="inv-top"></div>
    <header class="inv-head">${companyBlock(settings)}<div class="inv-title"><span>${refund ? 'Refund voucher' : 'Payment receipt'}</span><strong>${esc(payment.receipt_no)}</strong><em class="paid">${niceDate(payment.paid_on)}</em></div></header>
    ${routeLine}${watermark}
    <div class="inv-body">
      <div class="inv-rcpt-amt"><div><span>${refund ? 'Refunded to' : 'Received from'}</span><strong style="font-size:18px">${esc(invoice.customer_name)}</strong></div><div style="text-align:right"><span>${refund ? 'Amount refunded' : 'Amount received'}</span><strong>${money(amount)}</strong></div></div>
      <div class="inv-words"><b>Amount in words</b>${esc(amountInWords(amount))}</div>
      <section class="inv-grid2">
        <div class="inv-box"><h4>Payment</h4>${kv([['Mode', payment.mode], ['Reference', payment.reference], ['Date', niceDate(payment.paid_on)], ['Note', payment.note]])}</div>
        <div class="inv-box"><h4>Against</h4>${kv([['Invoice', invoice.invoice_number], ['Journey', td.package_name], ['Booking ref', invoice.booking_ref], ['Invoice total', money(invoice.total)], ['Total paid', money(invoice.paid_amount)], ['Balance due', money(Math.max(0, Number(invoice.total) - Number(invoice.paid_amount)))]])}</div>
      </section>
      <section class="inv-sign"><div class="terms">This is a computer-generated receipt for ${esc(settings.company_name)}.</div><div class="inv-seal">Company<br>seal</div><div class="s"><div class="gap"></div><strong>For ${esc(settings.company_name)}</strong>${esc(settings.signatory)}</div></section>
    </div>
    ${footer(settings)}
  </article>`;
}

// Sizes a document to its A4 sheet: short ones grow to fill the page, full ones shrink a little to stay on one.
export function fitInvoice(sheet) {
  const inv = sheet?.matches?.('.inv') ? sheet : sheet?.querySelector?.('.inv');
  if (!inv || !inv.offsetWidth) return;
  const PAGE = 1100, LARGEST = 1.22, SMALLEST = 0.86, MOST_GAP = 60;
  const fits = (u) => { inv.style.setProperty('--u', `${u}px`); return inv.scrollHeight <= PAGE; };
  inv.style.minHeight = '0';
  inv.style.setProperty('--xg', '0px');
  let size = LARGEST;
  if (!fits(SMALLEST)) {
    // Too long for one page at any size: normal size, split between rows
    size = 1;
    inv.style.setProperty('--u', '1px');
  } else if (!fits(LARGEST)) {
    let low = SMALLEST, high = LARGEST;
    for (let i = 0; i < 7; i += 1) {
      const mid = (low + high) / 2;
      if (fits(mid)) low = mid; else high = mid;
    }
    size = low;
    inv.style.setProperty('--u', `${size}px`);
  }
  const spare = PAGE - inv.scrollHeight, gaps = inv.querySelector('.inv-body').children.length - 1;
  if (spare > 0 && gaps > 0) inv.style.setProperty('--xg', `${Math.min(spare / gaps, MOST_GAP).toFixed(1)}px`);
  inv.style.minHeight = '';
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement('script');
    s.src = src; s.onload = resolve; s.onerror = () => reject(new Error('Could not load the PDF tools'));
    document.head.append(s);
  });
}

// Captures the sheet at full size and splits pages at row boundaries, so no row is cut in half.
export async function savePdf(sheet, filename) {
  await Promise.all([loadScript('assets/vendor/html2canvas.min.js'), loadScript('assets/vendor/jspdf.umd.min.js')]);
  await document.fonts?.ready;
  const holder = document.createElement('div');
  holder.style.cssText = 'position:fixed;left:-10000px;top:0;width:794px;background:#fff';
  holder.append(sheet.cloneNode(true));
  document.body.append(holder);
  const inv = holder.querySelector('.inv');
  fitInvoice(inv);
  try {
    const top = inv.getBoundingClientRect().top;
    const breaks = [...inv.querySelectorAll('.brk')].flatMap((el) => { const r = el.getBoundingClientRect(); return [r.top - top, r.bottom - top]; });
    const SCALE = 2.4;
    const canvas = await window.html2canvas(inv, { scale: SCALE, backgroundColor: '#ffffff', useCORS: true, logging: false, width: 794, windowWidth: 794 });
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
    const pageCss = 1123, margin = 24, fullHeight = canvas.height / SCALE;
    let y = 0, page = 0;
    while (y < fullHeight - 1) {
      const room = page ? pageCss - margin : pageCss;
      let end = Math.min(y + room, fullHeight);
      if (end < fullHeight) {
        const candidates = breaks.filter((b) => b > y + 80 && b <= end);
        if (candidates.length) end = Math.max(...candidates);
      }
      const slice = document.createElement('canvas');
      slice.width = canvas.width;
      slice.height = Math.round(pageCss * SCALE);
      const ctx = slice.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, slice.width, slice.height);
      ctx.drawImage(canvas, 0, Math.round(y * SCALE), canvas.width, Math.round((end - y) * SCALE), 0, page ? margin * SCALE : 0, canvas.width, Math.round((end - y) * SCALE));
      if (page) pdf.addPage();
      pdf.addImage(slice.toDataURL('image/jpeg', 0.94), 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
      y = end; page += 1;
    }
    pdf.save(filename);
    return page;
  } finally {
    holder.remove();
  }
}

export const pdfName = (doc) => `${String(doc.invoice_number || 'Invoice').replace(/[^\w-]+/g, '-')}-${String(doc.customer_name || 'Bahadur').replace(/[^\w-]+/g, '-')}.pdf`;
export { isoDay };
