/* ═══════════════════════════════════════════════════════
   script.js — Pericles & Alessandra · 12/06
═══════════════════════════════════════════════════════ */

const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ══════════════════════════════════════
   CANVAS DE ESTRELAS (tela de entrada)
══════════════════════════════════════ */
function createStarfield(canvas, opts = {}) {
  if (!canvas || prefersReduced) return null;
  const { count = 90, color = '201,169,122', minR = 0.25, maxR = 2 } = opts;
  const ctx   = canvas.getContext('2d');
  const mouse = { x: -9999, y: -9999 };
  let stars = [], animId;

  function build(w, h) {
    return Array.from({ length: count }, () => ({
      x:     Math.random() * w,
      y:     Math.random() * h,
      r:     Math.random() * (maxR - minR) + minR,
      phase: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.018 + 0.006,
    }));
  }
  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const rect  = canvas.getBoundingClientRect();
    const w = Math.max(1, Math.floor(rect.width  * ratio));
    const h = Math.max(1, Math.floor(rect.height * ratio));
    if (canvas.width === w && canvas.height === h) return;
    canvas.width = w; canvas.height = h;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    stars = build(rect.width, rect.height);
  }
  function draw(t) {
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    for (const s of stars) {
      const d     = Math.hypot(s.x - mouse.x, s.y - mouse.y);
      const boost = d < 110 ? 0.35 : 0;
      const alpha = Math.min(1, ((Math.sin(t * s.speed + s.phase) + 1) / 2) * 0.75 + 0.15 + boost);
      ctx.fillStyle = `rgba(${color},${alpha.toFixed(3)})`;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
    }
    animId = requestAnimationFrame(draw);
  }
  function onMove(e) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left; mouse.y = e.clientY - rect.top;
  }
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  document.addEventListener('pointermove', onMove, { passive: true });
  resize();
  animId = requestAnimationFrame(draw);
  return { destroy() { cancelAnimationFrame(animId); ro.disconnect(); } };
}

/* ══════════════════════════════════════
   TELA DE ENTRADA + PORTA
══════════════════════════════════════ */
(function initEntry() {
  const entryScreen  = document.getElementById('entryScreen');
  const doorPanel    = document.getElementById('doorPanel');
  const doorInterior = document.getElementById('doorInteriorGroup');
  const doorShadow   = document.getElementById('doorOpenShadow');
  const dialPointer  = document.getElementById('dialPointer');
  const doorHoverZ   = document.getElementById('doorHoverZone');
  const doorHint     = document.getElementById('doorHint');
  const portalOverlay = document.getElementById('portalOverlay');
  const mainContent  = document.getElementById('mainContent');
  const audio        = document.getElementById('love-audio');
  const pauseBtn     = document.getElementById('pauseBtn');
  const floatChars   = document.querySelectorAll('.float-char');

  createStarfield(document.getElementById('entryStars'), {
    count: 130, color: '201,169,122', minR: 0.22, maxR: 2.2,
  });

  let opened = false;

  function openDoor() {
    if (opened) return;
    opened = true;

    if (doorHint) {
      doorHint.style.transition = 'opacity .3s ease';
      doorHint.style.opacity    = '0';
    }

    // Ponteiro do dial gira para verde
    if (!prefersReduced) dialPointer.classList.add('spinning');

    // Revela interior
    setTimeout(() => {
      doorInterior.style.transition = 'opacity .35s ease';
      doorInterior.style.opacity    = '1';
      doorShadow.style.transition   = 'opacity .35s ease .3s';
      doorShadow.style.opacity      = '0.75';
    }, 150);

    // Porta abre (dobradiças na esquerda)
    setTimeout(() => doorPanel.classList.add('swinging'), 300);

    // Música com fade-in
    audio.volume = 0;
    audio.play().then(() => {
      let v = 0;
      const fi = setInterval(() => {
        v = Math.min(0.45, v + 0.012);
        audio.volume = v;
        if (v >= 0.45) clearInterval(fi);
      }, 60);
      pauseBtn.removeAttribute('hidden');
      pauseBtn.classList.add('show');
    }).catch(() => {});

    // Portal zoom verde
    setTimeout(() => portalOverlay.classList.add('fire'), 750);

    // Revela conteúdo
    setTimeout(() => {
      mainContent.removeAttribute('aria-hidden');
      mainContent.classList.add('visible');
      entryScreen.classList.add('fade-out');
    }, 1000);

    // Limpa + mostra personagens + inicia slideshow
    setTimeout(() => {
      portalOverlay.classList.remove('fire');
      if (entryScreen.parentNode) entryScreen.remove();
      initScrollReveal();
      initSlideshow();
      floatChars.forEach((el, i) => {
        setTimeout(() => el.classList.add('visible'), i * 250);
      });
    }, 2000);
  }

  doorHoverZ.addEventListener('click', openDoor);
  document.addEventListener('keydown', e => {
    if (!opened && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openDoor(); }
  });
})();

/* ══════════════════════════════════════
   SLIDESHOW
══════════════════════════════════════ */
function initSlideshow() {
  const slides    = Array.from(document.querySelectorAll('.slide'));
  const dotsWrap  = document.getElementById('ssDots');
  const btnPrev   = document.getElementById('ssPrev');
  const btnNext   = document.getElementById('ssNext');
  const ssEl      = document.getElementById('slideshow');

  if (!slides.length) return;

  let current   = 0;
  let autoTimer = null;
  const DELAY   = 4000; // ms por slide

  /* Criar dots */
  slides.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.className   = 'ss-dot' + (i === 0 ? ' active' : '');
    dot.setAttribute('aria-label', `Foto ${i + 1}`);
    dot.addEventListener('click', () => goTo(i));
    dotsWrap.appendChild(dot);
  });

  function getDots() { return Array.from(dotsWrap.querySelectorAll('.ss-dot')); }

  function goTo(index, fromAuto = false) {
    if (index === current) return;
    slides[current].classList.remove('active');
    slides[current].setAttribute('aria-hidden', 'true');
    getDots()[current].classList.remove('active');

    current = (index + slides.length) % slides.length;

    slides[current].classList.add('active');
    slides[current].setAttribute('aria-hidden', 'false');
    getDots()[current].classList.add('active');

    if (!fromAuto) resetAuto();
  }

  function next() { goTo(current + 1); }
  function prev() { goTo(current - 1); }

  function startAuto() {
    if (prefersReduced) return;
    autoTimer = setInterval(() => goTo(current + 1, true), DELAY);
  }
  function resetAuto() {
    clearInterval(autoTimer);
    startAuto();
  }

  btnNext.addEventListener('click', next);
  btnPrev.addEventListener('click', prev);

  /* Teclado */
  document.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') next();
    if (e.key === 'ArrowLeft')  prev();
  });

  /* Swipe touch no card */
  const wrapper = document.querySelector('.slideshow-wrapper') || ssEl;
  let touchStartX = null;
  wrapper.addEventListener('touchstart', e => {
    touchStartX = e.touches[0].clientX;
  }, { passive: true });
  wrapper.addEventListener('touchend', e => {
    if (touchStartX === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 40) dx < 0 ? next() : prev();
    touchStartX = null;
  }, { passive: true });

  /* Pausar autoplay ao hover no card */
  wrapper.addEventListener('mouseenter', () => clearInterval(autoTimer));
  wrapper.addEventListener('mouseleave', startAuto);

  startAuto();
}

/* ══════════════════════════════════════
   SCROLL REVEAL
══════════════════════════════════════ */
function initScrollReveal() {
  const items = document.querySelectorAll('.main-content .reveal');
  if (prefersReduced) { items.forEach(el => el.classList.add('is-visible')); return; }

  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const siblings = Array.from(entry.target.parentElement?.querySelectorAll('.reveal') || []);
      const delay = Math.max(0, siblings.indexOf(entry.target)) * 80;
      setTimeout(() => entry.target.classList.add('is-visible'), delay);
      obs.unobserve(entry.target);
    });
  }, { threshold: 0.08 });

  items.forEach(el => {
    if (el.getBoundingClientRect().top < window.innerHeight * 0.95)
      el.classList.add('is-visible');
    else
      obs.observe(el);
  });
}

/* ══════════════════════════════════════
   ENVELOPE / CARTA
══════════════════════════════════════ */
(function initEnvelope() {
  const env    = document.querySelector('.envelope');
  const letter = document.querySelector('.letter');
  if (!env || !letter) return;

  env.addEventListener('click', () => {
    const isOpen = env.classList.toggle('open');
    env.setAttribute('aria-expanded', String(isOpen));
    if (isOpen) letter.removeAttribute('hidden');
    else        letter.setAttribute('hidden', '');
  });
})();

/* ══════════════════════════════════════
   MÚSICA
══════════════════════════════════════ */
(function initAudio() {
  const audio = document.getElementById('love-audio');
  const btn   = document.getElementById('pauseBtn');
  if (!audio || !btn) return;

  btn.addEventListener('click', async () => {
    try { if (audio.paused) await audio.play(); else audio.pause(); } catch {}
  });
  audio.addEventListener('play',  () => { btn.classList.remove('paused'); btn.setAttribute('aria-label','Pausar música'); });
  audio.addEventListener('pause', () => { btn.classList.add('paused');    btn.setAttribute('aria-label','Tocar música');  });
})();
