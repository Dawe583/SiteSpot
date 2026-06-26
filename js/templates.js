/* SiteSpot — templates.js  v3.0 */
(function () {
  'use strict';

  const filters = document.querySelectorAll('.tpl-filter');
  const cards   = document.querySelectorAll('.tpl-card');

  filters.forEach(btn => {
    btn.addEventListener('click', () => {
      filters.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const cat = btn.dataset.filter;

      cards.forEach(card => {
        const matches = cat === 'all' || card.dataset.cat === cat;
        if (matches) {
          card.style.display = '';
          // Small delay so the reveal transition fires cleanly
          requestAnimationFrame(() => {
            requestAnimationFrame(() => card.classList.add('visible'));
          });
        } else {
          card.style.display = 'none';
        }
      });
    });
  });

})();
/* ── TEMPLATE CAROUSEL (izolováno, nezasahuje do filtrů ani cursor trackeru) ── */
(function () {
  'use strict';

  // ⚙️ Rychlost rotace (ms) — uprav podle potřeby
  const ROTATE_INTERVAL = 4000;

  const root = document.getElementById('tplCarousel');
  if (!root) return;

  const slides = Array.from(root.querySelectorAll('.tpl-carousel__slide'));
  if (slides.length < 2) return;

  const dotsWrap = root.querySelector('.tpl-carousel__dots');
  let index = slides.findIndex(s => s.classList.contains('is-active'));
  if (index < 0) index = 0;
  let timer = null;

  const dots = slides.map((_, i) => {
    if (!dotsWrap) return null;
    const dot = document.createElement('button');
    dot.className = 'tpl-carousel__dot' + (i === index ? ' is-active' : '');
    dot.type = 'button';
    dot.setAttribute('aria-label', 'Šablona ' + (i + 1));
    dot.addEventListener('click', () => { goTo(i); restart(); });
    dotsWrap.appendChild(dot);
    return dot;
  });

  function goTo(next) {
    slides[index].classList.remove('is-active');
    if (dots[index]) dots[index].classList.remove('is-active');
    index = (next + slides.length) % slides.length;
    slides[index].classList.add('is-active');
    if (dots[index]) dots[index].classList.add('is-active');
  }

  const advance = () => goTo(index + 1);

  function start() {
    if (timer) return;
    timer = setInterval(advance, ROTATE_INTERVAL);
  }
  function stop() {
    clearInterval(timer);
    timer = null;
  }
  const restart = () => { stop(); start(); };

  // UX: hover pozastaví, odjezd obnoví
  root.addEventListener('mouseenter', stop);
  root.addEventListener('mouseleave', start);

  // Pauza když není záložka aktivní
  document.addEventListener('visibilitychange', () =>
    document.hidden ? stop() : start());

  start();
})();