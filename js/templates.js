/* SiteSpot — templates.js  v5.0
   Filters · Modal · Orbit 3D Carousel (Framer-style)       */

/* ── TEMPLATE FILTERS ──────────────────────────────────────
   Scoped to .tpl-grid so orbit items stay untouched         */
(function () {
  'use strict';

  var filters = document.querySelectorAll('.tpl-filter');
  var cards   = document.querySelectorAll('.tpl-grid .tpl-card');

  filters.forEach(function (btn) {
    btn.addEventListener('click', function () {
      filters.forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');

      var cat = btn.dataset.filter;

      cards.forEach(function (card) {
        var matches = cat === 'all' || card.dataset.cat === cat;
        if (matches) {
          card.style.display = '';
          requestAnimationFrame(function () {
            requestAnimationFrame(function () { card.classList.add('visible'); });
          });
        } else {
          card.classList.remove('visible');
          card.style.display = 'none';
        }
      });
    });
  });
})();


/* ── TEMPLATE MODAL ────────────────────────────────────────
   Shared by orbit AND grid cards                            */
(function () {
  'use strict';

  var modal = document.getElementById('tplModal');
  if (!modal) return;

  var frame    = document.getElementById('tplModalFrame');
  var urlEl    = document.getElementById('tplModalUrl');
  var openLink = document.getElementById('tplModalOpen');

  function open(url, title, host) {
    if (!url) return;
    if (frame)    frame.src = url;
    if (urlEl)    urlEl.textContent = host || url;
    if (openLink) openLink.href = url;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function close() {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (frame) setTimeout(function () { frame.src = 'about:blank'; }, 400);
  }

  var backdrop = modal.querySelector('.tpl-modal__backdrop');
  if (backdrop) backdrop.addEventListener('click', close);

  var closeBtn = modal.querySelector('.tpl-modal__close');
  if (closeBtn) closeBtn.addEventListener('click', close);

  document.querySelectorAll('[data-tpl-close]').forEach(function (el) {
    el.addEventListener('click', close);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') close();
  });

  /* expose for orbit IIFE */
  window.__tplModal = { open: open, close: close };

  /* wire existing grid cards */
  document.querySelectorAll('.tpl-grid .tpl-card').forEach(function (card) {
    card.style.cursor = 'pointer';
    card.addEventListener('click', function (e) {
      if (e.target.closest('a[href]')) return;
      open(card.dataset.url, card.dataset.title, card.dataset.host);
    });
  });
})();


/* ── ORBIT 3D CAROUSEL ─────────────────────────────────────
   Framer-style momentum ring with mouse parallax.
   Builds 8 diverse cards from grid data automatically.
   Fully isolated — no conflict with cursor tracker.         */
(function () {
  'use strict';

  /* ⚙️  CONFIG ─────────────────────────────────────────── */
  var AUTO_SPEED     = 0.10;   /* deg / frame  (auto-spin)  */
  var AUTO_RESUME_MS = 2500;   /* ms until auto resumes     */
  var SCROLL_SPEED   = 0.04;   /* wheel → momentum factor   */
  var DRAG_SPEED     = 0.30;   /* mouse-drag sensitivity    */
  var TOUCH_SPEED    = 0.30;   /* touch-swipe sensitivity   */
  var MOMENTUM_DECAY = 0.92;   /* friction  (0 = instant)   */
  var MOUSE_TILT     = 8;      /* parallax intensity (deg)  */
  var BASE_TILT      = -12;    /* default X tilt            */
  var PERSPECTIVE    = 1400;   /* px                        */
  var RADIUS_LG      = 580;    /* ≥ 769 px viewport         */
  var RADIUS_MD      = 380;    /* ≤ 768 px                  */
  var RADIUS_SM      = 280;    /* ≤ 480 px                  */
  var MAX_ITEMS      = 8;      /* cards in the orbit        */
  /* ──────────────────────────────────────────────────────── */

  var scene = document.getElementById('tplOrbitScene');
  var tilt  = document.getElementById('tplOrbitTilt');
  var ring  = document.getElementById('tplOrbitRing');
  if (!scene || !tilt || !ring) return;

  /* ── Pick 8 diverse cards (round-robin across categories) */
  var gridCards = [];
  document.querySelectorAll('.tpl-grid .tpl-card').forEach(function (c) {
    gridCards.push(c);
  });
  if (gridCards.length < 2) return;

  var byCat = {};
  gridCards.forEach(function (c) {
    var cat = c.dataset.cat;
    if (!byCat[cat]) byCat[cat] = [];
    byCat[cat].push(c);
  });
  var cats = Object.keys(byCat);
  var selected = [];
  var rnd = 0;
  while (selected.length < MAX_ITEMS && rnd < 20) {
    for (var ci = 0; ci < cats.length; ci++) {
      if (selected.length >= MAX_ITEMS) break;
      if (byCat[cats[ci]][rnd]) selected.push(byCat[cats[ci]][rnd]);
    }
    rnd++;
  }

  var N    = selected.length;
  var STEP = 360 / N;            /* 45° for 8 items */
  var items = [];

  function getRadius() {
    var w = window.innerWidth;
    return w <= 480 ? RADIUS_SM : w <= 768 ? RADIUS_MD : RADIUS_LG;
  }

  /* ── Build orbit item DOM ── */
  selected.forEach(function (card, i) {
    var el      = document.createElement('div');
    el.className = 'tpl-card tpl-orbit__item';
    el.dataset.url   = card.dataset.url   || '';
    el.dataset.title = card.dataset.title || '';
    el.dataset.host  = card.dataset.host  || '';
    el.dataset.cat   = card.dataset.cat   || '';

    var catNode  = card.querySelector('.tpl-card__cat');
    var nameNode = card.querySelector('.tpl-card__name');
    var catText  = catNode  ? catNode.textContent  : '';
    var fullName = nameNode ? nameNode.textContent : '';

    /* split on em-dash */
    var parts = fullName.split('\u2014');
    if (parts.length < 2) parts = fullName.split('—');
    var shortName = (parts[0] || '').trim();
    var sub       = (parts[1] || '').trim();
    var host      = card.dataset.host || '';

    el.innerHTML =
      '<div class="tpl-orbit__card">' +
        '<div class="tpl-orbit__bar">' +
          '<span class="tpl-orbit__dots"><i></i><i></i><i></i></span>' +
          '<span class="tpl-orbit__url">' + host + '</span>' +
        '</div>' +
        '<div class="tpl-orbit__body">' +
          '<span class="tpl-orbit__cat-badge">' + catText + '</span>' +
          '<h3 class="tpl-orbit__title">' + shortName + '</h3>' +
          (sub ? '<p class="tpl-orbit__sub">' + sub + '</p>' : '') +
        '</div>' +
      '</div>';

    var R = getRadius();
    el.style.transform =
      'rotateY(' + (i * STEP) + 'deg) translateZ(' + R + 'px)';

    ring.appendChild(el);
    items.push(el);
  });

  /* ── State ── */
  var rotation   = 0;
  var momentum   = 0;
  var mouseNX    = 0, mouseNY = 0;     /* normalised -1…1 */
  var smoothMX   = 0, smoothMY = 0;
  var hovered    = false;
  var dragging   = false;
  var dragLastX  = 0;
  var dragDist   = 0;                   /* px moved while button down */
  var autoActive = true;
  var resumeT    = null;

  function pauseAuto() {
    autoActive = false;
    clearTimeout(resumeT);
    resumeT = setTimeout(function () {
      if (!hovered && !dragging) autoActive = true;
    }, AUTO_RESUME_MS);
  }

  /* ── Scroll wheel (momentum) ── */
  scene.addEventListener('wheel', function (e) {
    e.preventDefault();
    momentum += e.deltaY * SCROLL_SPEED;
    pauseAuto();
  }, { passive: false });

  /* ── Mouse drag ── */
  scene.addEventListener('mousedown', function (e) {
    e.preventDefault();
    dragging  = true;
    dragLastX = e.clientX;
    dragDist  = 0;
  });

  window.addEventListener('mousemove', function (e) {
    /* parallax (always) */
    mouseNX =  (e.clientX / window.innerWidth)  * 2 - 1;
    mouseNY = -((e.clientY / window.innerHeight) * 2 - 1);

    if (dragging) {
      var dx = e.clientX - dragLastX;
      dragDist += Math.abs(dx);
      rotation += dx * DRAG_SPEED;
      dragLastX = e.clientX;
      pauseAuto();
    }
  });

  window.addEventListener('mouseup', function () {
    dragging = false;
  });

  /* ── Hover ── */
  scene.addEventListener('mouseenter', function () {
    hovered = true;
    autoActive = false;
    clearTimeout(resumeT);
  });
  scene.addEventListener('mouseleave', function () {
    hovered  = false;
    dragging = false;
    /* resume auto after leave */
    resumeT = setTimeout(function () {
      autoActive = true;
    }, AUTO_RESUME_MS);
  });

  /* ── Touch ── */
  var touchX = 0;
  scene.addEventListener('touchstart', function (e) {
    touchX = e.touches[0].clientX;
    dragDist = 0;
    pauseAuto();
  }, { passive: true });

  scene.addEventListener('touchmove', function (e) {
    var dx = e.touches[0].clientX - touchX;
    dragDist += Math.abs(dx);
    rotation += dx * TOUCH_SPEED;
    touchX = e.touches[0].clientX;
    e.preventDefault();
  }, { passive: false });

  scene.addEventListener('touchend', function () {
    resumeT = setTimeout(function () {
      autoActive = true;
    }, AUTO_RESUME_MS);
  }, { passive: true });

  /* ── Click (ignore drags) ── */
  scene.addEventListener('click', function (e) {
    if (dragDist > 6) return;            /* was a drag, skip */
    var item = e.target.closest('.tpl-orbit__item');
    if (!item) return;
    if (window.__tplModal) {
      window.__tplModal.open(
        item.dataset.url,
        item.dataset.title,
        item.dataset.host
      );
    }
  });

  /* ── Animation loop ── */
  function animate() {
    /* auto-spin */
    if (autoActive && !dragging) {
      rotation += AUTO_SPEED;
    }

    /* momentum from scroll */
    if (Math.abs(momentum) > 0.01) {
      rotation += momentum;
      momentum *= MOMENTUM_DECAY;
    } else {
      momentum = 0;
    }

    /* smooth parallax */
    smoothMX += (mouseNX - smoothMX) * 0.06;
    smoothMY += (mouseNY - smoothMY) * 0.06;

    /* apply transforms (tilt ≠ rotation → separated) */
    tilt.style.transform =
      'rotateX(' + (BASE_TILT + smoothMY * MOUSE_TILT) + 'deg) ' +
      'rotateY(' + (smoothMX * MOUSE_TILT) + 'deg)';

    ring.style.transform = 'rotateY(' + rotation + 'deg)';

    requestAnimationFrame(animate);
  }

  /* ── Resize ── */
  var resizeT;
  window.addEventListener('resize', function () {
    clearTimeout(resizeT);
    resizeT = setTimeout(function () {
      var R = getRadius();
      for (var k = 0; k < items.length; k++) {
        items[k].style.transform =
          'rotateY(' + (k * STEP) + 'deg) translateZ(' + R + 'px)';
      }
    }, 200);
  });

  /* ── Visibility API ── */
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { autoActive = false; }
    else { autoActive = true; }
  });

  /* ── Init ── */
  animate();
})();