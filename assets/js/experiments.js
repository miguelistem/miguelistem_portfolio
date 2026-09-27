/* ============================================================
   experiments.js — Lab Bench & Experiments interactive behavior
   Provides category filtering, video play management, and
   synchronized scroll reveals for experiment rigs.
   ============================================================ */

(function () {
  'use strict';

  // Category filtering
  const filterBtns = document.querySelectorAll('.exp-filter-btn');
  const expCards = document.querySelectorAll('.exp-rig');

  if (filterBtns.length && expCards.length) {
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('on'));
        btn.classList.add('on');

        const cat = btn.getAttribute('data-filter');

        expCards.forEach(card => {
          const cardCat = card.getAttribute('data-category');
          if (cat === 'all' || cardCat === cat || (cardCat && cardCat.includes(cat))) {
            card.style.display = '';
            card.classList.add('in');
          } else {
            card.style.display = 'none';
          }
        });
      });
    });
  }

  // IntersectionObserver for scroll animations
  const riseTargets = document.querySelectorAll('.exp-rig');
  if (riseTargets.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.05, rootMargin: '0px 0px -40px 0px' });

    riseTargets.forEach(t => io.observe(t));
  }

  // Smart video handling: pause when scrolled out of view to conserve GPU memory
  const videos = document.querySelectorAll('.exp-video-wrap video');
  if (videos.length && 'IntersectionObserver' in window) {
    const videoObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const video = entry.target;
        if (!entry.isIntersecting && !video.paused) {
          video.pause();
        }
      });
    }, { threshold: 0.2 });

    videos.forEach(v => videoObserver.observe(v));
  }
})();
