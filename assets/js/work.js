/* work.js — wires the three demos on the work page to their controls. */
(function () {
  'use strict';

  const $ = (s) => document.querySelector(s);
  const group = (sel, onPick) => {
    const btns = Array.from(document.querySelectorAll(sel));
    btns.forEach((b) => b.addEventListener('click', () => {
      btns.forEach((x) => x.classList.remove('on'));
      b.classList.add('on');
      onPick(b);
    }));
    return btns;
  };

  /* ---------------- 01 · pipeline ---------------- */
  const pipeCanvas = $('#pipe-canvas');
  if (pipeCanvas && window.Pipeline) {
    const logEl = $('#pipe-log');
    const headEl = $('#pipe-mode');
    let lines = [];
    let sub = '';
    let stale = false;

    const paint = () => {
      const head = sub
        ? '<div style="color:#6E7A76;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid #1F2724">' + sub + '</div>'
        : '';
      logEl.innerHTML = head + lines.map((l, i) => {
        const dim = i < lines.length - 1 ? 'opacity:.48;' : 'color:#DCE6E1;';
        return '<div style="' + dim + 'margin-bottom:6px"><span style="color:#EF5A16">›</span> ' + l + '</div>';
      }).join('');
    };

    const pipe = window.Pipeline.mount({
      canvas: pipeCanvas,
      mode: 'scheduled',
      onMode: (g) => {
        sub = g.sub;
        if (headEl) headEl.textContent = g.title;
        paint();
      },
      onEmit: (emit) => {
        // keep the last run on screen until the next one starts producing
        if (emit === null) { stale = true; return; }
        if (stale) { lines = []; stale = false; }
        emit.forEach((l) => lines.push(l));
        while (lines.length > 6) lines.shift();
        paint();
      }
    });

    group('[data-mode]', (b) => pipe.setMode(b.dataset.mode));
    const replay = $('#pipe-replay');
    if (replay) replay.addEventListener('click', () => pipe.restart());
  }

  /* ---------------- 02 · chess coach ---------------- */
  const boardCanvas = $('#board');
  if (boardCanvas && window.Coach) {
    const coach = window.Coach.mount({
      canvas: boardCanvas,
      evalEl: $('#eval-white'),
      scoreEl: $('#eval-score'),
      moveEl: $('#move-label'),
      tagEl: $('#move-tag'),
      textEl: $('#coach-text'),
      chipRoot: $('#tool-chips'),
      stripRoot: $('#move-strip'),
      playBtn: $('#c-play')
    });

    $('#c-prev').addEventListener('click', coach.prev);
    $('#c-next').addEventListener('click', coach.next);
    $('#c-play').addEventListener('click', coach.play);
    $('#c-blunder').addEventListener('click', coach.jumpBlunder);
    $('#c-reset').addEventListener('click', coach.reset);

    // arrow keys work when the board section is on screen
    document.addEventListener('keydown', (e) => {
      const r = boardCanvas.getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight) return;
      if (e.target.matches('input, textarea')) return;
      if (e.key === 'ArrowRight') { coach.next(); }
      else if (e.key === 'ArrowLeft') { coach.prev(); }
    });
  }

  /* ---------------- 03 · swarm ---------------- */
  const swarmCanvas = $('#swarm-canvas');
  if (swarmCanvas && window.Swarm) {
    const el = {
      agents: $('#s-agents'), settled: $('#s-settled'), coll: $('#s-coll'),
      sep: $('#s-sep'), rate: $('#s-rate'), bar: $('#s-bar')
    };

    const sim = window.Swarm.mount({
      canvas: swarmCanvas,
      scenario: 'corridor',
      n: 8,
      onStats: (s) => {
        el.agents.textContent = s.agents;
        el.settled.textContent = s.settled;
        el.coll.textContent = s.collisions;
        el.coll.className = s.collisions ? 'bad' : 'ok';
        el.sep.textContent = s.minSep > 0 ? s.minSep.toFixed(2) + ' m' : 'contact';
        el.sep.className = s.minSep > 0.4 ? 'ok' : s.minSep > 0 ? 'warn' : 'bad';
        el.rate.textContent = s.rate > 1000
          ? (s.rate / 1000).toFixed(1) + 'k'
          : Math.round(s.rate);
        el.bar.style.width = (100 * s.settled / s.agents) + '%';
      }
    });

    group('[data-scen]', (b) => sim.setScenario(b.dataset.scen));
    group('[data-n]', (b) => sim.setCount(parseInt(b.dataset.n, 10)));

    const pause = $('#s-pause');
    pause.addEventListener('click', () => {
      pause.textContent = sim.toggle() ? 'Pause' : 'Resume';
    });
  }

  /* ---------------- 04 · fpga ---------------- */
  const stages = document.querySelectorAll('#fpga-stages .stage');
  if (stages.length) {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let running = false, i = 0, timer = null;

    const step = () => {
      // one pair retires per cycle, so several are lit at once
      stages.forEach((s, k) => s.classList.toggle('hot', (i - k) % 5 === 0 && i >= k));
      i++;
      timer = setTimeout(step, 420);
    };

    const io = new IntersectionObserver((es) => {
      es.forEach((e) => {
        if (e.isIntersecting && !running && !reduced) { running = true; step(); }
        else if (!e.isIntersecting && running) { running = false; clearTimeout(timer); }
      });
    }, { threshold: 0.25 });
    io.observe(stages[0].parentElement);
  }

  const load = document.querySelector('#fpga-load');
  if (load) {
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => {
        if (!e.isIntersecting) return;
        load.querySelectorAll('.tp-fill').forEach((f, k) => {
          setTimeout(() => { f.style.width = f.dataset.w + '%'; }, k * 130);
        });
        io.disconnect();
      });
    }, { threshold: 0.4 });
    io.observe(load);
  }
})();
