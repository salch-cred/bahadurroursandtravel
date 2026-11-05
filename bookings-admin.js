import { boot, api, esc, $, niceDate, toast, confirmBox, dialog, debounce, csvDownload, today, waNumber, setBadge } from './admin-ui.js';

let rows = [], filter = 'all';
const STATUSES = ['pending', 'confirmed', 'completed', 'cancelled'];

await boot({
  page: 'bookings', title: 'Bookings', subtitle: 'Every request from the website and your team',
  actions: '<button class="btn" id="export"><i class="hgi-stroke hgi-download-04"></i>Export CSV</button><button class="btn primary" id="add"><i class="hgi-stroke hgi-add-01"></i>Add booking</button>',
});

$('main.ad-main').innerHTML = `
  <div class="grid g-4" id="stats"></div>
  <section class="card mt">
    <div class="card-head"><div class="tabs" id="tabs"></div><span class="sp"></span><label class="search"><i class="hgi-stroke hgi-search-01"></i><input id="q" placeholder="Name, phone, journey" aria-label="Search"></label></div>
    <div class="table-wrap"><table class="t"><thead><tr><th>Reference</th><th>Guest</th><th>Journey</th><th>Travel</th><th>Guests</th><th>From</th><th>Status</th><th></th></tr></thead><tbody id="rows"></tbody></table></div>
  </section>`;

function render(stats) {
  if (stats) $('#stats').innerHTML = `
    <div class="stat hero"><small>All bookings</small><strong>${stats.total}</strong><span>${stats.this_month} in the last 30 days</span></div>
    <div class="stat warn"><small>Waiting for reply</small><strong>${stats.pending}</strong><span>Follow up on WhatsApp</span></div>
    <div class="stat good"><small>Confirmed</small><strong>${stats.confirmed}</strong><span>Ready to bill</span></div>
    <div class="stat"><small>Cancelled</small><strong>${stats.cancelled}</strong><span>Closed</span></div>`;
  $('#tabs').innerHTML = ['all', ...STATUSES].map((s) => `<button data-f="${s}" class="${s === filter ? 'active' : ''}">${s[0].toUpperCase() + s.slice(1)}</button>`).join('');
  const q = $('#q').value.trim().toLowerCase();
  const list = rows.filter((x) => (filter === 'all' || String(x.status).toLowerCase() === filter) && (!q || `${x.name} ${x.phone} ${x.email} ${x.trip} ${x.booking_ref}`.toLowerCase().includes(q)));
  $('#rows').innerHTML = list.length ? list.map((x) => `<tr>
    <td class="nowrap"><strong>${esc(x.booking_ref || '—')}</strong><small>${new Date(x.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · ${esc(x.source || 'website')}</small></td>
    <td><strong>${esc(x.name)}</strong><small>${esc(x.phone)}</small><small>${esc(x.email || '')}</small></td>
    <td>${esc(x.trip)}${x.note ? `<small title="${esc(x.note)}">${esc(x.note.slice(0, 70))}${x.note.length > 70 ? '…' : ''}</small>` : ''}</td>
    <td class="nowrap">${x.travel_date ? niceDate(x.travel_date) : 'Flexible'}</td>
    <td class="nowrap">${esc(x.guests || '—')}</td><td>${esc(x.city || '—')}</td>
    <td><select data-status="${x.id}" aria-label="Status" style="padding:4px 8px;font-size:12.5px;width:112px">${STATUSES.map((s) => `<option value="${s}"${String(x.status).toLowerCase() === s ? ' selected' : ''}>${s[0].toUpperCase() + s.slice(1)}</option>`).join('')}</select></td>
    <td><div class="actions">
      <a class="btn sm icon" title="WhatsApp guest" target="_blank" rel="noopener" href="https://wa.me/${waNumber(x.phone)}?text=${encodeURIComponent(`Hello ${x.name}, this is Bahadur Tours and Travels about your ${x.trip} request (${x.booking_ref}).`)}"><i class="hgi-stroke hgi-whatsapp"></i></a>
      <a class="btn sm icon" title="Create or open invoice" href="billing.html?booking_ref=${encodeURIComponent(x.booking_ref || '')}"><i class="hgi-stroke hgi-invoice-03"></i></a>
      <button class="btn sm icon danger" data-del="${x.id}" title="Delete"><i class="hgi-stroke hgi-delete-02"></i></button>
    </div></td></tr>`).join('') : '<tr><td colspan="8"><div class="empty"><i class="hgi-stroke hgi-package"></i>No bookings match.</div></td></tr>';
}

async function load() {
  const d = await api('bookings');
  rows = d.bookings;
  setBadge('bookings', Number(d.stats.pending));
  render(d.stats);
}

$('main.ad-main').addEventListener('change', async (e) => {
  const id = e.target.dataset.status;
  if (!id) return;
  try {
    await api(`bookings?id=${id}`, { method: 'PUT', body: { status: e.target.value } });
    toast('Status updated', 'good');
    await load();
  } catch (err) { toast(err.message, 'bad'); }
});
$('main.ad-main').addEventListener('click', async (e) => {
  const t = e.target.closest('button');
  if (!t) return;
  if (t.dataset.f) { filter = t.dataset.f; render(); }
  if (t.dataset.del) {
    if (!(await confirmBox('Delete this booking?', 'This removes the request permanently. Linked invoices stay.', 'Delete', true))) return;
    try { await api(`bookings?id=${t.dataset.del}`, { method: 'DELETE' }); toast('Deleted'); await load(); } catch (err) { toast(err.message, 'bad'); }
  }
});
$('#q').addEventListener('input', debounce(() => render(), 150));
$('#add').onclick = () => {
  const dlg = dialog({
    title: 'Add a booking',
    body: `<form id="bf" class="form-grid">
      <label class="field"><span>Guest name</span><input name="name" required></label>
      <label class="field"><span>Phone</span><input name="phone" required placeholder="+91"></label>
      <label class="field"><span>Email</span><input name="email" type="email"></label>
      <label class="field"><span>From city</span><input name="city"></label>
      <label class="field full"><span>Journey</span><input name="trip" required></label>
      <label class="field"><span>Travel date</span><input name="date" type="date"></label>
      <label class="field"><span>Guests</span><input name="guests" value="2 guests"></label>
      <label class="field full"><span>Notes</span><textarea name="note" rows="2"></textarea></label></form>`,
    footer: '<button class="btn" data-c>Cancel</button><button class="btn primary" data-ok>Save booking</button>',
  });
  $('[data-c]', dlg.el).onclick = dlg.close;
  $('[data-ok]', dlg.el).onclick = async () => {
    const f = $('#bf', dlg.el);
    if (!f.reportValidity()) return;
    try { const r = await api('bookings', { method: 'POST', body: Object.fromEntries(new FormData(f)) }); dlg.close(); toast(`${r.bookingId} saved`, 'good'); await load(); } catch (e) { toast(e.message, 'bad'); }
  };
};
$('#export').onclick = () => csvDownload(`bahadur-bookings-${today()}.csv`, [['Reference', 'Created', 'Name', 'Phone', 'Email', 'Journey', 'Travel date', 'Guests', 'City', 'Status', 'Note'], ...rows.map((x) => [x.booking_ref, String(x.created_at).slice(0, 10), x.name, x.phone, x.email, x.trip, x.travel_date, x.guests, x.city, x.status, x.note])]);
load().catch((e) => toast(e.message, 'bad'));
