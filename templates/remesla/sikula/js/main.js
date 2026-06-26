
(function () {
  'use strict';

  /* ---- NAV: scrolled stav + plovoucí CTA ---- */
  var nav = document.querySelector('.nav');
  var floatcta = document.querySelector('.floatcta');
  function onScroll() {
    var y = window.scrollY;
    if (nav) nav.classList.toggle('scrolled', y > 40);
    if (floatcta) floatcta.classList.toggle('show', y > 400);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---- Mobilní menu (burger) ---- */
  var burger = document.querySelector('.nav__burger');
  if (burger) {
    burger.addEventListener('click', function () {
      document.body.classList.toggle('menu-open');
    });
    document.querySelectorAll('.nav__links a').forEach(function (a) {
      a.addEventListener('click', function () { document.body.classList.remove('menu-open'); });
    });
  }

  /* ---- Scroll reveal ---- */
  var revEls = document.querySelectorAll('.reveal, .reveal-l, .reveal-r');
  if ('IntersectionObserver' in window && revEls.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('vis'); io.unobserve(e.target); }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
    revEls.forEach(function (el) { io.observe(el); });
  } else {
    revEls.forEach(function (el) { el.classList.add('vis'); });
  }

  /* ---- Menu taby (stránka menu) ---- */
  var tabs = document.querySelectorAll('.menu__tab');
  if (tabs.length) {
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        var id = tab.getAttribute('data-tab');
        tabs.forEach(function (t) { t.classList.toggle('active', t === tab); });
        document.querySelectorAll('.menu__panel').forEach(function (p) {
          p.style.display = (p.getAttribute('data-panel') === id) ? 'contents' : 'none';
        });
      });
    });
  }

  /* ---- Otevírací doba: zvýraznění dnešního dne (stránka kontakt) ---- */
  var hoursRows = document.querySelectorAll('.hours__row[data-days]');
  if (hoursRows.length) {
    var jsDay = new Date().getDay();          // 0 = Ne ... 6 = So
    var dayIdx = (jsDay + 6) % 7;             // 0 = Po ... 6 = Ne
    hoursRows.forEach(function (row) {
      var days = row.getAttribute('data-days').split(',').map(Number);
      if (days.indexOf(dayIdx) !== -1) row.classList.add('today');
    });
  }

  /* ---- Rezervační formulář (nefunkční demo) ---- */
  var rform = document.querySelector('.rform');
  if (rform) {
    rform.addEventListener('submit', function (e) {
      e.preventDefault();
      var done = rform.querySelector('.rform__done');
      if (done) done.classList.add('show');
      var btn = rform.querySelector('button[type="submit"]');
      if (btn) { btn.disabled = true; btn.style.opacity = '.5'; }
    });
  }

  /* ---- Galerie + lightbox (stránka galerie) ---- */
  var galItems = Array.prototype.slice.call(document.querySelectorAll('.gal__item'));
  var lb = document.querySelector('.lightbox');
  if (galItems.length && lb) {
    var lbPh = lb.querySelector('.lightbox__inner .ph');
    var lbCap = lb.querySelector('.lightbox__cap');
    var cur = 0;

    function classFromItem(item) {
      var inner = item.querySelector('.ph');
      var found = '';
      inner.classList.forEach(function (c) { if (/^ph-\d+$/.test(c)) found = c; });
      return found;
    }
    function show(i) {
      cur = (i + galItems.length) % galItems.length;
      var item = galItems[cur];
      lbPh.className = 'ph ' + classFromItem(item);
      var cap = item.getAttribute('data-cap') || '';
      if (lbCap) lbCap.textContent = cap;
    }
    function open(i) { show(i); lb.classList.add('open'); document.body.style.overflow = 'hidden'; }
    function close() { lb.classList.remove('open'); document.body.style.overflow = ''; }

    galItems.forEach(function (item, i) {
      item.addEventListener('click', function () { open(i); });
    });
    lb.querySelector('.lightbox__close').addEventListener('click', close);
    lb.querySelector('.lightbox__nav.prev').addEventListener('click', function () { show(cur - 1); });
    lb.querySelector('.lightbox__nav.next').addEventListener('click', function () { show(cur + 1); });
    lb.addEventListener('click', function (e) { if (e.target === lb) close(); });
    document.addEventListener('keydown', function (e) {
      if (!lb.classList.contains('open')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') show(cur - 1);
      if (e.key === 'ArrowRight') show(cur + 1);
    });
  }
})();
