// Shared admin shell: sidebar, sign-in, API calls and small helpers used by every admin page.
const TOKEN_KEY = 'bahadur-admin-token';
export const LOGO = 'assets/brand/bahadur-logo.png';
export const WHATSAPP_ADMIN = '919187440916';

const NAV = [
  ['Overview', [['admin.html', 'dashboard', 'Dashboard', 'dashboard-square-01']]],
  ['Sales', [
    ['bookings-admin.html', 'bookings', 'Bookings', 'package'],
    ['billing.html', 'billing', 'New invoice', 'add-circle'],
    ['invoices-admin.html', 'invoices', 'Invoices & quotes', 'invoice-03'],
    ['customers-admin.html', 'customers', 'Customers', 'user-multiple-02'],
  ]],
  ['Accounts', [
    ['finance-admin.html', 'finance', 'Payments & expenses', 'credit-card'],
    ['reports-admin.html', 'reports', 'Reports & GST', 'chart-bar-line'],
  ]],
  ['Website', [
    ['packages-admin.html', 'packages', 'Packages', 'layers-01'],
    ['reviews-admin.html', 'reviews', 'Reviews', 'star'],
    ['blog-admin.html', 'blog', 'Travel guides', 'document-validation'],
    ['media-manager.html', 'media', 'Guest media', 'image-01'],
    ['reels-admin.html', 'reels', 'Reels', 'video-01'],
  ]],
  ['System', [['settings-admin.html', 'settings', 'Business settings', 'settings-01']]],
];

// The desktop billing app shows only the billing pages.
export const IN_BILLING_APP = /BahadurBilling/.test(navigator.userAgent);
const BILLING_APP_PAGES = ['billing', 'invoices', 'customers', 'finance', 'reports', 'settings'];
const HOME_PAGE = IN_BILLING_APP ? 'invoices-admin.html' : 'admin.html';
const MENU = IN_BILLING_APP
  ? NAV.map(([group, items]) => [group, items.filter(([, key]) => BILLING_APP_PAGES.includes(key))]).filter(([, items]) => items.length)
  : NAV;

export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const money = (v, digits = 2) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: digits, maximumFractionDigits: digits }).format(Number(v || 0));
export const money0 = (v) => money(v, 0);
export const isoDay = (v) => String(v || '').slice(0, 10);
export const niceDate = (v) => {
  const d = isoDay(v);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return v ? String(v) : '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};
export const today = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
export const addDays = (date, n) => { const d = new Date(date + 'T00:00:00'); d.setDate(d.getDate() + Number(n || 0)); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
export const debounce = (fn, ms = 200) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
export const $ = (s, root = document) => root.querySelector(s);
export const $$ = (s, root = document) => [...root.querySelectorAll(s)];
export const waNumber = (phone) => { const d = String(phone || '').replace(/\D/g, ''); return d.length === 10 ? '91' + d : d; };

export function statusOf(inv) {
  const status = inv.status || 'Draft';
  const balance = Number(inv.total || 0) - Number(inv.paid_amount || 0);
  if (inv.doc_type !== 'quotation' && !['Draft', 'Cancelled', 'Paid'].includes(status) && balance > 0 && inv.due_date && isoDay(inv.due_date) < today()) return 'Overdue';
  return status;
}
export const pill = (status) => {
  const key = String(status || '').toLowerCase().replace('part paid', 'part').split(' ')[0];
  return `<span class="pill ${esc(key)}">${esc(status || '—')}</span>`;
};

export function toast(message, kind = '') {
  let host = $('.toasts');
  if (!host) { host = document.createElement('div'); host.className = 'toasts'; document.body.append(host); }
  const el = document.createElement('div');
  el.className = 'toast ' + kind;
  el.textContent = message;
  host.append(el);
  setTimeout(() => el.remove(), kind === 'bad' ? 6000 : 3200);
}

export async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch('/api/' + path, {
    method,
    headers: { Authorization: 'Bearer ' + (localStorage.getItem(TOKEN_KEY) || ''), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { throw new Error('Server error (' + res.status + ')'); }
  if (res.status === 401) { showLogin(); throw new Error('Please sign in again'); }
  if (!res.ok) throw new Error(data.error || 'Request failed (' + res.status + ')');
  return data;
}

// Promise-based confirm that matches the admin styling
export function confirmBox(title, message, action = 'Confirm', danger = false) {
  return new Promise((resolve) => {
    const d = document.createElement('dialog');
    d.className = 'dlg';
    d.innerHTML = `<div class="dlg-head"><h3>${esc(title)}</h3></div><div class="dlg-body">${esc(message)}</div><div class="dlg-foot"><button class="btn" data-no>Keep it</button><button class="btn ${danger ? 'danger' : 'primary'}" data-yes>${esc(action)}</button></div>`;
    document.body.append(d);
    const done = (v) => { d.close(); d.remove(); resolve(v); };
    $('[data-no]', d).onclick = () => done(false);
    $('[data-yes]', d).onclick = () => done(true);
    d.addEventListener('cancel', () => done(false));
    d.showModal();
  });
}

export function dialog({ title, body, wide, footer = '' }) {
  const d = document.createElement('dialog');
  d.className = 'dlg' + (wide ? ' wide' : '');
  d.innerHTML = `<div class="dlg-head"><h3>${esc(title)}</h3><button class="x" data-x aria-label="Close"><i class="hgi-stroke hgi-cancel-01"></i></button></div><div class="dlg-body">${body}</div>${footer ? `<div class="dlg-foot">${footer}</div>` : ''}`;
  document.body.append(d);
  const close = () => { d.close(); d.remove(); };
  $('[data-x]', d).onclick = close;
  d.addEventListener('cancel', () => d.remove());
  d.showModal();
  return { el: d, close };
}

let loginResolve = null;
function showLogin() {
  document.body.classList.add('locked');
  if ($('#ad-login')) return;
  if (!$('.ad-login-sky')) document.body.insertAdjacentHTML('beforeend', '<div class="ad-login-sky" aria-hidden="true"><img class="a" src="assets/sky/cloud-a.webp" alt=""><img class="b" src="assets/sky/cloud-b.webp" alt=""><img class="c" src="assets/sky/cloud-bank.webp" alt=""></div>');
  const d = document.createElement('dialog');
  d.id = 'ad-login';
  d.className = 'dlg';
  d.innerHTML = `<form class="login-card" method="dialog"><img src="${LOGO}" alt="Bahadur Tours and Travels"><h2>Staff sign in</h2><p>Enter your private admin token to open the business panel.</p><label class="field"><input type="password" id="ad-token" placeholder="Admin token" required autocomplete="current-password"></label><p class="err" id="ad-err"></p><button class="btn primary" style="width:100%">Open panel</button></form>`;
  document.body.append(d);
  d.addEventListener('cancel', (e) => e.preventDefault());
  $('form', d).onsubmit = async (e) => {
    e.preventDefault();
    const tok = $('#ad-token', d).value.trim();
    const res = await fetch('/api/admin?type=settings', { headers: { Authorization: 'Bearer ' + tok } }).catch(() => null);
    if (!res || !res.ok) { $('#ad-err', d).textContent = res?.status === 401 ? 'That token is not correct.' : 'Could not reach the server. Please try again.'; return; }
    try { localStorage.setItem(TOKEN_KEY, tok); } catch {}
    d.close(); d.remove();
    document.body.classList.remove('locked');
    $('.ad-login-sky')?.remove();
    if (loginResolve) { loginResolve(); loginResolve = null; } else location.reload();
  };
  d.showModal();
}

// Headline figures count up the first time they appear on a page
function countUpStats(root) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const seen = new WeakSet();
  const run = (el) => {
    const m = el.textContent.match(/^(\D*)([\d,]+(?:\.\d+)?)(.*)$/);
    if (!m) return;
    const target = Number(m[2].replace(/,/g, '')), dec = (m[2].split('.')[1] || '').length, start = performance.now();
    if (!target) return;
    const tick = (now) => {
      if (!el.isConnected) return;
      const t = Math.min(1, (now - start) / 900), eased = 1 - (1 - t) ** 4;
      el.textContent = m[1] + (target * eased).toLocaleString('en-IN', { minimumFractionDigits: dec, maximumFractionDigits: dec }) + m[3];
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  const scan = () => $$('.stat strong', root).forEach((el) => { if (!seen.has(el)) { seen.add(el); run(el); } });
  const watch = new MutationObserver(scan);
  watch.observe(root, { childList: true, subtree: true });
  setTimeout(() => watch.disconnect(), 3000);
}

export function boot({ page, title, subtitle = '', actions = '' }) {
  document.body.classList.add('ad');
  const main = $('main.ad-main');
  const side = document.createElement('aside');
  side.className = 'ad-side';
  side.innerHTML = `<a class="ad-brand" href="${HOME_PAGE}"><img src="${LOGO}" alt="Bahadur Tours and Travels"></a><nav class="ad-nav" aria-label="Admin">${MENU.map(([group, items]) => `<div class="ad-group">${group}</div>${items.map(([href, key, label, icon]) => `<a href="${href}" class="${key === page ? 'active' : ''}"><i class="hgi-stroke hgi-${icon}"></i>${label}<span class="badge" data-badge="${key}" hidden></span></a>`).join('')}`).join('')}</nav><div class="ad-side-foot"><a href="index.html" target="_blank" rel="noopener"><i class="hgi-stroke hgi-link-square-02"></i>Website</a><button id="ad-logout" type="button"><i class="hgi-stroke hgi-logout-03"></i>Sign out</button></div>`;
  const wrap = document.createElement('div');
  wrap.className = 'ad-wrap';
  wrap.innerHTML = `<header class="ad-top"><button class="ad-burger" aria-label="Menu"><i class="hgi-stroke hgi-menu-01"></i></button><div><h1>${esc(title)}</h1>${subtitle ? `<p id="ad-sub">${esc(subtitle)}</p>` : ''}</div><div class="sp"></div>${actions}</header>`;
  main.replaceWith(wrap);
  wrap.append(main);
  const scrim = document.createElement('div');
  scrim.className = 'ad-scrim';
  const decor = document.createElement('div');
  decor.className = 'ad-decor';
  decor.setAttribute('aria-hidden', 'true');
  decor.innerHTML = '<img src="assets/sky/cloud-a.webp" alt=""><img src="assets/sky/cloud-c.webp" alt="">';
  document.body.prepend(decor, side, scrim);
  countUpStats(main);
  $('.ad-burger').onclick = () => document.body.classList.toggle('nav-open');
  scrim.onclick = () => document.body.classList.remove('nav-open');
  $('#ad-logout').onclick = () => { localStorage.removeItem(TOKEN_KEY); location.href = HOME_PAGE; };
  if (localStorage.getItem(TOKEN_KEY)) return Promise.resolve();
  return new Promise((resolve) => { loginResolve = resolve; showLogin(); });
}

export function setBadge(key, count) {
  const el = $(`[data-badge="${key}"]`);
  if (!el) return;
  el.hidden = !count;
  el.textContent = count;
}

export function csvDownload(filename, rows) {
  const text = rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['﻿' + text], { type: 'text/csv;charset=utf-8' }));
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function compressImage(file, maxW = 1400, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width);
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * scale);
        c.height = Math.round(img.height * scale);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
