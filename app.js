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
function addChatMessage(role, content) {
  if (!chat) return;
  const paragraph = document.createElement('p');
  paragraph.className = role === 'user' ? 'user' : 'bot';
  paragraph.textContent = content;
  chat.appendChild(paragraph);
  chat.scrollTop = chat.scrollHeight;
}
function localTravelReply(message) {
  const text = message.toLowerCase();
  if (text.includes('scuba')) return 'For scuba, allow 3–4 nights so weather does not rush the dive. Share your dates, group size and whether everyone is a beginner.';
  if (text.includes('family') || text.includes('child')) return 'For a family trip, I recommend shorter transfers, a relaxed island day and age-appropriate activities. What are the children’s ages and your travel dates?';
  if (text.includes('urbania') || text.includes('car')) return 'The Force Urbania works well for group transfers and longer journeys. Share pickup city, date and passenger count.';
  if (/book|reserve|confirm/.test(text)) return 'I’ve opened the secure booking form. Submit it and the team will automatically receive email and WhatsApp notifications.';
  return 'Share your destination, dates, departure city, guest count and approximate budget. I’ll suggest a practical starting itinerary.';
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
