// Lazy media and anonymous visit counting for the admin dashboard.
document.querySelectorAll('img:not([fetchpriority])').forEach((img) => { if (!img.loading) img.loading = 'lazy'; img.decoding = 'async'; });
document.querySelectorAll('video').forEach((v) => { v.preload = 'metadata'; v.playsInline = true; });
try {
  const idKey = 'bahadur-visitor-id', id = localStorage.getItem(idKey) || crypto.randomUUID();
  localStorage.setItem(idKey, id);
  const path = location.pathname || '/', hitKey = 'bahadur-hit-' + path, last = Number(sessionStorage.getItem(hitKey) || 0);
  if (Date.now() - last > 30 * 60 * 1000) {
    sessionStorage.setItem(hitKey, String(Date.now()));
    fetch('/api/community?type=analytics', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ visitorId: id, path, referrer: document.referrer }), keepalive: true }).catch(() => {});
  }
} catch {}
