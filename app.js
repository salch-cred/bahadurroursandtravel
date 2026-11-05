// Booking window and AI concierge, shared by every visitor page. Markup comes from site-ui.js.
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));
const WA = '919187440916';
const bookingModal = $('#booking-modal');
const openModal = () => { bookingModal.classList.add('show'); document.body.classList.add('modal-open'); };
const closeModal = () => { bookingModal.classList.remove('show'); document.body.classList.remove('modal-open'); };

// Event delegation so static and dynamic Book buttons always open the window
document.addEventListener('click', (event) => {
  if (event.target.closest('#booking-modal [data-close]')) { closeModal(); return; }
  if (event.target === bookingModal) { closeModal(); return; }
  const button = event.target.closest('[data-book]');
  if (!button) return;
  event.preventDefault();
  $('#bk-form-wrap').hidden = false;
  $('#bk-done').hidden = true;
  const trip = button.getAttribute('data-trip');
  if (trip) $('#trip-input').value = trip;
  openModal();
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

$('#ft-plan')?.addEventListener('submit', (event) => {
  event.preventDefault();
  $('#bk-form-wrap').hidden = false;
  $('#bk-done').hidden = true;
  $('#booking-form [name=note]').value = $('#ft-text').value.trim();
  if (!$('#trip-input').value) $('#trip-input').value = 'Custom journey';
  openModal();
  $('#booking-form [name=name]').focus();
});

(async function loadTripOptions() {
  try {
    const res = await fetch('/api/packages');
    if (!res.ok) return;
    const { packages = [] } = await res.json();
    $('#trip-options').innerHTML = packages.map((p) => `<option value="${String(p.name).replace(/"/g, '&quot;')}"></option>`).join('');
  } catch { /* the field still accepts free text */ }
})();

function whatsappMessage(ref, d) {
  const parts = [
    '*New trip request - Bahadur Tours and Travels*', '',
    '*Reference:* ' + ref,
    '*Name:* ' + (d.name || '-'),
    '*Phone:* ' + (d.phone || '-'),
    '*Email:* ' + (d.email || '-'),
    '*Journey:* ' + (d.trip || 'Custom journey'),
    '*Travel date:* ' + (d.date || 'Flexible'),
    '*Guests:* ' + (d.guests || '-'),
    '*Starting city:* ' + (d.city || '-'),
  ];
  if (d.note && d.note.trim()) parts.push('*Notes:* ' + d.note.trim());
  return parts.join('\n');
}

$('#booking-form')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.target;
  const submit = form.querySelector('button[type="submit"]');
  const label = submit.innerHTML;
  submit.disabled = true;
  submit.textContent = 'Sending…';
  const payload = Object.fromEntries(new FormData(form));
  let ref = 'BT' + Date.now().toString().slice(-8);
  try {
    const response = await fetch('/api/bookings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Booking could not be saved');
    ref = result.bookingId || ref;
  } catch (error) {
    // The WhatsApp button below still carries every detail, so the request is not lost
    console.warn('Booking save failed:', error.message);
  }
  form.reset();
  submit.disabled = false;
  submit.innerHTML = label;
  $('#bk-ref').textContent = ref;
  $('#bk-wa').href = `https://wa.me/${WA}?text=${encodeURIComponent(whatsappMessage(ref, payload))}`;
  $('#bk-form-wrap').hidden = true;
  $('#bk-done').hidden = false;
});

function cleanAiText(text) {
  return String(text || '')
    .replace(/\*\*(.*?)\*\*/gs, '$1')
    .replace(/\*(.*?)\*/gs, '$1')
    .replace(/__(.*?)__/gs, '$1')
    .replace(/_(.*?)_/gs, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '• ')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ── AI concierge ─────────────────────────────────────────────
(function () {
  const aiPanel = $('#ai-panel'), aiMessages = $('#ai-messages'), aiInput = $('#ai-input'), aiSend = $('#ai-send');
  if (!aiPanel || !aiMessages) return;
  const chatHistory = [];
  let isThinking = false;

  const show = (open) => {
    aiPanel.classList.toggle('show', open);
    aiPanel.setAttribute('aria-hidden', String(!open));
    if (open) aiInput?.focus();
  };

  function addMsg(role, text) {
    const div = document.createElement('div');
    div.className = role === 'user' ? 'ai-msg ai-msg-user' : 'ai-msg ai-msg-bot';
    div.textContent = role === 'user' ? text : cleanAiText(text);
    aiMessages.appendChild(div);
    aiMessages.scrollTop = aiMessages.scrollHeight;
  }

  async function send(text) {
    text = (text || '').trim();
    if (!text || isThinking) return;
    isThinking = true;
    aiInput.value = '';
    aiInput.disabled = true;
    aiSend.disabled = true;
    addMsg('user', text);
    chatHistory.push({ role: 'user', content: text });
    const typing = document.createElement('div');
    typing.className = 'ai-msg ai-msg-bot ai-typing';
    typing.innerHTML = '<span></span><span></span><span></span>';
    aiMessages.appendChild(typing);
    aiMessages.scrollTop = aiMessages.scrollHeight;
    try {
      const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: text, history: chatHistory.slice(-10) }) });
      const data = await res.json();
      typing.remove();
      const reply = cleanAiText(data.reply || 'Please WhatsApp us at +91 91874 40916 for help!');
      addMsg('bot', reply);
      chatHistory.push({ role: 'assistant', content: reply });
    } catch {
      typing.remove();
      addMsg('bot', 'Our AI is briefly unavailable. WhatsApp us at +91 91874 40916 for instant help!');
    } finally {
      isThinking = false;
      aiInput.disabled = false;
      aiSend.disabled = false;
      aiInput.focus();
    }
  }

  $('#chat-form')?.addEventListener('submit', (e) => { e.preventDefault(); send(aiInput.value); });
  $('#ai-open')?.addEventListener('click', () => show(!aiPanel.classList.contains('show')));
  $('#ai-close')?.addEventListener('click', () => show(false));
  $$('.ai-chip').forEach((chip) => chip.addEventListener('click', () => { show(true); send(chip.dataset.q || chip.textContent.trim()); }));
})();

// ── Agatti map ───────────────────────────────────────────────
// MapLibre is heavy, so it only loads once the visitor scrolls near a map.
export function lazyMap(id, { center = [72.1934, 10.8589], zoom = 13.6, label = '<strong>Sand Castle Agx</strong><br>Western Road, Agatti Island<br><small>Lakshadweep 682553</small>' } = {}) {
  const host = document.getElementById(id);
  if (!host) return;
  const start = async () => {
    try {
      if (!window.maplibregl) {
        document.head.insertAdjacentHTML('beforeend', '<link rel="stylesheet" href="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css">');
        await new Promise((resolve, reject) => { const s = document.createElement('script'); s.src = 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js'; s.onload = resolve; s.onerror = reject; document.head.append(s); });
      }
      const map = new maplibregl.Map({ container: id, style: 'https://tiles.openfreemap.org/styles/liberty', center, zoom, pitch: 55, bearing: -28, attributionControl: true, cooperativeGestures: true });
      map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right');
      new maplibregl.Marker({ color: '#0ea5e9' }).setLngLat(center).setPopup(new maplibregl.Popup().setHTML(label)).addTo(map);
    } catch (error) { console.warn('Map unavailable', error); }
  };
  new IntersectionObserver((entries, io) => { if (entries[0].isIntersecting) { io.disconnect(); start(); } }, { rootMargin: '500px' }).observe(host);
}
lazyMap('map');
