// Shared parts of every visitor page: navigation, footer, booking window, AI panel, reveals, lightbox.
(function () {
  'use strict';
  const WA = '919187440916';
  const LOGO = 'assets/brand/bahadur-logo.png';
  const ICON_WA = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.26-.46-2.39-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.08-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.87 1.21 3.07c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.7.62.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35M12.05 21.8h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.89-9.88 2.64 0 5.12 1.03 6.99 2.9a9.82 9.82 0 0 1 2.89 6.99c0 5.45-4.44 9.88-9.88 9.88M20.46 3.49A11.82 11.82 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.88 11.88 0 0 0 5.68 1.45h.01c6.55 0 11.89-5.34 11.89-11.89 0-3.18-1.24-6.17-3.48-8.42"/></svg>';
  const ICON_IG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.3" cy="6.7" r=".6" fill="currentColor"/></svg>';
  const PLANE = '<svg viewBox="0 0 320 110" fill="none" aria-hidden="true"><path d="M8 62c0-8 10-14 24-15l212-9c26-1 46 5 62 15 8 5 8 11 0 14-40 12-110 16-196 14l-74-3C22 77 8 70 8 62Z" fill="#fff"/><path d="M286 44c7 2 15 5 20 9-7 3-17 3-25 1 0-4 2-8 5-10Z" fill="#9ad4f5"/><path d="M60 56 214 51" stroke="#0ea5e9" stroke-width="3" stroke-dasharray="6 6"/><path d="M40 47 14 6c-1-3 1-5 4-5l14 1 34 45H40Z" fill="#0ea5e9"/><path d="M28 50 4 42c-3-1-3-4 0-4l10-1 28 11-14 2Z" fill="#dbeafe"/><path d="M178 70 118 106c-2 1-5 1-7 0l-8-3 32-33h43Z" fill="#dbe8f2"/><path d="M160 46 124 26c-2-1-5-1-7 0l-5 2 26 18h22Z" fill="#c8d9e6"/><rect x="128" y="82" width="26" height="11" rx="5.5" fill="#94a9bb"/></svg>';

  const page = (location.pathname.split('/').pop() || 'index').replace('.html', '') || 'index';
  const links = [['index', 'index.html', 'Home'], ['booking', 'booking.html', 'Packages'], ['umrah', 'umrah.html', 'Umrah'], ['explore', 'explore.html', 'Explore'], ['community', 'community.html', 'Guest stories'], ['blog', 'blog.html', 'Travel guides']];

  document.documentElement.classList.toggle('can-animate', !matchMedia('(prefers-reduced-motion: reduce)').matches);

  const nav = document.createElement('header');
  nav.className = 'site-nav';
  nav.innerHTML = `<div class="nav-bar"><a class="nav-logo" href="index.html" aria-label="Bahadur Tours and Travels home"><img src="${LOGO}" alt="Bahadur Tours and Travels" width="75" height="50"></a><nav class="nav-links" aria-label="Main">${links.map(([key, href, label]) => `<a href="${href}" class="${key === page ? 'active' : ''}">${label}</a>`).join('')}</nav><div class="nav-cta"><button class="btn btn-sky small" data-book>Plan trip</button><button class="nav-burger" aria-label="Open menu"><i class="hgi-stroke hgi-menu-01"></i></button></div></div>`;
  document.body.prepend(nav);

  const mob = document.createElement('div');
  mob.className = 'mob-nav';
  mob.setAttribute('aria-hidden', 'true');
  mob.innerHTML = `<button class="close" aria-label="Close menu"><i class="hgi-stroke hgi-cancel-01"></i></button>${links.map(([, href, label], i) => `<a class="big" href="${href}" style="transition-delay:${i * 45}ms">${label}</a>`).join('')}<div class="foot"><button class="btn btn-white" data-book>Plan my trip</button><a class="btn btn-wa" href="https://wa.me/${WA}">WhatsApp us</a></div>`;
  document.body.append(mob);
  const toggleMenu = (open) => { mob.classList.toggle('open', open); mob.setAttribute('aria-hidden', String(!open)); document.body.classList.toggle('modal-open', open); };
  nav.querySelector('.nav-burger').onclick = () => toggleMenu(true);
  mob.querySelector('.close').onclick = () => toggleMenu(false);
  mob.addEventListener('click', (e) => { if (e.target.closest('a,[data-book]')) toggleMenu(false); });

  let lastY = 0;
  addEventListener('scroll', () => {
    const y = scrollY;
    nav.classList.toggle('hide', y > 500 && y > lastY + 4 && !document.body.classList.contains('keep-nav'));
    if (y < lastY - 4 || y < 500) nav.classList.remove('hide');
    lastY = y;
  }, { passive: true });

  const footHost = document.getElementById('site-footer');
  if (footHost) {
    const stickers = [
      ['sun', 28, 74, 6, 3, 1], ['sun', 74, 78, 5, 2, 1], ['puff', 7, 76, 9, 2, 1], ['puff', 49, 88, 8, 2.4, 1], ['puff', 88, 78, 10, 1.6, 1],
      ['eiffel', 0, 22, 15, 1.5, 2], ['mysore', 13, 27, 24, 1.9, 2], ['taj', 35, 26, 29, 1.1, 3], ['mosque', 59, 25, 25, 1.7, 2], ['burj', 82, 21, 18, 1.3, 2],
      ['island', -3, -4, 26, 0.6, 5], ['gateway', 20, -8, 23, 0.9, 6], ['kashmir', 41, -4, 27, 0.5, 5], ['houseboat', 66, -3, 33, 0.7, 6], ['sailboat', 60, 15, 6, 1.2, 7],
    ];
    footHost.outerHTML = `<section class="ft-cta" id="plan">
      <img class="ft-art" src="assets/stickers/island.webp" alt="" loading="lazy">
      <h2 data-reveal>Let’s make this trip yours</h2>
      <form class="ft-box" id="ft-plan" data-reveal>
        <textarea id="ft-text" rows="3" aria-label="Tell us about your trip" placeholder="I’m planning a 5-day family trip to Lakshadweep in December. We love snorkelling, quiet beaches and good food…"></textarea>
        <div><a class="ft-wa" href="https://wa.me/${WA}" target="_blank" rel="noopener" aria-label="Chat on WhatsApp">${ICON_WA}</a><button class="btn btn-sky" type="submit">Plan my trip</button></div>
      </form>
    </section>
    <footer class="ft">
      <div class="wrap ft-links">
        <div class="ft-brand"><a href="index.html"><img src="${LOGO}" alt="Bahadur Tours and Travels" width="170" height="114" loading="lazy"></a><p>Travel planning, made personal.</p><div class="ft-social"><a href="https://wa.me/${WA}" target="_blank" rel="noopener" aria-label="WhatsApp">${ICON_WA}</a><a href="https://www.instagram.com/bahadurtours_travels/" target="_blank" rel="noopener" aria-label="Instagram">${ICON_IG}</a></div></div>
        <div><h4>Explore</h4><a href="booking.html">All packages</a><a href="package.html?slug=island-escape">Lakshadweep</a><a href="umrah.html">Umrah</a><a href="booking.html?filter=international">International</a><a href="booking.html?filter=transport">Force Urbania hire</a></div>
        <div><h4>Company</h4><a href="explore.html">Explore Agatti</a><a href="community.html">Guest stories</a><a href="blog.html">Travel guides</a><a href="https://www.instagram.com/bahadurtours_travels/" target="_blank" rel="noopener">Instagram</a><a href="admin.html">Staff sign in</a></div>
        <div><h4>Contact</h4><a href="tel:+919187440916">+91 91874 40916</a><a href="mailto:bahadurtourstravels@gmail.com">Email us</a><a href="terms.html">Terms</a><a href="terms.html#privacy">Privacy</a></div>
      </div>
      <div class="ft-copy wrap">© ${new Date().getFullYear()} Bahadur Tours and Travels. All rights reserved.</div>
      <div class="skyline" aria-hidden="true"><div class="sky-in">
        <img class="stk-plane" src="assets/stickers/plane.webp" alt="" decoding="sync">
        ${stickers.map(([name, left, bottom, width, depth, z], i) => `<div class="stk stk-${name}" data-depth="${depth}" style="left:${left}%;bottom:${bottom}%;width:${width}%;z-index:${z}"><img src="assets/stickers/${name}.webp" alt="" draggable="false" decoding="sync" style="--t:${3.4 + (i % 5) * 0.7}s;--d:-${(i * 0.9).toFixed(1)}s"></div>`).join('')}
      </div></div>
    </footer>`;
  }

  const wa = document.createElement('a');
  wa.className = 'fab-wa';
  wa.href = `https://wa.me/${WA}?text=${encodeURIComponent("Hi Bahadur Tours, I'd like to enquire about a trip.")}`;
  wa.target = '_blank';
  wa.rel = 'noopener';
  wa.setAttribute('aria-label', 'Chat on WhatsApp');
  wa.innerHTML = ICON_WA;
  document.body.append(wa);

  document.body.insertAdjacentHTML('beforeend', `
  <div class="modal" id="booking-modal" role="dialog" aria-modal="true" aria-labelledby="bk-title"><div class="modal-card">
    <button class="modal-x" data-close aria-label="Close"><i class="hgi-stroke hgi-cancel-01"></i></button>
    <div id="bk-form-wrap"><h2 id="bk-title">Plan your trip</h2><p>Share a few details. We'll reply with a clear plan and price.</p>
    <form id="booking-form"><div class="f-grid">
      <label class="f">Full name<input name="name" required autocomplete="name"></label>
      <label class="f">WhatsApp number<input name="phone" required placeholder="+91" autocomplete="tel"></label>
      <label class="f full">Where would you like to go?<input name="trip" id="trip-input" list="trip-options" required placeholder="Lakshadweep, Umrah, Kashmir…"></label>
      <label class="f">Email<input name="email" type="email" autocomplete="email"></label>
      <label class="f">Travel date<input name="date" type="date"></label>
      <label class="f">Guests<select name="guests"><option>1 guest</option><option selected>2 guests</option><option>3 guests</option><option>4 guests</option><option>5 guests</option><option>6 guests</option><option>7–10 guests</option><option>10+ guests</option></select></label>
      <label class="f">Starting city<input name="city" placeholder="Kochi" autocomplete="address-level2"></label>
      <label class="f full">Anything we should know?<textarea name="note" placeholder="Budget, children, room type, special requests"></textarea></label>
    </div><label class="f-check"><input type="checkbox" required> <span>I agree to the <a href="terms.html" target="_blank">terms and conditions</a>.</span></label>
    <button class="btn btn-sky" type="submit" style="width:100%">Send trip request <i class="hgi-stroke hgi-arrow-right-01"></i></button><p class="f-note">No payment now. Our team replies within 2 hours.</p></form></div>
    <div class="done" id="bk-done" hidden><i class="hgi-stroke hgi-checkmark-circle-02"></i><h2>Request received</h2><p style="color:var(--muted);margin:8px 0">Your reference is <code id="bk-ref"></code></p><p style="color:var(--muted)">Send it on WhatsApp now for the fastest reply.</p><div class="row"><a class="btn btn-wa" id="bk-wa" target="_blank" rel="noopener">Continue on WhatsApp</a><button class="btn btn-line" data-close>Done</button></div></div>
  </div></div><datalist id="trip-options"></datalist>
  <button class="ai-fab" id="ai-open" aria-label="Open AI travel assistant"><i class="hgi-stroke hgi-ai-chat-02"></i><span>Ask Bahadur AI</span></button>
  <aside class="ai-panel" id="ai-panel" aria-label="AI travel assistant" aria-hidden="true">
    <div class="ai-head"><div><strong>Bahadur AI</strong><small>Ask about packages, prices or itineraries</small></div><button class="ai-x" id="ai-close" aria-label="Close chat"><i class="hgi-stroke hgi-cancel-01"></i></button></div>
    <div class="chat" id="ai-messages"><div class="ai-msg ai-msg-bot">Hello! Tell me your dates, group size and where you dream of going.</div></div>
    <div class="ai-chips"><button class="ai-chip" data-q="Tell me about Lakshadweep packages">Lakshadweep</button><button class="ai-chip" data-q="What are your Umrah packages and prices?">Umrah</button><button class="ai-chip" data-q="Tell me about Kashmir tour packages">Kashmir</button><button class="ai-chip" data-q="What are your budget-friendly packages?">Budget</button></div>
    <form id="chat-form"><input id="ai-input" placeholder="e.g. Umrah for 2 in December" autocomplete="off" aria-label="Your message"><button id="ai-send" type="submit" aria-label="Send">↑</button></form>
  </aside>
  <div class="lightbox" id="lightbox"><button aria-label="Close">×</button><img alt=""></div>`);

  const lb = document.getElementById('lightbox');
  window.openLightbox = (src, alt = '') => { lb.querySelector('img').src = src; lb.querySelector('img').alt = alt; lb.classList.add('show'); };
  lb.addEventListener('click', () => lb.classList.remove('show'));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') lb.classList.remove('show'); });
  document.addEventListener('click', (e) => { const b = e.target.closest('[data-zoom]'); if (b) window.openLightbox(b.dataset.zoom, b.dataset.alt || ''); });

  // Reveal on scroll. Dynamic content calls window.observeReveals() after it renders.
  const io = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 }) : null;
  window.observeReveals = (root = document) => {
    root.querySelectorAll('[data-reveal]:not(.in)').forEach((el) => { if (io) io.observe(el); else el.classList.add('in'); });
  };
  window.observeReveals();

  // Reels stay hidden until the admin adds some
  (async () => {
    const section = document.getElementById('reels-section'), host = document.getElementById('reels-container');
    if (!section || !host) return;
    try {
      const res = await fetch('/api/media?type=reels');
      if (!res.ok) return;
      const { reels = [] } = await res.json();
      if (!reels.length) return;
      const safe = (v) => String(v || '').replace(/[&<>"']/g, '');
      host.innerHTML = reels.map((r) => `<div class="reel"><video src="${safe(r.video_url)}" loop playsinline muted autoplay preload="metadata"></video>${r.title ? `<b>${safe(r.title)}</b>` : ''}<button aria-label="Toggle sound"><i class="hgi-stroke hgi-volume-off"></i></button></div>`).join('');
      host.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        const video = btn.parentElement.querySelector('video'), turnOn = video.muted;
        host.querySelectorAll('video').forEach((v) => { v.muted = true; });
        host.querySelectorAll('button i').forEach((i) => { i.className = 'hgi-stroke hgi-volume-off'; });
        video.muted = !turnOn;
        if (turnOn) btn.querySelector('i').className = 'hgi-stroke hgi-volume-high';
      });
      section.hidden = false;
    } catch {}
  })();

  window.BAHADUR = { WA, PLANE };
})();
