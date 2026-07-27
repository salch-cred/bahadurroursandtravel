// site-ui.js — shared UI for every visitor page (v3)
(function () {
  'use strict';

  /* ═══════════════════════════════════════════════════════
     1. MOBILE NAV OVERLAY
     Overlay appended to <body> — NOT inside .nav
     (.nav has backdrop-filter which breaks fixed children)
  ═══════════════════════════════════════════════════════ */
  const nav   = document.querySelector('.nav');
  const links = nav && nav.querySelector('.nav-links');

  // Remove any stale hamburger buttons from old site-ui versions
  if (nav) {
    nav.querySelectorAll('.menu, .mob-burger, .nav-hamburger').forEach(el => el.remove());
  }
  // Remove any stale overlay from previous run
  document.querySelectorAll('.mob-nav-overlay').forEach(el => el.remove());

  if (nav && links) {
    // Build overlay on <body>
    const overlay = document.createElement('div');
    overlay.className = 'mob-nav-overlay';
    overlay.id = 'mob-nav-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-label', 'Navigation');

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'mob-nav-close';
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', 'Close menu');
    closeBtn.innerHTML = '<i class="hgi-stroke hgi-cancel-01"></i>';

    // Clone nav links into overlay
    const cloned = links.cloneNode(true);
    cloned.className = 'mob-nav-links';

    overlay.appendChild(closeBtn);
    overlay.appendChild(cloned);
    document.body.appendChild(overlay);

    // Hamburger button inside nav
    const burger = document.createElement('button');
    burger.className = 'mob-burger';
    burger.type = 'button';
    burger.setAttribute('aria-label', 'Open menu');
    burger.setAttribute('aria-expanded', 'false');
    burger.innerHTML = '<i class="hgi-stroke hgi-menu-01"></i>';
    nav.appendChild(burger);

    const open  = () => {
      overlay.classList.add('is-open');
      overlay.setAttribute('aria-hidden', 'false');
      burger.setAttribute('aria-expanded', 'true');
      document.body.classList.add('mob-nav-active');
    };
    const close = () => {
      overlay.classList.remove('is-open');
      overlay.setAttribute('aria-hidden', 'true');
      burger.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('mob-nav-active');
    };

    burger.addEventListener('click', () =>
      overlay.classList.contains('is-open') ? close() : open()
    );
    closeBtn.addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
    cloned.querySelectorAll('a').forEach(a => a.addEventListener('click', close));
  }

  /* ═══════════════════════════════════════════════════════
     2. WHATSAPP STICKY BUTTON
  ═══════════════════════════════════════════════════════ */
  if (!document.querySelector('.wa-sticky')) {
    const wa = document.createElement('a');
    wa.href = 'https://wa.me/919187440916?text=Hi%20Bahadur%20Tours%2C%20I%27d%20like%20to%20enquire%20about%20a%20trip.';
    wa.className = 'wa-sticky';
    wa.target = '_blank';
    wa.rel = 'noopener noreferrer';
    wa.setAttribute('aria-label', 'Chat on WhatsApp');
    wa.innerHTML = '<i class="hgi-stroke hgi-whatsapp"></i>';
    document.body.appendChild(wa);
  }

})();
