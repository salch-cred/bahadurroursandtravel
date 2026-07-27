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
  const originalText = submit?.textContent || 'Send booking request';
  if (submit) { submit.disabled = true; submit.textContent = 'Sending securely…'; }
  const payload = Object.fromEntries(new FormData(form));
  localStorage.setItem('bahadur-last-booking', JSON.stringify(payload));
  try {
    const response = await fetch('/api/bookings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Booking could not be sent');
    alert(`Booking request ${result.bookingId} received. Email and WhatsApp notifications are being sent.`);
    form.reset();
    closeModal(bookingModal);
  } catch (error) {
    const fallbackId = `BT${Date.now().toString().slice(-8)}`;
    const message = `Hello Bahadur Tours, I want to book ${payload.trip || 'a trip'}. Reference: ${fallbackId}. Name: ${payload.name || ''}, date: ${payload.date || ''}, guests: ${payload.guests || ''}.`;
    alert('The automatic notification service is not connected in this preview. WhatsApp will open so the request is not lost.');
    window.open('https:' + '//wa.me/919187440916?text=' + encodeURIComponent(message), '_blank');
  } finally {
    if (submit) { submit.disabled = false; submit.textContent = originalText; }
  }
});

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

const aiPanel = $('#ai-panel');
const chat = $('#chat');
const chatHistory = [];
$('#ai-open')?.addEventListener('click', () => aiPanel?.classList.toggle('show'));
$('#ai-close')?.addEventListener('click', () => aiPanel?.classList.remove('show'));
document.querySelectorAll('.ai-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    const input = $('#chat-input');
    if (input) {
      input.value = chip.dataset.q || chip.textContent.replace(/^[^\w]+/, '').trim();
      aiPanel?.classList.add('show');
      document.getElementById('chat-form')?.dispatchEvent(new Event('submit', { bubbles: true }));
    }
  });
});
function addChatMessage(role, content) {
  if (!chat) return;
  const paragraph = document.createElement('p');
  paragraph.className = role === 'user' ? 'user' : 'bot';
  paragraph.textContent = content;
  chat.appendChild(paragraph);
  chat.scrollTop = chat.scrollHeight;
}
function localTravelReply(message) {
  const t = message.toLowerCase();
  if (t.includes('lakshadweep') || t.includes('agatti') || t.includes('bangaram') || t.includes('kadmat')) {
    return 'Lakshadweep is our speciality! 🏝 We offer Standard (3N/4D - Agatti island, snorkeling, glass-bottom boat) and Premium (4N/5D - Bangaram/Kadmat, scuba diving, beach bonfire). Permit is required — we handle it. Flights only from Kochi (Oct–May best season). How many guests and which month?';
  }
  if (t.includes('umrah') || t.includes('makkah') || t.includes('madinah') || t.includes('mecca') || t.includes('saudi')) {
    return 'We offer 3 Umrah packages 🕌\n• Economy (10-12 days) – shared transport, 500m hotel\n• Standard (12-14 days) – closer hotel, ziyarat guide\n• Premium (14-15 days) – 5-star, private transport, from ₹1.2L\nAll include visa + flights + accommodation. Need valid passport (6+ months). How many persons travelling?';
  }
  if (t.includes('kashmir') || t.includes('gulmarg') || t.includes('dal lake') || t.includes('pahalgam')) {
    return 'Kashmir is magical! 🏔 Two options:\n• Summer (Apr–Oct): Dal Lake houseboat, Gulmarg, Pahalgam, Srinagar sightseeing — 5 days from ₹28,000/person\n• Snow (Dec–Mar): Gulmarg skiing, Sonamarg, snowmobile rides\nShare travel month and group size for a precise quote!';
  }
  if (t.includes('maldives') || t.includes('honeymoon') || t.includes('couple')) {
    return 'Maldives Honeymoon 💑 — 4 days from ₹80,000/couple. Overwater villa, couples spa, snorkeling, sunset cruise. Best months: Nov–April. Want to add any special arrangements like cake or flowers? Share your travel date!';
  }
  if (t.includes('dubai')) {
    return 'Dubai 5 days from ₹55,000/person 🌆 — Burj Khalifa, desert safari, Dubai Mall, Gold Souk, Dhow cruise. Visa arranged by us. Best months: Nov–March. How many guests and preferred month?';
  }
  if (t.includes('thailand')) {
    return 'Thailand 6 days from ₹65,000/person 🌴 — Phuket beaches, Phi Phi Islands, night markets, Thai massage. Visa-on-arrival for Indians. Best: Nov–April. Share guest count and month!';
  }
  if (t.includes('goa')) {
    return 'Goa Beach 4 days 🌊 — North+South Goa, water sports (parasailing, jet ski), Fort Aguada, spice plantation. Flights from all major cities. When are you planning to visit and how many guests?';
  }
  if (t.includes('kerala') || t.includes('backwater') || t.includes('allepey') || t.includes('alleppey')) {
    return 'Kerala Backwaters 4 days 🌿 — overnight houseboat on Alleppey/Kumarakom backwaters, Kathakali show, Periyar wildlife. Perfect for families and couples. Which month and how many guests?';
  }
  if (t.includes('andaman')) {
    return 'Andaman 5 days 🐠 — Havelock Island (Radhanagar beach), Neil Island, scuba diving, glass-bottom boat, cellular jail. Best: Nov–May. Share travel dates and group size!';
  }
  if (t.includes('ajmer') || t.includes('dargah')) {
    return 'Ajmer Sharif Dargah 3 days 🌹 — Direct package from Kerala including train/flight, hotel, ziyarat, Pushkar visit. We arrange everything. What month and how many pilgrims?';
  }
  if (t.includes('tirupati') || t.includes('balaji')) {
    return 'Tirupati Balaji 3 days 🙏 — VIP darshan (skip the queue), accommodation near temple, prasadam. We handle all bookings. Share travel date and guest count!';
  }
  if (t.includes('urbania') || t.includes('van') || t.includes('vehicle') || t.includes('car hire') || t.includes('transfer')) {
    return 'Force Urbania 12-seater van 🚌 — Premium van with experienced driver. Airport transfers, pilgrimages, family trips, corporate travel across Kerala, Tamil Nadu, Karnataka. Share pickup city, destination, date and number of passengers for a quote!';
  }
  if (t.includes('scuba') || t.includes('dive') || t.includes('diving')) {
    return 'Scuba diving 🤿 — available in Lakshadweep (Bangaram/Kadmat) with PADI certified instructors. Beginner-friendly! Also available in Andaman. 3–4 nights minimum recommended. What\'s your diving experience level?';
  }
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
