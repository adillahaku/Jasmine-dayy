document.addEventListener('DOMContentLoaded', () => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const items = [...document.querySelectorAll('.reveal-up, .reveal-clip, .reveal-fade, .reveal-image')];

  const animate = (el) => {
    if (!el || el.dataset.animated === '1') return;
    el.dataset.animated = '1';
    if (!reduceMotion) el.classList.add('enter');
  };

  requestAnimationFrame(() => {
    const cover = [...document.querySelectorAll('#s00 .reveal-up, #s00 .reveal-clip, #s00 .reveal-image')];
    cover.forEach((el, i) => setTimeout(() => animate(el), 80 + i * 180));
  });

  if (!reduceMotion && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        animate(entry.target);
        obs.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.01 });
    items.forEach(el => { if (!el.closest('#s00')) observer.observe(el); });
  }

  const navLinks = [...document.querySelectorAll('.nav-link, .mobile-nav a[data-section]')];
  const menuToggle = document.getElementById('navMenuToggle');
  const mobileNav = document.getElementById('mobileNav');
  const closeMobileNav = () => {
    if (!menuToggle || !mobileNav) return;
    menuToggle.classList.remove('is-open');
    menuToggle.setAttribute('aria-expanded', 'false');
    mobileNav.classList.remove('is-open');
    mobileNav.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('nav-open');
  };
  if (menuToggle && mobileNav) {
    menuToggle.addEventListener('click', () => {
      const open = !mobileNav.classList.contains('is-open');
      menuToggle.classList.toggle('is-open', open);
      menuToggle.setAttribute('aria-expanded', String(open));
      mobileNav.classList.toggle('is-open', open);
      mobileNav.setAttribute('aria-hidden', String(!open));
      document.body.classList.toggle('nav-open', open);
    });
    mobileNav.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMobileNav));
  }

  const sections = [...document.querySelectorAll('.section')];
  const progress = document.getElementById('progressLabel');
  const bar = document.querySelector('.site-bar');
  const colors = { paper:'#18345C', blue:'#FFFFFF', deep:'#FFFFFF', 'blue-deep':'#FFFFFF', light:'#18345C' };
  if ('IntersectionObserver' in window) {
    const sectionObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const i = sections.indexOf(entry.target);
        const theme = entry.target.dataset.theme || 'paper';
        if (progress) progress.textContent = String(i).padStart(2,'0');
        if (bar) {
          bar.style.color = colors[theme] || colors.paper;
          bar.classList.toggle('is-scrolled', i !== 0);
        }
        navLinks.forEach(link => link.classList.toggle('is-active', link.dataset.section === entry.target.id));
      });
    }, { rootMargin:'-42% 0px -42% 0px', threshold:0 });
    sections.forEach(s => sectionObserver.observe(s));
  }
});

/* Robust navbar navigation */
(function () {
  function initBirthdayNav() {
    const links = Array.from(document.querySelectorAll('nav a[href^="#"], header a[href^="#"], .nav a[href^="#"], .navbar a[href^="#"]'));
    if (!links.length) return;
    links.forEach(function (link) {
      link.addEventListener('click', function (e) {
        const href = link.getAttribute('href');
        if (!href || href === '#') return;
        const target = document.getElementById(decodeURIComponent(href.slice(1)));
        if (!target) return;
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        document.body.classList.remove('nav-open', 'menu-open');
        const menu = document.querySelector('.nav-menu, .navbar-menu, .mobile-menu');
        if (menu) menu.classList.remove('open', 'active');
      });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initBirthdayNav);
  else initBirthdayNav();
})();

/* Birthday music controller — single source of truth */
(function () {
  function initBirthdayMusic() {
    const audio = document.getElementById('birthdayMusic');
    const toggle = document.getElementById('musicToggle');
    const player = document.getElementById('musicPlayer');
    if (!audio || !toggle || !player) return;

    const state = player.querySelector('.music-player__state');
    const FADE_IN_MS = 2800;
    const FADE_OUT_MS = 650;
    const TARGET_VOLUME = 0.58;
    let fadeToken = 0;
    let stopTimer = null;

    audio.volume = 0;

    function updateUI(isPlaying) {
      toggle.setAttribute('aria-pressed', String(isPlaying));
      toggle.setAttribute('aria-label', isPlaying ? 'Pause music' : 'Play music');
      if (state) state.textContent = isPlaying ? 'ON' : 'OFF';
      player.classList.toggle('is-playing', isPlaying);
    }

    function cancelFade() { fadeToken += 1; }

    function fadeTo(target, duration) {
      cancelFade();
      const token = fadeToken;
      const start = audio.volume;
      const started = performance.now();
      return new Promise(resolve => {
        const step = now => {
          if (token !== fadeToken) return resolve(false);
          const t = Math.min(1, (now - started) / duration);
          const eased = 1 - Math.pow(1 - t, 3);
          audio.volume = Math.max(0, Math.min(1, start + (target - start) * eased));
          if (t < 1) requestAnimationFrame(step);
          else resolve(true);
        };
        requestAnimationFrame(step);
      });
    }

    async function startMusic() {
      if (stopTimer) { clearTimeout(stopTimer); stopTimer = null; }
      cancelFade();
      try {
        audio.volume = 0;
        if (audio.readyState < 2) audio.load();
        await audio.play();
        updateUI(true);
        fadeTo(TARGET_VOLUME, FADE_IN_MS);
        return true;
      } catch (error) {
        audio.pause();
        audio.volume = 0;
        updateUI(false);
        return false;
      }
    }

    function stopMusic() {
      if (audio.paused) { updateUI(false); return; }
      if (stopTimer) clearTimeout(stopTimer);
      fadeTo(0, FADE_OUT_MS);
      stopTimer = setTimeout(() => {
        cancelFade();
        audio.pause();
        audio.volume = 0;
        updateUI(false);
        stopTimer = null;
      }, FADE_OUT_MS + 30);
    }

    toggle.addEventListener('click', async (event) => {
      event.stopPropagation();
      if (audio.paused) await startMusic();
      else stopMusic();
    });

    toggle.addEventListener('dblclick', e => e.preventDefault());

    audio.addEventListener('play', () => updateUI(true));
    audio.addEventListener('pause', () => updateUI(false));
    audio.addEventListener('ended', () => { audio.currentTime = 0; updateUI(false); });
    audio.addEventListener('error', () => updateUI(false));

    window.startBirthdayMusic = startMusic;
    updateUI(false);

    // Do not start before the loading screen is entered. The loader calls
    // startBirthdayMusic() from the user's tap, which satisfies browser autoplay rules.
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initBirthdayMusic, { once:true });
  else initBirthdayMusic();
})();
