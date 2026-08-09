/* site.js — shared page behaviour: reveals, sub-nav state, year. */
(function () {
  'use strict';

  const y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();

  // scroll reveals
  const targets = document.querySelectorAll('.rise');
  if (targets.length) {
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
    targets.forEach((t) => io.observe(t));
  }

  // sub-nav follows the case you are reading
  const links = document.querySelectorAll('.subnav a[href^="#"]');
  if (links.length) {
    const map = {};
    links.forEach((a) => {
      const el = document.querySelector(a.getAttribute('href'));
      if (el) map[a.getAttribute('href').slice(1)] = a;
    });
    const spy = new IntersectionObserver((es) => {
      es.forEach((e) => {
        if (!e.isIntersecting) return;
        links.forEach((a) => a.classList.remove('on'));
        const a = map[e.target.id];
        if (a) a.classList.add('on');
      });
    }, { rootMargin: '-25% 0px -65% 0px' });
    Object.keys(map).forEach((id) => {
      const el = document.getElementById(id);
      if (el) spy.observe(el);
    });
  }
})();
