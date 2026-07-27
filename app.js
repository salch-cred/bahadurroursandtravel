const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));
const bookingModal = $('#booking-modal');
const reviewModal = $('#review-modal');
const openModal = (element) => { if (!element) return; element.classList.add('show'); element.setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden'; };
const closeModal = (element) => { if (!element) return; element.classList.remove('show'); element.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; };

function bindBookingButtons() {
  $$('[data-book]:not([data-book-bound])').forEach((button) => {
    button.setAttribute('data-book-bound', 'true');
    button.addEventListener('click', () => {
      const trip = button.getAttribute('data-trip');
      const select = $('#trip-select');
      if (trip && select) {
        if (!Array.from(select.options).some((option) => option.value === trip)) select.add(new Option(trip, trip));
        select.value = trip;
      }
      openModal(bookingModal);
    });
  });
}
bindBookingButtons();
window.addEventListener('bahadur:destinations-ready', bindBookingButtons);

// Load all packages from API into booking form trip select
async function loadPackageOptions() {
  const select = $('#trip-select');
  if (!select) return;
  try {
    const res = await fetch('/api/packages');
    if (!res.ok) return;
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('application/json')) return;
    const data = await res.json();
    const packages = data.packages || [];
    packages.forEach(p => {
      const name = p.name || p.slug;
      if (name && !Array.from(select.options).some(o => o.value === name)) {
        select.add(new Option(name, name));
      }
    });
  } catch (e) { /* packages API not configured yet, skip */ }
}
loadPackageOptions();

$$('[data-close]').forEach((button) => button.addEventListener('click', () => closeModal(bookingModal)));
$('#finder')?.addEventListener('submit', (event) => { event.preventDefault(); openModal(bookingModal); });
$('#add-review')?.addEventListener('click', () => { window.location.href = 'community.html#share'; });
$$('[data-review-close]').forEach((button) => button.addEventListener('click', () => closeModal(reviewModal)));

$('#booking-form')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.target;
  const submit = form.querySelector('button[type="submit"], button:not([type])');
  const originalHTML = submit?.innerHTML || 'Send booking request';
  if (submit) { submit.disabled = true; submit.textContent = 'Sending...'; }
  const payload = Object.fromEntries(new FormData(form));

  // Build fully formatted WhatsApp message with all details in correct order
  function buildWAMessage(ref) {
    const parts = [
      '*New Booking - Bahadur Tours & Travels*',
      '',
      '*Booking Ref:* ' + ref,
      '*Name:* ' + (payload.name || '-'),
      '*Phone:* ' + (payload.phone || '-'),
      '*Email:* ' + (payload.email || '-'),
      '*Trip / Experience:* ' + (payload.trip || 'Custom journey'),
      '*Travel Date:* ' + (payload.date || 'Flexible'),
      '*Number of Guests:* ' + (payload.guests || '-'),
      '*Starting City:* ' + (payload.city || '-'),
    ];
    if (payload.note && payload.note.trim()) {
      parts.push('*Special Requirements:* ' + payload.note.trim());
    }
    parts.push('', '_Booked via bahadurtours.com_');
    return parts.join('\n');
  }

  let bookingRef = 'BT' + Date.now().toString().slice(-8);
  try {
    const response = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Booking could not be saved');
    bookingRef = result.bookingId || result.booking?.booking_ref || bookingRef;
  } catch (error) {
    // DB save failed — still open WhatsApp so lead is not lost
    console.warn('Booking DB save failed (will still open WhatsApp):', error.message);
  }

  form.reset();
  closeModal(bookingModal);
  if (submit) { submit.disabled = false; submit.innerHTML = originalHTML; }
  // Always open WhatsApp with full structured details
  window.open('https://wa.me/919187440916?text=' + encodeURIComponent(buildWAMessage(bookingRef)), '_blank');
});;

$('#review-form')?.addEventListener('submit', (event) => {
  event.preventDefault();
  const form = event.target;
  const pending = JSON.parse(localStorage.getItem('bahadur-reviews') || '[]');
  pending.push({ ...Object.fromEntries(new FormData(form)), status: 'pending', createdAt: new Date().toISOString() });
  localStorage.setItem('bahadur-reviews', JSON.stringify(pending));
  alert('Thank you. Your review was submitted for booking verification.');
  closeModal(reviewModal);
  form.reset();
});
// ── AI Quick Chat ─────────────────────────────────────────────
(function () {
  const aiPanel    = document.querySelector('#ai-panel');
  const aiMessages = document.querySelector('#ai-messages');
  const aiInput    = document.querySelector('#ai-input');
  const aiSend     = document.querySelector('#ai-send');
  const aiClose    = document.querySelector('#ai-close');
  if (!aiPanel || !aiMessages) return;

  // Persistent conversation history
  let chatHistory = [];
  let isThinking   = false;

  function scrollBottom () {
    if (aiMessages) aiMessages.scrollTop = aiMessages.scrollHeight;
  }

  function addMsg (role, text) {
    const div = document.createElement('div');
    div.className = role === 'user' ? 'ai-msg ai-msg-user' : 'ai-msg ai-msg-bot';
    div.textContent = text;
    aiMessages.appendChild(div);
    scrollBottom();
  }

  function addTyping () {
    const div = document.createElement('div');
    div.className = 'ai-msg ai-msg-bot ai-typing';
    div.id = 'ai-typing-indicator';
    div.innerHTML = '<span></span><span></span><span></span>';
    aiMessages.appendChild(div);
    scrollBottom();
    return div;
  }

  function removeTyping () {
    document.querySelector('#ai-typing-indicator')?.remove();
  }

  async function send (text) {
    text = (text || '').trim();
    if (!text || isThinking) return;
    isThinking = true;
    if (aiInput) { aiInput.value = ''; aiInput.disabled = true; }
    if (aiSend) aiSend.disabled = true;

    addMsg('user', text);
    chatHistory.push({ role: 'user', content: text });

    const typing = addTyping();

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history: chatHistory.slice(-10) }),
      });
      const data = await res.json();
      removeTyping();
      const reply = data.reply || 'Please WhatsApp us at +91 91874 40916 for help!';
      addMsg('bot', reply);
      chatHistory.push({ role: 'assistant', content: reply });
    } catch {
      removeTyping();
      addMsg('bot', 'Our AI is briefly unavailable. WhatsApp us at +91 91874 40916 for instant help!');
    } finally {
      isThinking = false;
      if (aiInput) { aiInput.disabled = false; aiInput.focus(); }
      if (aiSend) aiSend.disabled = false;
    }
  }

  // Send button + Enter key
  if (aiSend) aiSend.addEventListener('click', () => send(aiInput?.value));
  if (aiInput) {
    aiInput.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(aiInput.value); }
    });
  }

  // Close AI panel
  if (aiClose) aiClose.addEventListener('click', () => {
    aiPanel.classList.remove('show');
    aiPanel.setAttribute('aria-hidden', 'true');
  });

  // Quick-reply chips send the chip text to the AI
  document.querySelectorAll('.ai-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const q = chip.dataset.q || chip.textContent.trim();
      if (!aiPanel.classList.contains('show')) {
        aiPanel.classList.add('show');
        aiPanel.setAttribute('aria-hidden', 'false');
      }
      send(q);
    });
  });

  // Finder form opens AI panel
  document.querySelector('#finder')?.addEventListener('submit', e => {
    e.preventDefault();
    aiPanel.classList.add('show');
    aiPanel.setAttribute('aria-hidden', 'false');
    const dest = document.querySelector('#finder-destination')?.value?.trim();
    if (dest) send('I want to plan a trip to ' + dest);
  });
})();


  if (t.includes('budget') || t.includes('cheap') || t.includes('affordable')) {
    return 'Great budget options from Bahadur Tours:\n• Kashmir: from ₹28,000/person\n• Goa: from ₹18,000/person\n• Kerala: from ₹20,000/person\n• Umrah Economy: contact for current rates\nShare your max budget, travel month and number of guests — I\'ll find the best fit!';
  }
  if (/book|reserve|confirm|how to book/.test(t)) {
    return 'Ready to book? 🎉 Click the "Plan my trip" button at the top, fill in your details, and our team will contact you within 2 hours via WhatsApp (+91 91874 40916) and email. You can also WhatsApp us directly!';
  }
  if (t.includes('price') || t.includes('cost') || t.includes('rate') || t.includes('how much')) {
    return 'Here are our starting prices:\n• Lakshadweep: custom quote (permit + flights)\n• Umrah Premium: from ₹1.2L/person\n• Kashmir: from ₹28,000/person\n• Dubai: from ₹55,000/person\n• Maldives: from ₹80,000/couple\n• Thailand: from ₹65,000/person\nPrices vary by season and group size. Which destination interests you?';
  }
  return 'Welcome to Bahadur Tours! 🌍 We specialise in Lakshadweep, Umrah, Kashmir, Kerala, Dubai, Maldives, Thailand, and more. Share your destination, travel month, number of guests and approximate budget — I\'ll suggest the perfect package!';
}
$('#chat-form')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const input = $('#chat-input');
  const message = input?.value.trim();
  if (!message) return;
  addChatMessage('user', message);
  chatHistory.push({ role: 'user', content: message });
  input.value = '';
  let reply;
  try {
    const response = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: chatHistory }) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Chat unavailable');
    reply = result.reply;
  } catch {
    reply = localTravelReply(message);
  }
  chatHistory.push({ role: 'assistant', content: reply });
  addChatMessage('assistant', reply);
  if (/book|reserve|confirm/.test(message.toLowerCase())) setTimeout(() => openModal(bookingModal), 550);
});

$$('[data-filter]').forEach((tab) => tab.addEventListener('click', () => {
  const filter = tab.getAttribute('data-filter');
  $$('[data-filter]').forEach((item) => item.classList.remove('active'));
  tab.classList.add('active');
  $$('.package-card').forEach((card) => { const tags = `${card.getAttribute('data-category') || ''} ${card.getAttribute('data-tags') || ''}`.split(/\s+/); card.classList.toggle('hidden', filter !== 'all' && !tags.includes(filter)); });
}));
const packageSearch = $('#package-search');
packageSearch?.addEventListener('input', () => {
  const query = packageSearch.value.toLowerCase();
  $$('.package-card').forEach((card) => card.classList.toggle('hidden', !(card.getAttribute('data-name') || '').toLowerCase().includes(query)));
});

try {
  if (typeof maplibregl !== 'undefined' && $('#map')) {
    const map = new maplibregl.Map({ container: 'map', style: 'https://tiles.openfreemap.org/styles/liberty', center: [72.1934, 10.8589], zoom: 13.2, pitch: 62, bearing: -24, attributionControl: true });
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right');
    new maplibregl.Marker({ color: '#e3b64d' }).setLngLat([72.1934, 10.8589]).setPopup(new maplibregl.Popup().setHTML('<strong>Bahadur Tours — Agatti</strong><br>Island pickup point')).addTo(map);
    map.on('load', () => { const fallback = document.querySelector('.map-fallback'); if (fallback) fallback.style.display = 'none'; try { map.addLayer({'id': '3d-buildings','source': 'openmaptiles','source-layer': 'building','filter': ['==', 'extrude', 'true'],'type': 'fill-extrusion','minzoom': 14,'paint': {'fill-extrusion-color': '#aaa','fill-extrusion-height': ['get', 'height'],'fill-extrusion-base': ['get', 'min_height'],'fill-extrusion-opacity': 0.6}}); } catch(e) {} });
  }
} catch (error) { console.warn('Map fallback active', error); }

function slugify(value){return String(value||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}
function bindPackageDetailLinks(){document.querySelectorAll('.package-card:not([data-detail-ready])').forEach(card=>{card.dataset.detailReady='true';const title=card.querySelector('h3')?.textContent||card.getAttribute('data-trip')||'';const footer=card.querySelector('.package-footer');if(footer&&!footer.querySelector('a[href*="package.html"]')){const link=document.createElement('a');link.className='details-link';link.href='package.html?slug='+(card.dataset.slug||slugify(title));link.innerHTML='Full details <i class="hgi-stroke hgi-arrow-right-01"></i>';footer.prepend(link)}card.addEventListener('click',event=>{if(event.target.closest('button,a'))return;location.href='package.html?slug='+(card.dataset.slug||slugify(title))})})}
bindPackageDetailLinks();window.addEventListener('bahadur:destinations-ready',bindPackageDetailLinks);
