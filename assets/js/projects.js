/* ============================================================
   projects.js — Projects Page Interactive Controller
   Handles:
   1. State Decision Architecture Rail filtering
   2. Category domain filtering (Automation, AI, Robotics/FPGA)
   3. Detailed vs. Compact view mode switching
   4. Staggered scroll reveals
   ============================================================ */

(function () {
  'use strict';

  /* ---- 1. State-to-Actuation Architecture Rail filtering ---- */
  const railStages = document.querySelectorAll('.state-rail-stage[data-stage]');
  const clearRailBtn = document.getElementById('rail-clear');
  const railStatus = document.getElementById('rail-status-text');
  const buildCards = document.querySelectorAll('.bld-rig');

  let activeRailStage = null;

  if (railStages.length) {
    railStages.forEach((stage) => {
      stage.addEventListener('click', (e) => {
        e.preventDefault();
        const stageKey = stage.getAttribute('data-stage').toLowerCase();

        if (activeRailStage === stageKey) {
          resetRailFilter();
          return;
        }

        activeRailStage = stageKey;
        railStages.forEach(s => s.classList.remove('selected'));
        stage.classList.add('selected');

        const stageTitle = stage.querySelector('.stage-name').textContent;
        if (clearRailBtn) clearRailBtn.classList.add('active');
        if (railStatus) railStatus.textContent = `Filtered by architecture layer: "${stageTitle}"`;

        buildCards.forEach(card => {
          const cardStages = (card.getAttribute('data-stages') || '').toLowerCase();
          if (cardStages.includes(stageKey)) {
            card.style.display = '';
            card.classList.add('in');
          } else {
            card.style.display = 'none';
          }
        });

        window.dispatchEvent(new Event('resize'));
      });
    });

    if (clearRailBtn) {
      clearRailBtn.addEventListener('click', () => {
        resetRailFilter();
      });
    }

    function resetRailFilter() {
      activeRailStage = null;
      railStages.forEach(s => s.classList.remove('selected'));
      if (clearRailBtn) clearRailBtn.classList.remove('active');
      if (railStatus) railStatus.textContent = 'Click any architecture module to filter matching builds';

      const activeCatBtn = document.querySelector('.proj-filter-btn.on');
      const cat = activeCatBtn ? activeCatBtn.getAttribute('data-filter') : 'all';
      filterByCategory(cat);
    }
  }

  /* ---- 2. Category domain filtering ---- */
  const filterBtns = document.querySelectorAll('.proj-filter-btn');

  function filterByCategory(cat) {
    buildCards.forEach(card => {
      const cardCat = card.getAttribute('data-category');
      if (cat === 'all' || cardCat === cat || (cardCat && cardCat.includes(cat))) {
        card.style.display = '';
        card.classList.add('in');
      } else {
        card.style.display = 'none';
      }
    });

    window.dispatchEvent(new Event('resize'));
  }

  if (filterBtns.length) {
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('on'));
        btn.classList.add('on');

        const cat = btn.getAttribute('data-filter');
        filterByCategory(cat);

        if (activeRailStage) {
          railStages.forEach(s => s.classList.remove('selected'));
          activeRailStage = null;
          if (clearRailBtn) clearRailBtn.classList.remove('active');
          if (railStatus) railStatus.textContent = 'Click any architecture module to filter matching builds';
        }
      });
    });
  }

  /* ---- 3. Detailed vs Compact view mode switching ---- */
  const viewBtns = document.querySelectorAll('.proj-view-btn');
  const buildList = document.querySelector('.proj-build-list');

  if (viewBtns.length && buildList) {
    viewBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        viewBtns.forEach(b => b.classList.remove('on'));
        btn.classList.add('on');

        const mode = btn.getAttribute('data-mode');
        if (mode === 'compact') {
          buildList.classList.add('compact-mode');
        } else {
          buildList.classList.remove('compact-mode');
          setTimeout(() => {
            window.dispatchEvent(new Event('resize'));
          }, 50);
        }
      });
    });
  }

  /* ---- 4. Staggered scroll reveals ---- */
  if (buildCards.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.05, rootMargin: '0px 0px -40px 0px' });

    buildCards.forEach((c) => io.observe(c));
  }
})();
