(() => {
  'use strict';
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.main-nav');
  const mobile = window.matchMedia('(max-width: 900px)');
  if (toggle && nav) {
    // Without JavaScript, the static navigation stays visible.
    const close = (returnFocus = false) => {
      nav.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Open navigation');
      if (returnFocus) toggle.focus();
    };
    toggle.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') !== 'true';
      nav.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && nav.classList.contains('open')) close(true);
    });
    document.addEventListener('click', event => {
      if (!nav.contains(event.target) && !toggle.contains(event.target)) close(nav.contains(document.activeElement));
    });
    nav.addEventListener('click', event => { if (event.target.closest('a')) close(); });
    document.addEventListener('focusin', event => {
      if (!nav.contains(event.target) && event.target !== toggle) close();
    });
    mobile.addEventListener('change', () => {
      const focused = document.activeElement;
      close(mobile.matches && nav.contains(focused));
      if (!mobile.matches && focused === toggle) (nav.querySelector('a[aria-current]') || nav.querySelector('a')).focus();
    });
    toggle.hidden = false;
    document.documentElement.classList.add('nav-ready');
  }
  const config = window.NINJABEAR_CONFIG || {};
  const safeUrl = (value, allowEmail = false) => {
    if (typeof value !== 'string' || !value.trim()) return '';
    try {
      const url = new URL(value);
      if (url.username || url.password) return '';
      return url.protocol === 'https:' || (allowEmail && url.protocol === 'mailto:') ? url.href : '';
    } catch { return ''; }
  };
  const names = {youtube: 'YouTube', twitch: 'Twitch', tiktok: 'TikTok', discord: 'Discord'};
  const channels = Object.entries(names).map(([key, name]) => ({key, name, url: safeUrl(config.socials?.[key])})).filter(channel => channel.url);
  document.querySelectorAll('[data-channel-links]').forEach(container => {
    channels.forEach(({name, url}) => {
      const link = document.createElement('a');
      link.className = 'btn small'; link.href = url; link.textContent = name;
      container.append(link);
    });
  });
  if (channels.length) document.querySelectorAll('[data-empty-channels]').forEach(el => { el.hidden = true; });
  const contact = safeUrl(config.contactUrl, true);
  if (contact) {
    document.querySelectorAll('[data-contact]').forEach(link => { link.href = contact; link.hidden = false; });
    document.querySelectorAll('[data-empty-contact]').forEach(el => { el.hidden = true; });
  }
  const community = safeUrl(config.socials?.discord);
  if (community) document.querySelectorAll('[data-community]').forEach(link => { link.href = community; link.textContent = 'Join the Community'; });
  const trailer = safeUrl(config.media?.trailerUrl);
  if (trailer) document.querySelectorAll('[data-trailer]').forEach(link => { link.href = trailer; link.textContent = '▶ Watch Trailer'; });
  // Direct links work without third-party players, cookies, or autoplay.
  document.querySelectorAll('[data-media]').forEach(link => {
    const url = safeUrl(config.media?.[link.dataset.media]);
    if (!url) return;
    link.href = url; link.hidden = false;
    const empty = link.previousElementSibling;
    if (empty?.tagName === 'P') empty.hidden = true;
  });
})();
