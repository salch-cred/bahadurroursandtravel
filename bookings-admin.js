const $ = s => document.querySelector(s);
let bookings = [];
const token = () => localStorage.getItem('bahadur-admin-token') || '';
const auth = () => ({ Authorization: `Bearer ${token()}` });
const statusClass = v => {
  const s = String(v || '').toLowerCase();
  if (s.includes('confirm') || s.includes('complet') || s === 'paid') return 'status';
  if (s.includes('cancel')) return 'status danger';
  return 'status pending';
};

async function safeJson(res) {
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) {
    const text = await res.text();
    throw new Error('Server error (' + res.status + '): ' + text.slice(0, 120).replace(/<[^>]+>/g, ''));
  }
  return res.json();
}

function esc(v) {
  return String(v == null ? '' : v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderBookings(rows) {
  const countEl = $('#booking-count');
  if (countEl) countEl.textContent = `Showing ${rows.length} of ${bookings.length} bookings`;

  const body = $('#booking-rows');
  if (!body) return;

  if (!rows.length) {
    body.innerHTML = '<tr><td colspan="8" class="empty-cell">No bookings recorded yet.</td></tr>';
    return;
  }

  body.innerHTML = rows.map(x => {
    const ref = x.booking_ref || x.booking_id || '—';
    const name = x.name || '—';
    const noteRow = x.note
      ? `<tr class="booking-note-row"><td colspan="8"><small><i class="hgi-stroke hgi-note-01"></i> ${esc(x.note)}</small></td></tr>`
      : '';
    return `<tr>
      <td><strong>#${esc(ref)}</strong><small>${esc(x.source || 'website')}</small></td>
      <td><strong>${esc(name)}</strong><small>${esc(x.phone || '')}</small><small>${esc(x.email || '')}</small></td>
      <td>${esc(x.trip || '—')}</td>
      <td>${esc(x.travel_date || '—')}</td>
      <td>${esc(x.guests || '—')}</td>
      <td>${esc(x.city || '—')}</td>
      <td><span class="${statusClass(x.status)}">${esc(x.status || 'New request')}</span></td>
      <td class="booking-actions">
        <button type="button" class="mini-action-btn" data-action="wa"
          data-id="${esc(x.id)}"
          data-ref="${esc(ref)}"
          data-name="${esc(name)}"
          data-phone="${esc(x.phone || '')}"
          data-trip="${esc(x.trip || '')}"
          data-date="${esc(x.travel_date || '')}"
          data-guests="${esc(x.guests || '')}"
          data-city="${esc(x.city || '')}"
          title="Open WhatsApp"><i class="hgi-stroke hgi-whatsapp"></i></button>
        <select class="status-select mini-select" data-id="${esc(x.id)}" title="Update status">
          ${['pending', 'confirmed', 'completed', 'cancelled'].map(s =>
            `<option value="${s}"${String(x.status || '').toLowerCase() === s ? ' selected' : ''}>${s}</option>`
          ).join('')}
        </select>
        <a href="billing.html?booking_ref=${encodeURIComponent(ref)}" class="mini-action-btn" title="Create/view invoice"><i class="hgi-stroke hgi-receipt-02"></i></a>
      </td>
    </tr>${noteRow}`;
  }).join('');

  document.querySelectorAll('.status-select').forEach(sel => {
    sel.onchange = async () => {
      const id = sel.dataset.id;
      const status = sel.value;
      try {
        const r = await fetch(`/api/bookings?id=${encodeURIComponent(id)}`, {
          method: 'PUT',
          headers: { ...auth(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ status })
        });
        const d = await safeJson(r);
        if (!r.ok) throw new Error(d.error || 'Update failed');
        const b = bookings.find(x => x.id === id);
        if (b) b.status = status;
        const row = sel.closest('tr');
        const badge = row && row.querySelector('[class^="status"]');
        if (badge) {
          badge.textContent = status;
          badge.className = statusClass(status);
        }
      } catch (e) {
        alert('Status update failed: ' + e.message);
        const b = bookings.find(x => x.id === id);
        if (b) sel.value = b.status || sel.value;
      }
    };
  });

  document.querySelectorAll('[data-action="wa"]').forEach(btn => {
    btn.onclick = () => {
      const { name, phone, trip, date, guests, city, ref } = btn.dataset;
      const msg = [
        'Hello Bahadur Tours!',
        '',
        '*Booking Reference:* ' + (ref || ''),
        '*Name:* ' + (name || ''),
        '*Trip:* ' + (trip || ''),
        '*Travel Date:* ' + (date || 'TBD'),
        '*Guests:* ' + (guests || '—'),
        '*Starting City:* ' + (city || '—'),
        '*Phone:* ' + (phone || '')
      ].join('\n');
      window.open('https://wa.me/919187440916?text=' + encodeURIComponent(msg), '_blank');
    };
  });
}

function applyFilter() {
  const searchEl = $('#booking-search');
  const statusEl = $('#booking-status-filter');
  const q = (searchEl && searchEl.value || '').toLowerCase();
  const sf = (statusEl && statusEl.value || '').toLowerCase();
  renderBookings(bookings.filter(x => {
    const text = `${x.booking_ref || x.booking_id || ''} ${x.name || ''} ${x.trip || ''} ${x.phone || ''} ${x.email || ''} ${x.city || ''}`.toLowerCase();
    const matchText = !q || text.includes(q);
    const matchStatus = !sf || String(x.status || '').toLowerCase().includes(sf);
    return matchText && matchStatus;
  }));
}

function login(message) {
  const d = $('#admin-login');
  const err = $('#login-error');
  if (err) err.textContent = message || '';
  if (d && !d.open) d.showModal();
  setTimeout(() => {
    const input = $('#admin-token');
    if (input) input.focus();
  }, 50);
}

function setSyncState(state, text) {
  const pill = $('#admin-state');
  if (!pill) return;
  pill.classList.remove('is-live', 'is-busy', 'is-error');
  if (state) pill.classList.add(state);
  const t = pill.querySelector('.sync-text');
  if (t) t.textContent = text;
  else pill.textContent = text;
}

async function load() {
  if (!token()) {
    setSyncState('is-error', 'Sign-in required');
    login();
    return;
  }
  const refreshBtn = $('#admin-refresh');
  if (refreshBtn) {
    refreshBtn.classList.add('is-loading');
    refreshBtn.setAttribute('disabled', '');
  }
  setSyncState('is-busy', 'Loading bookings…');
  try {
    const res = await fetch('/api/admin', { headers: auth() });
    const d = await safeJson(res);
    if (res.status === 401) {
      localStorage.removeItem('bahadur-admin-token');
      setSyncState('is-error', 'Sign-in required');
      login('Incorrect or expired token.');
      return;
    }
    if (!res.ok) throw new Error(d.error || 'Unknown error');
    bookings = d.bookings || [];

    const pending = bookings.filter(x => String(x.status || '').toLowerCase().includes('pending')).length;
    const confirmed = bookings.filter(x => String(x.status || '').toLowerCase().includes('confirm')).length;
    const cancelled = bookings.filter(x => String(x.status || '').toLowerCase().includes('cancel')).length;

    const set = (id, val) => {
      const el = $(id);
      if (el) {
        el.textContent = val;
        el.dataset.loaded = '1';
      }
    };
    set('#metric-bookings', bookings.length);
    set('#metric-pending', pending);
    set('#metric-confirmed', confirmed);
    set('#metric-cancelled', cancelled);

    applyFilter();
    setSyncState('is-live', 'Synced ' + new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
  } catch (e) {
    setSyncState('is-error', 'Error: ' + e.message);
    const body = $('#booking-rows');
    if (body) {
      body.innerHTML = '<tr><td colspan="8" class="empty-cell">' + esc(e.message) +
        '<br><small>Check that DATABASE_URL and ADMIN_API_TOKEN are set in Vercel.</small></td></tr>';
    }
  } finally {
    if (refreshBtn) {
      refreshBtn.classList.remove('is-loading');
      refreshBtn.removeAttribute('disabled');
    }
  }
}

function init() {
  const form = $('#admin-login-form');
  if (form) {
    form.addEventListener('submit', e => {
      e.preventDefault();
      const input = $('#admin-token');
      const value = input ? input.value.trim() : '';
      if (!value) {
        login('Enter the admin token.');
        return;
      }
      localStorage.setItem('bahadur-admin-token', value);
      const dlg = $('#admin-login');
      if (dlg && dlg.open) dlg.close();
      load();
    });
  }

  const toggle = $('#admin-token-toggle');
  if (toggle) {
    toggle.addEventListener('click', () => {
      const input = $('#admin-token');
      if (!input) return;
      input.type = input.type === 'text' ? 'password' : 'text';
      input.focus();
    });
  }

  const refresh = $('#admin-refresh');
  if (refresh) refresh.addEventListener('click', load);

  const lock = $('#admin-lock');
  if (lock) {
    lock.addEventListener('click', () => {
      localStorage.removeItem('bahadur-admin-token');
      window.location.href = 'admin.html';
    });
  }

  const search = $('#booking-search');
  if (search) search.addEventListener('input', applyFilter);

  const statusFilter = $('#booking-status-filter');
  if (statusFilter) statusFilter.addEventListener('change', applyFilter);

  const dateEl = $('#admin-date');
  if (dateEl) {
    dateEl.textContent = new Intl.DateTimeFormat('en-IN', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    }).format(new Date());
  }

  load();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
