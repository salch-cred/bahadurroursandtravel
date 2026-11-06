// Invoice and quotation editor. The form edits one `doc` object; the sheet re-renders from it on every change.
import { boot, api, esc, $, $$, money, toast, confirmBox, dialog, today, addDays, isoDay, niceDate, waNumber, debounce } from './admin-ui.js';
import { renderInvoice, computeTotals, savePdf, pdfName, fitInvoice } from './invoice-render.js';

const blankTravel = () => ({ package_name: '', package_type: 'domestic', destination: '', travel_date: '', return_date: '', passenger_names: [], flight: { included: false, cabin: 'Economy' }, hotel: { included: false, rooms: 1 } });
let settings = {};
let doc = null;
let payments = [];
let customers = [];
let catalogue = [];
let numberEdited = false;
let dirty = false;

const params = new URLSearchParams(location.search);
const actions = `
  <div class="tabs" hidden id="saved-state"></div>
  <button class="btn" id="btn-print"><i class="hgi-stroke hgi-printer"></i>Print</button>
  <button class="btn" id="btn-pdf"><i class="hgi-stroke hgi-download-04"></i>Download PDF</button>
  <button class="btn" id="btn-wa"><i class="hgi-stroke hgi-whatsapp"></i>WhatsApp</button>
  <button class="btn" id="btn-more" aria-label="More actions"><i class="hgi-stroke hgi-more-horizontal"></i></button>
  <button class="btn primary" id="btn-save"><i class="hgi-stroke hgi-tick-02"></i>Save</button>`;

function getPath(obj, path) { return path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj); }
function setPath(obj, path, value) {
  const keys = path.split('.');
  const last = keys.pop();
  const target = keys.reduce((o, k) => (o[k] ??= {}), obj);
  target[last] = value;
}
const fieldPath = (el) => el.name.replace(/^td\./, 'travel_details.');

function newDoc() {
  const date = today();
  return {
    id: null, doc_type: 'invoice', invoice_number: '', invoice_date: date, due_date: addDays(date, settings.due_days ?? 7),
    status: 'Draft', booking_ref: '', customer_name: '', phone: '', email: '', customer_address: '', customer_gstin: '', place_of_supply: settings.state || '',
    items: [{ description: '', sac: settings.default_sac, qty: 1, rate: 0 }],
    discount: 0, tax_mode: settings.default_tax_mode || 'none', tax_rate: settings.default_tax_rate || 5,
    notes: settings.default_note || '', payment_details: '', payment_remarks: '', travel_details: blankTravel(),
  };
}

// Older invoices stored different shapes: rate as unit_price, kids priced outside the lines, flat GST.
function fromServer(inv) {
  const td = { ...blankTravel(), ...(inv.travel_details || {}) };
  td.flight = { ...blankTravel().flight, ...(td.flight || {}) };
  td.hotel = { ...blankTravel().hotel, ...(td.hotel || {}) };
  td.passenger_names = (td.passenger_names || []).map((p) => (typeof p === 'string' ? { name: p, type: 'adult' } : p));
  const items = (inv.items || []).map((l) => ({ description: l.description || '', sac: l.sac || '', qty: Number(l.qty ?? 1), rate: Number(l.rate ?? l.unit_price ?? 0) }));
  const kidsCost = Number(td.kids || 0) * Number(td.kids_price || 0);
  if (kidsCost > 0 && !items.some((l) => /kid|child/i.test(l.description))) items.push({ description: 'Package cost – child', sac: '', qty: Number(td.kids), rate: Number(td.kids_price) });
  const taxMode = inv.tax_mode && inv.tax_mode !== 'none' ? inv.tax_mode : Number(inv.tax_rate) > 0 ? 'cgst_sgst' : 'none';
  return {
    ...inv, items: items.length ? items : [{ description: '', sac: settings.default_sac, qty: 1, rate: 0 }], tax_mode: taxMode, tax_rate: Number(inv.tax_rate) || settings.default_tax_rate || 5,
    invoice_date: isoDay(inv.invoice_date), due_date: isoDay(inv.due_date), discount: Number(inv.discount || 0), travel_details: td,
  };
}

function fillForm() {
  $$('#bill-form [name]').forEach((el) => {
    const v = getPath(doc, fieldPath(el));
    if (el.type === 'checkbox') el.checked = Boolean(v);
    else el.value = v ?? '';
  });
  const statusEl = $('[name=status]');
  statusEl.innerHTML = (doc.doc_type === 'quotation' ? ['Draft', 'Sent', 'Accepted', 'Cancelled'] : ['Draft', 'Sent', 'Cancelled', ...(['Paid', 'Part paid'].includes(doc.status) ? [doc.status] : [])]).map((s) => `<option>${s}</option>`).join('');
  statusEl.value = doc.status;
  statusEl.disabled = ['Paid', 'Part paid'].includes(doc.status);
  $$('#doc-type button').forEach((b) => b.classList.toggle('active', b.dataset.type === doc.doc_type));
  $('#doc-type').style.pointerEvents = doc.id ? 'none' : '';
  $('#doc-type').style.opacity = doc.id ? '.6' : '';
  $('#due-label').textContent = doc.doc_type === 'quotation' ? 'Valid until' : 'Due date';
  renderPax();
  renderLines();
  renderLedger();
  syncVisibility();
}

function syncVisibility() {
  $('#flight-fields').hidden = !doc.travel_details.flight.included;
  $('#hotel-fields').hidden = !doc.travel_details.hotel.included;
  $('#tax-rate-field').hidden = doc.tax_mode === 'none';
  $('#payment-sec').hidden = false;
  const isQuote = doc.doc_type === 'quotation';
  $('#advance-box').hidden = Boolean(doc.id) || isQuote;
  $('#ledger-box').hidden = !doc.id || isQuote;
}

function renderPax() {
  $('#pax-rows').innerHTML = doc.travel_details.passenger_names.map((p, i) => `<div class="row-line row-pax" data-i="${i}">
    <input data-k="name" value="${esc(p.name)}" placeholder="Full name" aria-label="Traveller name">
    <select data-k="type" aria-label="Traveller type"><option value="adult"${p.type !== 'kid' ? ' selected' : ''}>Adult</option><option value="kid"${p.type === 'kid' ? ' selected' : ''}>Child</option></select>
    <input data-k="age" type="number" min="0" max="120" value="${esc(p.age ?? '')}" aria-label="Age">
    <input data-k="passport" class="pp" value="${esc(p.passport ?? '')}" aria-label="Passport or ID">
    <button type="button" class="rm" data-rm aria-label="Remove traveller"><i class="hgi-stroke hgi-cancel-01"></i></button></div>`).join('');
}

function renderLines() {
  $('#line-rows').innerHTML = doc.items.map((l, i) => `<div class="row-line row-charge" data-i="${i}">
    <input data-k="description" value="${esc(l.description)}" placeholder="Package, flight, hotel or service" aria-label="Description">
    <input data-k="sac" class="sac" value="${esc(l.sac ?? '')}" aria-label="SAC code">
    <input data-k="qty" type="number" min="0" step="any" value="${esc(l.qty)}" aria-label="Quantity">
    <input data-k="rate" type="number" min="0" step="0.01" value="${esc(l.rate)}" aria-label="Rate">
    <button type="button" class="rm" data-rm aria-label="Remove charge"><i class="hgi-stroke hgi-cancel-01"></i></button></div>`).join('');
}

function renderLedger() {
  const rows = payments.map((p) => `<tr><td>${niceDate(p.paid_on)}<br><small style="color:var(--faint)">${esc(p.receipt_no)} · ${esc(p.mode)}</small></td><td>${money(p.amount)}<br><a href="paid-bill.html?receipt=${p.id}" target="_blank" style="color:var(--sky-700);font-size:12px">Receipt</a> · <a href="#" data-del-pay="${p.id}" style="color:var(--red);font-size:12px">Remove</a></td></tr>`);
  $('#ledger').innerHTML = rows.join('') || '<tr><td colspan="2" style="color:var(--muted)">No payments recorded yet.</td></tr>';
}

// A percentage follows the charges, so the amount stays right when a line changes.
function applyPercent() {
  const percent = Math.min(Math.max(0, Number(doc.travel_details.discount_percent) || 0), 100);
  if (!percent) return;
  doc.discount = Math.round(computeTotals(doc).subtotal * percent) / 100;
  $('[name=discount]').value = doc.discount;
}

const summaries = () => {
  applyPercent();
  const t = computeTotals(doc);
  const paid = doc.id ? payments.reduce((s, p) => s + Number(p.amount), 0) : Number($('#advance-amount').value || 0);
  const pax = doc.travel_details.passenger_names.filter((p) => p.name);
  $('#sum-doc').textContent = doc.invoice_number || 'New';
  $('#sum-customer').textContent = doc.customer_name;
  $('#sum-trip').textContent = doc.travel_details.package_name;
  $('#sum-pax').textContent = pax.length ? `${pax.length} added` : 'None added';
  $('#sum-extra').textContent = [doc.travel_details.flight.included && 'Flight', doc.travel_details.hotel.included && 'Hotel'].filter(Boolean).join(' + ') || 'Not included';
  $('#sum-total').textContent = money(t.total);
  $('#sum-paid').textContent = doc.doc_type === 'quotation' ? '' : `${money(paid)} paid`;
  $('#sum-box').innerHTML = `<div><span>Subtotal</span><b>${money(t.subtotal)}</b></div>${t.discount ? `<div><span>Discount${t.percent ? ` (${t.percent}%)` : ''}</span><b>− ${money(t.discount)}</b></div>` : ''}${t.tax ? `<div><span>Tax @ ${t.rate}%</span><b>${money(t.tax)}</b></div>` : ''}<div class="tot"><span>Total</span><b>${money(t.total)}</b></div>`;
};

const renderSheet = () => {
  const advance = doc.id ? 0 : Number($('#advance-amount').value || 0);
  $('#sheet').innerHTML = renderInvoice({ ...doc, advance_preview: advance }, settings, payments);
  fitStage();
};
function refresh() { summaries(); renderSheet(); }
const refreshSoon = debounce(refresh, 60);

function fitStage() {
  const stage = $('#stage'), inner = $('#sheet');
  if (!stage.clientWidth) return;
  fitInvoice(inner);
  const scale = Math.min(1, (stage.clientWidth - 32) / 794);
  inner.style.transform = `scale(${scale})`;
  stage.style.height = Math.ceil(inner.offsetHeight * scale + 34) + 'px';
}

function markDirty() { dirty = true; }

function onField(e) {
  const el = e.target;
  if (!el.name) return;
  const value = el.type === 'checkbox' ? el.checked : el.value;
  setPath(doc, fieldPath(el), value);
  if (el.name === 'invoice_number') numberEdited = true;
  if (el.name === 'discount') { doc.travel_details.discount_percent = ''; $('[name="td.discount_percent"]').value = ''; }
  if (el.name === 'td.discount_percent' && !Number(value)) { doc.discount = 0; $('[name=discount]').value = ''; }
  if (el.name === 'customer_name') pickCustomer(value);
  if (el.name === 'td.package_name') pickPackage(value);
  if (el.name === 'booking_ref') pickBooking(value);
  syncVisibility();
  markDirty();
  refreshSoon();
}

function pickCustomer(name) {
  const c = customers.find((x) => x.name === name);
  if (!c) return;
  const fill = [['phone', c.phone], ['email', c.email], ['customer_address', c.address]];
  fill.forEach(([key, v]) => { if (v && !doc[key]) { doc[key] = v; $(`[name=${key}]`).value = v; } });
  if (!doc.travel_details.passenger_names.length) { doc.travel_details.passenger_names = [{ name, type: 'adult' }]; renderPax(); }
}

function pickPackage(name) {
  const p = catalogue.find((x) => x.name === name);
  if (!p) return;
  const td = doc.travel_details;
  td.destination = td.destination || (p.region || '').split(/[·,]/)[0].trim();
  td.package_type = ['international', 'pilgrimage', 'transport'].includes(p.package_type) ? p.package_type : 'domestic';
  $('[name="td.destination"]').value = td.destination;
  $('[name="td.package_type"]').value = td.package_type;
  const first = doc.items[0];
  if (doc.items.length === 1 && !first.description) {
    first.description = p.name + (p.duration ? ` (${p.duration})` : '');
    first.rate = Number(p.package_price || 0);
    first.qty = Math.max(1, td.passenger_names.filter((x) => x.type !== 'kid').length);
    renderLines();
  }
}

const pickBooking = debounce(async (ref) => {
  ref = String(ref).trim();
  if (!/^BT\d{6,}/i.test(ref) || doc.id) return;
  try {
    const { booking, invoice } = await api(`admin?type=booking&ref=${encodeURIComponent(ref)}`);
    applyBooking(booking);
    if (invoice) toast(`This booking already has ${invoice.invoice_number}. Open it from Invoices to avoid a duplicate.`);
  } catch {}
}, 400);

function applyBooking(b) {
  doc.booking_ref = b.booking_ref;
  doc.customer_name = doc.customer_name || b.name;
  doc.phone = doc.phone || b.phone;
  doc.email = doc.email || b.email || '';
  const td = doc.travel_details;
  td.package_name = td.package_name || b.trip;
  td.travel_date = td.travel_date || (/^\d{4}-\d{2}-\d{2}/.test(b.travel_date || '') ? isoDay(b.travel_date) : '');
  const guests = Math.max(1, parseInt(b.guests, 10) || 1);
  if (!td.passenger_names.length) td.passenger_names = [{ name: b.name, type: 'adult' }];
  const first = doc.items[0];
  if (doc.items.length === 1 && !first.description) { first.description = b.trip; first.qty = guests; }
  fillForm();
  pickPackage(td.package_name);
  renderLines();
  refresh();
}

function toPayload() {
  const t = computeTotals(doc);
  return { ...doc, auto_number: !doc.id && !numberEdited, items: t.lines };
}

async function save() {
  applyPercent();
  if (!doc.customer_name.trim()) { toast('Add the customer name first', 'bad'); $('[name=customer_name]').focus(); return null; }
  if (!computeTotals(doc).lines.some((l) => l.description || l.amount)) { toast('Add at least one charge', 'bad'); return null; }
  const btn = $('#btn-save');
  btn.disabled = true;
  try {
    const advanceAmount = Number($('#advance-amount').value || 0);
    const body = doc.id
      ? { type: 'invoice', id: doc.id, invoice: toPayload() }
      : { type: 'invoice', invoice: toPayload(), advance: advanceAmount > 0 ? { amount: advanceAmount, mode: $('#advance-mode').value, reference: $('#advance-ref').value, paid_on: doc.invoice_date } : null };
    const res = await api('admin', { method: doc.id ? 'PUT' : 'POST', body });
    payments = res.payments || [];
    doc = fromServer(res.invoice);
    numberEdited = true;
    dirty = false;
    $('#advance-amount').value = '';
    fillForm();
    refresh();
    history.replaceState(null, '', `billing.html?id=${doc.id}`);
    toast(`${doc.invoice_number} saved`, 'good');
    return doc;
  } catch (e) {
    toast(e.message, 'bad');
    return null;
  } finally {
    btn.disabled = false;
  }
}

async function ensureSaved() {
  if (doc.id && !dirty) return true;
  return Boolean(await save());
}

function paymentDialog(kind) {
  const t = computeTotals(doc);
  const paid = payments.reduce((s, p) => s + Number(p.amount), 0);
  const balance = Math.max(0, t.total - paid);
  const isRefund = kind === 'refund';
  const dlg = dialog({
    title: isRefund ? 'Record a refund' : 'Record a payment',
    body: `<form id="pay-form" class="form-grid">
      <label class="field"><span>Amount ₹</span><input name="amount" type="number" min="0.01" step="0.01" required value="${isRefund ? '' : balance || ''}"></label>
      <label class="field"><span>Date</span><input name="paid_on" type="date" required value="${today()}"></label>
      <label class="field"><span>Mode</span><select name="mode"><option>UPI</option><option>Bank transfer</option><option>Cash</option><option>Card</option><option>Cheque</option></select></label>
      <label class="field"><span>Reference</span><input name="reference" placeholder="UTR or cheque no."></label>
      <label class="field full"><span>Note</span><input name="note"></label>
    </form><p style="margin:10px 0 0;color:var(--muted);font-size:13px">Invoice total ${money(t.total)} · Paid ${money(paid)} · Balance ${money(balance)}</p>`,
    footer: `<button class="btn" data-cancel>Cancel</button><button class="btn primary" data-ok>${isRefund ? 'Save refund' : 'Save payment'}</button>`,
  });
  $('[data-cancel]', dlg.el).onclick = dlg.close;
  $('[data-ok]', dlg.el).onclick = async () => {
    const form = $('#pay-form', dlg.el);
    if (!form.reportValidity()) return;
    const payment = { ...Object.fromEntries(new FormData(form)), invoice_id: doc.id, kind: isRefund ? 'refund' : 'receipt' };
    if (!isRefund && Number(payment.amount) > balance + 0.001) {
      const ok = await confirmBox('More than the balance', `This is ${money(Number(payment.amount) - balance)} more than the balance due. Save it anyway?`, 'Save anyway');
      if (!ok) return;
    }
    try {
      const res = await api('admin', { method: 'POST', body: { type: 'payments', payment } });
      dlg.close();
      await loadDoc(doc.id);
      toast(`${res.payment.receipt_no} recorded`, 'good');
    } catch (e) { toast(e.message, 'bad'); }
  };
}

async function loadDoc(id) {
  const res = await api(`admin?type=invoice&id=${encodeURIComponent(id)}`);
  settings = res.settings;
  payments = res.payments || [];
  doc = fromServer(res.invoice);
  numberEdited = true;
  dirty = false;
  // A draft from a website booking has no price yet, so take it from the package
  const first = doc.items[0], match = catalogue.find((p) => p.name === first.description);
  if (/^INV-BT/.test(doc.invoice_number) && match && !Number(first.rate)) first.rate = Number(match.package_price || 0);
  fillForm();
  refresh();
}

function whatsappText() {
  const t = computeTotals(doc);
  const paid = payments.reduce((s, p) => s + Number(p.amount), 0);
  const isQuote = doc.doc_type === 'quotation';
  return [`Hello ${doc.customer_name},`, '', `Here are your ${isQuote ? 'quotation' : 'invoice'} details from ${settings.company_name}.`, '', `${isQuote ? 'Quotation' : 'Invoice'}: ${doc.invoice_number}`, doc.travel_details.package_name ? `Journey: ${doc.travel_details.package_name}` : '', doc.travel_details.travel_date ? `Travel date: ${niceDate(doc.travel_details.travel_date)}` : '', `Total: ${money(t.total)}`, isQuote ? '' : `Paid: ${money(paid)}`, isQuote ? '' : `Balance due: ${money(Math.max(0, t.total - paid))}`, !isQuote && doc.due_date ? `Due by: ${niceDate(doc.due_date)}` : '', settings.upi_id && !isQuote ? `UPI: ${settings.upi_id}` : '', '', 'Thank you for travelling with Bahadur.'].filter((x, i, a) => x !== '' || a[i - 1] !== '').join('\n');
}

function moreMenu() {
  const isQuote = doc.doc_type === 'quotation';
  const dlg = dialog({
    title: 'More actions',
    body: `<div style="display:grid;gap:8px">
      ${doc.status === 'Draft' && doc.id ? '<button class="btn" data-act="sent"><i class="hgi-stroke hgi-sent"></i>Mark as sent</button>' : ''}
      ${isQuote && doc.id && doc.status !== 'Accepted' ? '<button class="btn" data-act="convert"><i class="hgi-stroke hgi-exchange-01"></i>Convert to invoice</button>' : ''}
      <button class="btn" data-act="duplicate"><i class="hgi-stroke hgi-copy-01"></i>Duplicate as a new document</button>
      <button class="btn" data-act="new"><i class="hgi-stroke hgi-add-01"></i>Start a blank document</button>
      ${doc.email ? '<button class="btn" data-act="email"><i class="hgi-stroke hgi-mail-01"></i>Email the customer</button>' : ''}
      ${doc.id && doc.status !== 'Cancelled' ? '<button class="btn danger" data-act="cancel"><i class="hgi-stroke hgi-cancel-circle"></i>Cancel this document</button>' : ''}
    </div>`,
  });
  $$('[data-act]', dlg.el).forEach((b) => { b.onclick = async () => { dlg.close(); await runAction(b.dataset.act); }; });
}

async function runAction(act) {
  if (act === 'sent') {
    await api('admin', { method: 'PATCH', body: { type: 'invoice_status', id: doc.id, status: 'Sent' } });
    await loadDoc(doc.id);
    toast('Marked as sent', 'good');
  } else if (act === 'convert') {
    if (!(await ensureSaved())) return;
    const { invoice } = await api('admin', { method: 'POST', body: { type: 'convert_quotation', id: doc.id } });
    toast(`Created ${invoice.invoice_number}`, 'good');
    location.href = `billing.html?id=${invoice.id}`;
  } else if (act === 'duplicate') {
    Object.assign(doc, { id: null, invoice_number: '', status: 'Draft', invoice_date: today(), due_date: addDays(today(), settings.due_days ?? 7), paid_amount: 0 });
    payments = [];
    numberEdited = false;
    history.replaceState(null, '', 'billing.html');
    fillForm(); refresh(); nextNumberHint();
    toast('Copied. Save to create the new document.');
  } else if (act === 'new') {
    location.href = 'billing.html';
  } else if (act === 'email') {
    location.href = `mailto:${encodeURIComponent(doc.email)}?subject=${encodeURIComponent(`${doc.doc_type === 'quotation' ? 'Quotation' : 'Invoice'} ${doc.invoice_number} from ${settings.company_name}`)}&body=${encodeURIComponent(whatsappText())}`;
  } else if (act === 'cancel') {
    if (!(await confirmBox('Cancel this document?', 'It stays in your records as cancelled and leaves your totals.', 'Cancel document', true))) return;
    await api('admin', { method: 'PATCH', body: { type: 'invoice_status', id: doc.id, status: 'Cancelled' } });
    await loadDoc(doc.id);
    toast('Cancelled');
  }
}

async function nextNumberHint() {
  try {
    const { number } = await api(`admin?type=next_number&doc_type=${doc.doc_type}&date=${doc.invoice_date}`);
    if (!doc.id && !numberEdited) { doc.invoice_number = number; $('[name=invoice_number]').value = number; refresh(); }
  } catch {}
}

function bind() {
  const form = $('#bill-form');
  form.addEventListener('input', onField);
  form.addEventListener('change', onField);
  form.addEventListener('submit', (e) => e.preventDefault());
  $('#advance-amount').addEventListener('input', refreshSoon);

  $('#doc-type').addEventListener('click', (e) => {
    const type = e.target.dataset.type;
    if (!type || doc.id) return;
    doc.doc_type = type;
    doc.status = 'Draft';
    numberEdited = false;
    fillForm(); refresh(); nextNumberHint();
  });

  $('#line-rows').addEventListener('input', (e) => {
    const row = e.target.closest('[data-i]');
    if (!row || !e.target.dataset.k) return;
    doc.items[row.dataset.i][e.target.dataset.k] = e.target.value;
    markDirty(); refreshSoon();
  });
  $('#line-rows').addEventListener('click', (e) => {
    const rm = e.target.closest('[data-rm]');
    if (!rm) return;
    doc.items.splice(rm.closest('[data-i]').dataset.i, 1);
    if (!doc.items.length) doc.items.push({ description: '', sac: settings.default_sac, qty: 1, rate: 0 });
    renderLines(); markDirty(); refresh();
  });
  $('#quick-lines').addEventListener('click', (e) => {
    if (e.target.dataset.line === undefined) return;
    doc.items.push({ description: e.target.dataset.line, sac: settings.default_sac, qty: 1, rate: 0 });
    renderLines(); markDirty(); refresh();
    $$('#line-rows [data-k=rate]').pop()?.focus();
  });

  $('#pax-rows').addEventListener('input', (e) => {
    const row = e.target.closest('[data-i]');
    if (!row || !e.target.dataset.k) return;
    doc.travel_details.passenger_names[row.dataset.i][e.target.dataset.k] = e.target.value;
    markDirty(); refreshSoon();
  });
  $('#pax-rows').addEventListener('click', (e) => {
    const rm = e.target.closest('[data-rm]');
    if (!rm) return;
    doc.travel_details.passenger_names.splice(rm.closest('[data-i]').dataset.i, 1);
    renderPax(); markDirty(); refresh();
  });
  $('#add-pax').onclick = () => { doc.travel_details.passenger_names.push({ name: '', type: 'adult' }); renderPax(); $$('#pax-rows [data-k=name]').pop()?.focus(); };
  $('#same-as-customer').onclick = () => {
    if (!doc.customer_name) return toast('Add the customer name first');
    if (!doc.travel_details.passenger_names.some((p) => p.name === doc.customer_name)) doc.travel_details.passenger_names.unshift({ name: doc.customer_name, type: 'adult' });
    renderPax(); markDirty(); refresh();
  };
  $('#pax-apply').onclick = () => {
    const rows = $('#pax-paste').value.split('\n').map((l) => l.trim()).filter(Boolean).map((line) => {
      const [name, age] = line.split(/\s+-\s+|\s*,\s*/);
      const n = Number(age);
      return { name, age: age || '', type: age && n < 12 ? 'kid' : 'adult' };
    });
    doc.travel_details.passenger_names.push(...rows);
    $('#pax-paste').value = '';
    renderPax(); markDirty(); refresh();
  };

  $('#add-payment').onclick = () => paymentDialog('receipt');
  $('#add-refund').onclick = () => paymentDialog('refund');
  $('#ledger').addEventListener('click', async (e) => {
    const link = e.target.closest('[data-del-pay]');
    if (!link) return;
    e.preventDefault();
    if (!(await confirmBox('Remove this payment?', 'The invoice balance will go back up.', 'Remove', true))) return;
    try { await api(`admin?type=payments&id=${link.dataset.delPay}`, { method: 'DELETE' }); await loadDoc(doc.id); toast('Payment removed'); } catch (err) { toast(err.message, 'bad'); }
  });

  $('#btn-save').onclick = save;
  $('#btn-more').onclick = moreMenu;
  $('#btn-print').onclick = async () => {
    if (!(await ensureSaved())) return;
    $('#mobile-tabs [data-view=preview]').click();
    document.title = doc.invoice_number;
    window.print();
  };
  $('#btn-pdf').onclick = async () => {
    if (!(await ensureSaved())) return;
    const btn = $('#btn-pdf');
    btn.disabled = true;
    try {
      const pages = await savePdf($('#sheet .inv'), pdfName(doc));
      toast(`PDF saved (${pages} page${pages > 1 ? 's' : ''})`, 'good');
    } catch (e) { toast(e.message, 'bad'); } finally { btn.disabled = false; }
  };
  $('#btn-wa').onclick = async () => {
    if (!(await ensureSaved())) return;
    window.open(`https://wa.me/${waNumber(doc.phone)}?text=${encodeURIComponent(whatsappText())}`, '_blank', 'noopener');
  };

  window.addEventListener('resize', debounce(fitStage, 80));
  window.addEventListener('beforeunload', (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });
  document.addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save(); } });
}

await boot({ page: 'billing', title: 'Billing studio', subtitle: 'The preview updates as you type', actions });
// Connected before the data loads, so the phone tabs respond on a slow connection
$('#mobile-tabs').addEventListener('click', (e) => {
  if (!e.target.dataset.view) return;
  $$('#mobile-tabs button').forEach((b) => b.classList.toggle('active', b === e.target));
  $('#bill').classList.toggle('show-preview', e.target.dataset.view === 'preview');
  fitStage();
});
await document.fonts?.ready;

async function init() {
  const [settingsRes, customerRes, packageRes, bookingRes] = await Promise.all([
    api('admin?type=settings'),
    api('admin?type=customers&limit=500').catch(() => ({ customers: [] })),
    api('packages?admin=1').catch(() => ({ packages: [] })),
    api('bookings').catch(() => ({ bookings: [] })),
  ]);
  settings = settingsRes.settings;
  customers = customerRes.customers;
  catalogue = packageRes.packages;
  $('#customer-list').innerHTML = customers.map((c) => `<option value="${esc(c.name)}">${esc(c.phone)}</option>`).join('');
  $('#package-list').innerHTML = catalogue.map((p) => `<option value="${esc(p.name)}">${esc(p.region || '')}</option>`).join('');
  $('#booking-refs').innerHTML = bookingRes.bookings.slice(0, 100).map((b) => `<option value="${esc(b.booking_ref)}">${esc(b.name)} · ${esc(b.trip)}</option>`).join('');
  bind();
  const id = params.get('id') || params.get('invoice_id');
  if (id) { await loadDoc(id); return; }
  doc = newDoc();
  if (params.get('type') === 'quotation') doc.doc_type = 'quotation';
  fillForm();
  refresh();
  const ref = params.get('booking_ref');
  if (ref) {
    try {
      const { booking, invoice } = await api(`admin?type=booking&ref=${encodeURIComponent(ref)}`);
      if (invoice) { location.replace(`billing.html?id=${invoice.id}`); return; }
      applyBooking(booking);
    } catch (e) { toast(e.message, 'bad'); }
  }
  dirty = false;
  await nextNumberHint();
}

init().catch((e) => toast(e.message, 'bad'));
