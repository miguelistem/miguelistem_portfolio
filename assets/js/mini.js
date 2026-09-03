/* ============================================================
   mini.js — the ambient thumbnails on the home page. These are
   teasers, not the demos; the real ones live on the work page.
   ============================================================ */
(function (global) {
  'use strict';

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function fit(canvas) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = canvas.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
    const c = canvas.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { c, w: r.width, h: r.height };
  }

  function loop(canvas, render) {
    let raf = null, t0 = performance.now();
    let ctxInfo = fit(canvas);
    const frame = (now) => {
      if (!ctxInfo) ctxInfo = fit(canvas);
      if (ctxInfo) {
        ctxInfo.c.setTransform(
          Math.min(window.devicePixelRatio || 1, 2), 0, 0,
          Math.min(window.devicePixelRatio || 1, 2), 0, 0);
        render(ctxInfo.c, ctxInfo.w, ctxInfo.h, (now - t0) / 1000);
      }
      raf = requestAnimationFrame(frame);
    };
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => {
        if (e.isIntersecting && !raf) raf = requestAnimationFrame(frame);
        else if (!e.isIntersecting && raf) { cancelAnimationFrame(raf); raf = null; }
      });
    }, { threshold: 0.05 });
    io.observe(canvas);
    let rt;
    window.addEventListener('resize', () => {
      clearTimeout(rt);
      rt = setTimeout(() => { ctxInfo = fit(canvas); }, 140);
    });
    if (reduced) { ctxInfo = fit(canvas); if (ctxInfo) render(ctxInfo.c, ctxInfo.w, ctxInfo.h, 2.2); }
  }

  /* ---------- flow: an order moving through gates ---------- */

  const GRAPHS = {
    // an order moving through gates: fan out, join, emit
    flow: {
      nodes: [[0.10, 0.50], [0.36, 0.24], [0.36, 0.76], [0.62, 0.50], [0.88, 0.50]],
      edges: [[0, 1], [0, 2], [1, 3], [2, 3], [3, 4]],
      stages: [[0, 1], [2, 3], [4]],
      outs: [4], trigger: 0
    },
    // one inbox, an orchestrator, two specialists that never rejoin —
    // each agent has its own destination, which is the point
    agents: {
      nodes: [[0.09, 0.50], [0.37, 0.50], [0.66, 0.26], [0.66, 0.74], [0.92, 0.26], [0.92, 0.74]],
      edges: [[0, 1], [1, 2], [1, 3], [2, 4], [3, 5]],
      stages: [[0], [1, 2], [3, 4]],
      outs: [4, 5], trigger: 0
    }
  };

  function flow(canvas, key) {
    const G = GRAPHS[key] || GRAPHS.flow;
    const NODES = G.nodes, EDGES = G.edges, STAGE = G.stages;

    loop(canvas, (c, w, h, t) => {
      c.fillStyle = '#0C0E0D';
      c.fillRect(0, 0, w, h);

      c.strokeStyle = '#182120';
      c.lineWidth = 1;
      c.beginPath();
      for (let x = 0; x < w; x += 22) { c.moveTo(x, 0); c.lineTo(x, h); }
      for (let y = 0; y < h; y += 22) { c.moveTo(0, y); c.lineTo(w, y); }
      c.stroke();

      const cycle = 4.8;
      const p = (t % cycle) / cycle;
      const stageF = p * (STAGE.length + 0.7);
      const px = (i) => NODES[i][0] * w;
      const py = (i) => NODES[i][1] * h;

      EDGES.forEach((e) => {
        c.strokeStyle = '#26302D';
        c.lineWidth = 1.2;
        c.beginPath();
        c.moveTo(px(e[0]), py(e[0]));
        c.bezierCurveTo((px(e[0]) + px(e[1])) / 2, py(e[0]), (px(e[0]) + px(e[1])) / 2, py(e[1]), px(e[1]), py(e[1]));
        c.stroke();
      });

      STAGE.forEach((edgeIdxs, s) => {
        const local = stageF - s;
        if (local < 0 || local > 1) return;
        edgeIdxs.forEach((ei) => {
          const e = EDGES[ei];
          const x0 = px(e[0]), y0 = py(e[0]), x1 = px(e[1]), y1 = py(e[1]);
          const mx = (x0 + x1) / 2;
          for (let k = 0; k < 3; k++) {
            const u = local - k * 0.13;
            if (u < 0 || u > 1) continue;
            const iu = 1 - u;
            const x = iu * iu * iu * x0 + 3 * iu * iu * u * mx + 3 * iu * u * u * mx + u * u * u * x1;
            const y = iu * iu * iu * y0 + 3 * iu * iu * u * y0 + 3 * iu * u * u * y1 + u * u * u * y1;
            c.beginPath();
            c.arc(x, y, 3 - k * 0.7, 0, Math.PI * 2);
            c.fillStyle = k === 0 ? '#FFB088' : 'rgba(239,90,22,.45)';
            c.fill();
          }
        });
      });

      NODES.forEach((n, i) => {
        const x = n[0] * w, y = n[1] * h;
        const reached = stageF > (i === G.trigger ? 0 : G.outs.indexOf(i) !== -1 ? STAGE.length - 1 : 1);
        const bw = 30, bh = 16;
        c.fillStyle = reached ? '#151C1A' : '#101413';
        c.fillRect(x - bw / 2, y - bh / 2, bw, bh);
        const tone = G.outs.indexOf(i) !== -1 ? '#3FCB92' : i === G.trigger ? '#EF5A16' : '#74C9EE';
        c.strokeStyle = reached ? tone : '#2C3532';
        c.lineWidth = 1;
        c.strokeRect(x - bw / 2 + 0.5, y - bh / 2 + 0.5, bw - 1, bh - 1);
        c.fillStyle = reached ? tone : '#2C3532';
        c.fillRect(x - bw / 2, y - bh / 2, 2, bh);
      });
    });
  }

  /* ---------- board: the position the coach keeps flagging ---------- */

  const WHITE_GLYPH = { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' };
  const BLACK_GLYPH = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
  const FRAMES = [
    { fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p1N1/2B1P3/8/PPPP1PPP/RNBQK2R b KQkq - 5 4', cp: 34, hl: null },
    { fen: 'r1bqkb1r/ppp2ppp/2n2n2/3pp1N1/2B1P3/8/PPPP1PPP/RNBQK2R w KQkq d6 0 5', cp: 40, hl: null },
    { fen: 'r1bqkb1r/ppp2ppp/2n5/3np1N1/2B5/8/PPPP1PPP/RNBQK2R w KQkq - 0 6', cp: 195, hl: 'd5' },
    { fen: 'r1bqkb1r/ppp2Npp/2n5/3np3/2B5/8/PPPP1PPP/RNBQK2R b KQkq - 0 6', cp: 262, hl: 'f7' }
  ];

  function board(canvas) {
    let fi = 0, last = 0, shown = 0;

    loop(canvas, (c, w, h, t) => {
      c.fillStyle = '#0C0E0D';
      c.fillRect(0, 0, w, h);

      if (!reduced && t - last > 1.9) { last = t; fi = (fi + 1) % FRAMES.length; }
      const F = FRAMES[reduced ? 2 : fi];

      const pad = 10;
      const barW = 6;
      const side = Math.min(w - pad * 2 - barW - 8, h - pad * 2);
      const ox = (w - (side + barW + 8)) / 2 + barW + 8;
      const oy = (h - side) / 2;
      const sq = side / 8;

      // eval bar
      const target = 100 - (50 + 50 * (2 / (1 + Math.exp(-F.cp / 320)) - 1));
      shown += (target - shown) * 0.07;
      c.fillStyle = '#2A312E';
      c.fillRect(ox - barW - 8, oy, barW, side);
      c.fillStyle = '#D7DDD9';
      const bh = side * (shown / 100);
      c.fillRect(ox - barW - 8, oy, barW, bh);

      // squares (flipped — Black at the bottom)
      const rows = F.fen.split(' ')[0].split('/');
      for (let r = 0; r < 8; r++) {
        for (let f = 0; f < 8; f++) {
          const x = ox + (7 - f) * sq, y = oy + (7 - r) * sq;
          c.fillStyle = (r + f) % 2 === 0 ? '#A7B2AC' : '#4A5852';
          c.fillRect(x, y, sq + 0.5, sq + 0.5);
        }
      }

      if (F.hl) {
        const f = 'abcdefgh'.indexOf(F.hl[0]);
        const r = 8 - parseInt(F.hl[1], 10);
        c.fillStyle = 'rgba(229,72,77,.5)';
        c.fillRect(ox + (7 - f) * sq, oy + (7 - r) * sq, sq, sq);
      }

      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.font = `${sq * 0.78}px "Segoe UI Symbol", "Apple Symbols", "DejaVu Sans", "Noto Sans Symbols 2", serif`;
      for (let r = 0; r < 8; r++) {
        let f = 0;
        for (const ch of rows[r]) {
          if (/\d/.test(ch)) { f += +ch; continue; }
          const x = ox + (7 - f) * sq + sq / 2, y = oy + (7 - r) * sq + sq / 2;
          const white = ch === ch.toUpperCase();
          const pt = ch.toLowerCase();
          c.fillStyle = white ? '#F4F6F3' : '#111615';
          c.fillText(BLACK_GLYPH[pt], x, y);
          c.fillStyle = white ? '#0E1211' : '#AEBCB6';
          c.fillText(WHITE_GLYPH[pt], x, y);
          f++;
        }
      }
      c.textBaseline = 'alphabetic';
    });
  }

  /* ---------- stages: a pipeline retiring one pair per clock ---------- */

  function stages(canvas) {
    const N = 5;
    loop(canvas, (c, w, h, t) => {
      c.fillStyle = '#0C0E0D';
      c.fillRect(0, 0, w, h);

      c.strokeStyle = '#182120';
      c.lineWidth = 1;
      c.beginPath();
      for (let x = 0; x < w; x += 22) { c.moveTo(x, 0); c.lineTo(x, h); }
      for (let y = 0; y < h; y += 22) { c.moveTo(0, y); c.lineTo(w, y); }
      c.stroke();

      const clock = Math.floor(t * 2.4);
      const padX = Math.min(22, w * 0.07);
      const bw = (w - padX * 2) / N - 6;
      const bh = Math.min(46, h * 0.30);
      const y0 = (h - bh) / 2;

      for (let i = 0; i < N; i++) {
        const x = padX + i * (bw + 6);
        // several pairs are in flight at once — that is the whole point
        const lit = ((clock - i) % N + N) % N === 0 && clock >= i;
        c.fillStyle = lit ? '#EF5A16' : '#121816';
        c.fillRect(x, y0, bw, bh);
        c.strokeStyle = lit ? '#EF5A16' : '#2C3532';
        c.lineWidth = 1;
        c.strokeRect(x + 0.5, y0 + 0.5, bw - 1, bh - 1);
        if (i < N - 1) {
          c.strokeStyle = '#26302D';
          c.beginPath();
          c.moveTo(x + bw, y0 + bh / 2);
          c.lineTo(x + bw + 6, y0 + bh / 2);
          c.stroke();
        }
      }

      c.font = '600 9px "IBM Plex Mono", monospace';
      c.fillStyle = '#5D6B66';
      c.textAlign = 'left';
      c.fillText('1 PAIR / CLOCK', padX, y0 + bh + 20);
      c.textAlign = 'right';
      c.fillStyle = '#3FCB92';
      c.fillText('Q16.16', w - padX, y0 + bh + 20);
      c.textAlign = 'left';
    });
  }

  function init() {
    document.querySelectorAll('canvas[data-mini]').forEach((cv) => {
      const kind = cv.dataset.mini;
      if (kind === 'flow' || kind === 'agents') flow(cv, kind);
      else if (kind === 'stages') stages(cv);
      else if (kind === 'board') board(cv);
      else if (kind === 'swarm' && global.Swarm) {
        global.Swarm.mount({ canvas: cv, scenario: 'corridor', n: 8, mini: true });
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window);
