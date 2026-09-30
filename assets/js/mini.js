/* ============================================================
   mini.js — Ambient Canvas Thumbnails for Portfolio & Case Studies
   Authentic n8n node workflow graphs based on production captures:
   - 'flow': n8n Calendar Sync & factory.db reconciliation
   - 'agents': n8n Tri-Agent email orchestrator & Discord approval
   - 'board': Chess Coach Stockfish tactical move sequence
   - 'stages': FPGA 5-stage collision checking pipeline
   - 'swarm': Multi-agent drone deconfliction in 2D
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

  /* ---------- authentic n8n mini workflow rendering ---------- */

  const N8N_MINI_CONFIGS = {
    // n8n Calendar Sync & factory.db reconciliation
    flow: {
      title: 'n8n // CALENDAR RECONCILIATION & APPROVAL GATE',
      nodes: [
        { id: 0, x: 0.08, y: 0.50, icon: '⚡', name: 'Trigger', sub: 'Cron 15m', col: '#FF6D5A' },
        { id: 1, x: 0.28, y: 0.28, icon: '✉', name: '5 Lines', sub: 'Outlook', col: '#0078D4' },
        { id: 2, x: 0.28, y: 0.72, icon: '⛁', name: 'SQL DB', sub: 'factory.db', col: '#336791' },
        { id: 3, x: 0.48, y: 0.50, icon: '⌥', name: 'Diff & Switch', sub: 'Conflict?', col: '#F0A000' },
        { id: 4, x: 0.70, y: 0.26, icon: '⏳', name: 'Human Gate', sub: 'Wait Mail', col: '#EF5A16', gate: true },
        { id: 5, x: 0.90, y: 0.26, icon: '✔', name: 'Sync DB', sub: 'Commit OK', col: '#3FCB92' },
        { id: 6, x: 0.80, y: 0.74, icon: '✦', name: 'AI Explainer', sub: 'Bounce Log', col: '#E5484D', fault: true }
      ],
      edges: [
        [0, 1], [0, 2],
        [1, 3], [2, 3],
        [3, 4], [4, 5],
        [3, 6, { fault: true }]
      ]
    },

    // n8n Tri-Agent Inbox Orchestration (from n8n-email-architecture.webp)
    agents: {
      title: 'n8n // LOCAL 7B AGENT ORCHESTRATOR & TOOLS',
      nodes: [
        { id: 0, x: 0.08, y: 0.50, icon: '✉', name: 'Email In', sub: 'Outlook', col: '#0078D4' },
        { id: 1, x: 0.32, y: 0.50, icon: '✦', name: 'Qwen 7B', sub: 'Orchestrator', col: '#9B51E0' },
        { id: 2, x: 0.58, y: 0.26, icon: '🤖', name: 'Tracker Agent', sub: 'Status parser', col: '#4E9F3D' },
        { id: 3, x: 0.88, y: 0.26, icon: '⛁', name: 'Excel Tool', sub: 'Append Row', col: '#3FCB92' },
        { id: 4, x: 0.58, y: 0.74, icon: '✍', name: 'Reply Drafter', sub: 'Draft specialist', col: '#EF5A16' },
        { id: 5, x: 0.76, y: 0.74, icon: '⏳', name: 'Discord Gate', sub: 'Human signoff', col: '#EF5A16', gate: true },
        { id: 6, x: 0.92, y: 0.74, icon: '✉', name: 'Send Reply', sub: 'Outlook send', col: '#0078D4' }
      ],
      edges: [
        [0, 1],
        [1, 2], [2, 3],
        [1, 4], [4, 5], [5, 6]
      ]
    }
  };

  function flow(canvas, key) {
    const cfg = N8N_MINI_CONFIGS[key] || N8N_MINI_CONFIGS.flow;

    loop(canvas, (c, w, h, t) => {
      c.fillStyle = '#0C0E0D';
      c.fillRect(0, 0, w, h);

      // n8n grid background
      c.fillStyle = '#161D1A';
      for (let gx = 0; gx < w; gx += 20) {
        for (let gy = 0; gy < h; gy += 20) {
          c.fillRect(gx, gy, 1, 1);
        }
      }

      // Title watermark
      c.font = '700 8.5px "IBM Plex Mono", monospace';
      c.fillStyle = '#4D5854';
      c.textAlign = 'left';
      c.fillText(cfg.title, 10, 14);

      const px = (p) => p * w;
      const py = (p) => p * h;

      const dur = 5.2;
      const progress = (t % dur) / dur;

      // Draw all n8n connection wires
      cfg.edges.forEach((ed) => {
        const from = cfg.nodes[ed[0]];
        const to = cfg.nodes[ed[1]];
        const extra = ed[2] || {};

        const x0 = px(from.x), y0 = py(from.y);
        const x1 = px(to.x), y1 = py(to.y);
        const mx = (x0 + x1) / 2;

        c.beginPath();
        c.moveTo(x0, y0);
        c.bezierCurveTo(mx, y0, mx, y1, x1, y1);

        if (extra.fault) {
          c.strokeStyle = '#482025';
          c.lineWidth = 1.2;
          c.setLineDash([3, 3]);
        } else {
          c.strokeStyle = '#222C28';
          c.lineWidth = 1.4;
          c.setLineDash([]);
        }
        c.stroke();
        c.setLineDash([]);
      });

      // Animated glowing data packets
      cfg.edges.forEach((ed, i) => {
        const from = cfg.nodes[ed[0]];
        const to = cfg.nodes[ed[1]];
        const extra = ed[2] || {};

        const phaseOffset = i * 0.16;
        const p = ((progress - phaseOffset) % 1 + 1) % 1;

        if (p >= 0 && p <= 1) {
          const x0 = px(from.x), y0 = py(from.y);
          const x1 = px(to.x), y1 = py(to.y);
          const mx = (x0 + x1) / 2;

          const u = 1 - p;
          const x = u * u * u * x0 + 3 * u * u * p * mx + 3 * u * p * p * mx + p * p * p * x1;
          const y = u * u * u * y0 + 3 * u * u * p * y0 + 3 * u * p * p * y1 + p * p * p * y1;

          c.beginPath();
          c.arc(x, y, extra.fault ? 2.5 : 3.5, 0, Math.PI * 2);
          c.fillStyle = extra.fault ? '#E5484D' : '#EF5A16';
          c.shadowColor = extra.fault ? 'rgba(229,72,77,0.7)' : 'rgba(239,90,22,0.8)';
          c.shadowBlur = 6;
          c.fill();
          c.shadowBlur = 0;
        }
      });

      // Draw each n8n node card
      const nw = Math.min(84, w * 0.22);
      const nh = 32;

      cfg.nodes.forEach((n) => {
        const x = px(n.x) - nw / 2;
        const y = py(n.y) - nh / 2;

        // Card body
        c.beginPath();
        c.roundRect(x, y, nw, nh, 4);
        c.fillStyle = '#141A18';
        c.fill();

        // Border & optional human gate pulse
        let border = '#26332E';
        if (n.gate) {
          const pulse = 0.5 + 0.5 * Math.sin(t * 5);
          border = `rgba(239,90,22,${0.4 + 0.6 * pulse})`;
          c.shadowColor = 'rgba(239,90,22,0.4)';
          c.shadowBlur = 6;
        } else if (n.fault) {
          border = '#E5484D';
        }

        c.strokeStyle = border;
        c.lineWidth = n.gate ? 1.5 : 1;
        c.stroke();
        c.shadowBlur = 0;

        // Icon square on left
        const isz = nh - 8;
        c.beginPath();
        c.roundRect(x + 4, y + 4, isz, isz, 3);
        c.fillStyle = n.col;
        c.fill();

        c.font = '700 9px "IBM Plex Mono", monospace';
        c.fillStyle = '#FFFFFF';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText(n.icon, x + 4 + isz / 2, y + 4 + isz / 2 + 0.5);

        // Node title
        c.textAlign = 'left';
        c.textBaseline = 'alphabetic';
        c.font = '600 8.5px "IBM Plex Sans", -apple-system, sans-serif';
        c.fillStyle = '#E6EFEA';
        c.fillText(n.name, x + isz + 8, y + 14, nw - isz - 12);

        // Node subtitle
        c.font = '400 7.5px "IBM Plex Mono", monospace';
        c.fillStyle = '#7C8A84';
        c.fillText(n.sub, x + isz + 8, y + 25, nw - isz - 12);

        // Input & output port dots
        c.beginPath();
        c.arc(x, py(n.y), 2, 0, Math.PI * 2);
        c.fillStyle = '#303D37';
        c.fill();

        c.beginPath();
        c.arc(x + nw, py(n.y), 2, 0, Math.PI * 2);
        c.fillStyle = '#303D37';
        c.fill();
      });
    });
  }

  /* ---------- board: the position the coach keeps flagging ---------- */

  const WHITE_GLYPH = { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' };
  const BLACK_GLYPH = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
  const FRAMES = [
    { text: 'START', fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4' },
    { text: 'Ng5! (Fried Liver attack)', fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p1N1/2B1P3/8/PPPP1PPP/RNBQK2R b KQkq - 5 4' },
    { text: 'd5 (Critical counter)', fen: 'r1bqkb1r/ppp2ppp/2n2n2/3pp1N1/2B1P3/8/PPPP1PPP/RNBQK2R w KQkq d6 0 5' },
    { text: 'exd5 (Pawn captures)', fen: 'r1bqkb1r/ppp2ppp/2n2n2/3P2N1/2B5/8/PPPP1PPP/RNBQK2R b KQkq - 0 5' },
    { text: 'Na5 (Knight displacement)', fen: 'r1bqkb1r/ppp2ppp/5n2/n2P2N1/2B5/8/PPPP1PPP/RNBQK2R w KQkq - 1 6' }
  ];

  function board(canvas) {
    loop(canvas, (c, w, h, t) => {
      c.fillStyle = '#0C0E0D';
      c.fillRect(0, 0, w, h);

      const frameIdx = Math.floor((t / 2.8) % FRAMES.length);
      const frame = FRAMES[frameIdx];

      const size = Math.min(w * 0.72, h * 0.84);
      const bx = (w - size) / 2;
      const by = (h - size) / 2 + 10;
      const sq = size / 8;

      // Draw squares
      for (let r = 0; r < 8; r++) {
        for (let k = 0; k < 8; k++) {
          c.fillStyle = (r + k) % 2 === 0 ? '#C4CCC7' : '#303935';
          c.fillRect(bx + k * sq, by + r * sq, sq, sq);
        }
      }

      // Draw pieces from FEN
      const rows = frame.fen.split(' ')[0].split('/');
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.font = `${Math.floor(sq * 0.78)}px serif`;

      rows.forEach((row, r) => {
        let col = 0;
        for (let char of row) {
          if (!isNaN(char)) {
            col += parseInt(char, 10);
          } else {
            const isWhite = char === char.toUpperCase();
            c.fillStyle = isWhite ? '#FFFFFF' : '#0F1311';
            const glyph = isWhite ? WHITE_GLYPH[char.toLowerCase()] : BLACK_GLYPH[char.toLowerCase()];
            c.fillText(glyph, bx + (col + 0.5) * sq, by + (r + 0.5) * sq);
            col++;
          }
        }
      });

      // Status text
      c.font = '600 9px "IBM Plex Mono", monospace';
      c.fillStyle = '#3FCB92';
      c.textAlign = 'left';
      c.fillText('STOCKFISH 16 // TACTICAL PATTERN FLAG', 10, 16);
      c.fillStyle = '#A1B0AB';
      c.fillText(frame.text, 10, h - 8);
    });
  }

  /* ---------- stages: FPGA fixed-point datapath ---------- */

  function stages(canvas) {
    const STAGE_NAMES = ['FETCH', 'SUB_Q16', 'MULT', 'ACCUM', 'COMPARE'];
    loop(canvas, (c, w, h, t) => {
      c.fillStyle = '#0C0E0D';
      c.fillRect(0, 0, w, h);

      c.font = '700 8.5px "IBM Plex Mono", monospace';
      c.fillStyle = '#4D5854';
      c.textAlign = 'left';
      c.fillText('FPGA PIPELINE // 5-STAGE DATAPATH (BASYS 3)', 10, 16);

      const N = 5;
      const padX = 14;
      const gap = 8;
      const totalW = w - padX * 2 - (N - 1) * gap;
      const bw = totalW / N;
      const bh = Math.min(48, h * 0.42);
      const y0 = (h - bh) / 2;

      const activeIdx = Math.floor((t * 2.8) % N);

      STAGE_NAMES.forEach((st, i) => {
        const x = padX + i * (bw + gap);
        const isActive = i === activeIdx;

        c.beginPath();
        c.roundRect(x, y0, bw, bh, 3);
        c.fillStyle = isActive ? '#EF5A16' : '#141B18';
        c.fill();
        c.strokeStyle = isActive ? '#EF5A16' : '#283630';
        c.lineWidth = 1;
        c.stroke();

        c.font = '700 9px "IBM Plex Mono", monospace';
        c.fillStyle = isActive ? '#FFFFFF' : '#8A9993';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText(`S${i+1}`, x + bw / 2, y0 + 14);

        c.font = '500 7.5px "IBM Plex Mono", monospace';
        c.fillStyle = isActive ? '#FFEFE6' : '#576660';
        c.fillText(st, x + bw / 2, y0 + bh - 14);

        if (i < N - 1) {
          c.strokeStyle = '#32403A';
          c.beginPath();
          c.moveTo(x + bw, y0 + bh / 2);
          c.lineTo(x + bw + gap, y0 + bh / 2);
          c.stroke();
        }
      });

      c.font = '600 9px "IBM Plex Mono", monospace';
      c.fillStyle = '#3FCB92';
      c.textAlign = 'left';
      c.fillText('THROUGHPUT: 1 PAIR / CLOCK', padX, h - 12);
      c.textAlign = 'right';
      c.fillText('LATENCY: 5 CYCLES', w - padX, h - 12);
    });
  }

  /* ---------- balancer: Dual-Cell Production Line Balancer ---------- */

  function balancer(canvas) {
    loop(canvas, (c, w, h, t) => {
      c.fillStyle = '#0C0E0D';
      c.fillRect(0, 0, w, h);

      c.font = '700 8.5px "IBM Plex Mono", monospace';
      c.fillStyle = '#4D5854';
      c.textAlign = 'left';
      c.fillText('CODESYS IEC 61131-3 // DUAL-CELL BALANCER', 10, 16);

      const cycle = t % 8;
      const baseOut = 24 + Math.floor(t * 0.8);
      const isHold = (cycle > 4.5 && cycle < 6.8);
      const lidOut = isHold ? baseOut - 1 : baseOut;
      const delta = Math.abs(baseOut - lidOut);

      const trackW = w - 24;
      const x0 = 12;
      const yLine1 = h * 0.36;
      const yLine2 = h * 0.68;
      const lineH = 18;

      [ { y: yLine1, label: 'L1: BASE', color: '#388BFD', hold: isHold },
        { y: yLine2, label: 'L2: LID',  color: '#EF5A16', hold: false }
      ].forEach((line, idx) => {
        c.fillStyle = '#141A17';
        c.beginPath();
        c.roundRect(x0, line.y - lineH/2, trackW, lineH, 2);
        c.fill();
        c.strokeStyle = line.hold ? 'rgba(239,90,22,0.4)' : '#232D29';
        c.lineWidth = 1;
        c.stroke();

        c.strokeStyle = '#1D2622';
        for (let rx = x0 + 10; rx < x0 + trackW - 5; rx += 14) {
          c.beginPath();
          c.moveTo(rx, line.y - lineH/2 + 2);
          c.lineTo(rx, line.y + lineH/2 - 2);
          c.stroke();
        }

        const stationW = 44;
        const sx = x0 + trackW * 0.44;
        c.fillStyle = line.hold ? '#261B14' : '#1A2420';
        c.beginPath();
        c.roundRect(sx, line.y - lineH/2 - 4, stationW, lineH + 8, 3);
        c.fill();
        c.strokeStyle = line.hold ? '#EF5A16' : '#3FCB92';
        c.stroke();

        c.font = '700 7.5px "IBM Plex Mono", monospace';
        c.fillStyle = line.hold ? '#EF5A16' : '#A9B5B0';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText(line.hold ? 'HOLD' : 'CNC', sx + stationW / 2, line.y);

        // Entrance photo-eye
        const s1x = sx - 14;
        c.fillStyle = '#3FCB92';
        c.fillRect(s1x, line.y - lineH/2, 2, lineH);

        // Exit photo-eye
        const s2x = sx + stationW + 12;
        c.fillStyle = '#388BFD';
        c.fillRect(s2x, line.y - lineH/2, 2, lineH);

        // Moving part
        const speed = line.hold ? 0 : 0.42;
        const partProg = ((t * speed + idx * 0.5) % 1);
        const px = x0 + 6 + partProg * (trackW - 20);
        c.fillStyle = line.color;
        c.beginPath();
        c.roundRect(px, line.y - 5, 10, 10, 2);
        c.fill();

        c.font = '600 7.5px "IBM Plex Mono", monospace';
        c.fillStyle = '#7A8C85';
        c.textAlign = 'left';
        c.fillText(line.label, x0 + 4, line.y - lineH/2 - 4);
      });

      c.font = '600 8.5px "IBM Plex Mono", monospace';
      c.textAlign = 'left';
      if (isHold) {
        c.fillStyle = '#EF5A16';
        c.fillText(`INTERLOCK: AND-GATE HOLD ACTIVE [Δ = ${delta}]`, 10, h - 8);
      } else {
        c.fillStyle = '#3FCB92';
        c.fillText('STATUS: BALANCED 1:1 [CYCLE TRIGGER ARMED]', 10, h - 8);
      }

      c.textAlign = 'right';
      c.fillStyle = '#7A8C85';
      c.fillText(`BASE:${baseOut} LID:${lidOut}`, w - 10, h - 8);
    });
  }

  function init() {
    document.querySelectorAll('canvas[data-mini]').forEach((cv) => {
      const kind = cv.dataset.mini;
      if (kind === 'flow' || kind === 'agents') flow(cv, kind);
      else if (kind === 'stages') stages(cv);
      else if (kind === 'board') board(cv);
      else if (kind === 'balancer') balancer(cv);
      else if (kind === 'swarm' && global.Swarm) {
        global.Swarm.mount({ canvas: cv, scenario: 'corridor', n: 8, mini: true });
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window);
