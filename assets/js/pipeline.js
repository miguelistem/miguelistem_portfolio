/* ============================================================
   pipeline.js — animated run of the plant-ops workflows.
   One domain, four trigger types: scheduled, threshold,
   event-driven, human-in-the-loop. Each mode replays its own
   route and emits the artifact the real pipeline would send.
   ============================================================ */
(function (global) {
  'use strict';

  const VW = 1040, VH = 460;
  const NW = 152, NH = 54;

  const KIND = {
    trigger: { line: '#EF5A16', text: '#F6D7C6' },
    data:    { line: '#74C9EE', text: '#CFE9F6' },
    logic:   { line: '#8D9A95', text: '#DCE6E1' },
    ai:      { line: '#EF5A16', text: '#F6D7C6' },
    gate:    { line: '#C9A227', text: '#EEDFA8' },
    out:     { line: '#3FCB92', text: '#C4EEDC' },
    fault:   { line: '#E5484D', text: '#F3C4C6' }
  };

  function N(cx, cy, kind, l1, l2, extra) {
    return Object.assign({ cx, cy, kind, l1, l2 }, extra || {});
  }

  const GRAPHS = {
    scheduled: {
      title: 'SHIFT HANDOFF SUMMARY',
      sub: 'Scheduled · fires at the manager\'s clock-in, one hour before crew change',
      nodes: {
        t:  N(96, 230, 'trigger', 'CRON 06:00', 'mgr clock-in'),
        d1: N(310, 112, 'data', 'SHIFTS', 'handoff link'),
        d2: N(310, 230, 'data', 'PRODUCTION_ROLLS', 'outgoing shift'),
        d3: N(310, 348, 'data', 'LINE_EVENTS', 'stops + holds'),
        l1: N(530, 230, 'logic', 'EFFICIENCY', 'actual vs targets'),
        a1: N(740, 230, 'ai', 'LLM NARRATOR', 'numbers → prose'),
        o1: N(944, 230, 'out', 'EMAIL', 'day manager')
      },
      edges: [['t','d1'],['t','d2'],['t','d3'],['d1','l1'],['d2','l1'],['d3','l1'],['l1','a1'],['a1','o1']],
      waves: [
        { e: [['t','d1'],['t','d2'],['t','d3']], emit: ['06:00 · handoff SH-20260806-N → crew C'] },
        { e: [['d1','l1'],['d2','l1'],['d3','l1']], emit: ['48 rolls · 40.1 k-lb logged overnight'] },
        { e: [['l1','a1']], emit: ['Line X 61% of target · extruder fault 03:10, 90 min'] },
        { e: [['a1','o1']], emit: ['Brief sent — X is behind because of the 03:10 fault,', 'not crew pace. Y held 45 min on gauge drift.'] }
      ]
    },

    threshold: {
      title: 'MATERIAL DEPLETION FORECAST',
      sub: 'Threshold · projects burn-down against lead time instead of waiting for the bin to empty',
      nodes: {
        t:  N(96, 230, 'trigger', 'CRON 30 MIN', '+ on receipt'),
        d1: N(310, 140, 'data', 'MATERIAL LEDGER', 'balance_after_lb'),
        d2: N(310, 320, 'data', 'SCHEDULE', '6 weeks committed'),
        l1: N(530, 230, 'logic', 'FORECAST', 'demand vs on-hand'),
        g1: N(740, 230, 'gate', 'LEAD-TIME GATE', 'cover < 14 days?'),
        o1: N(944, 140, 'out', 'PROCUREMENT', 'PO draft + alert'),
        o2: N(944, 320, 'logic', 'NO ACTION', 'within cover', { dim: true })
      },
      edges: [['t','d1'],['t','d2'],['d1','l1'],['d2','l1'],['l1','g1'],['g1','o1'],['g1','o2',{dim:true}]],
      waves: [
        { e: [['t','d1'],['t','d2']], emit: ['Scanning 12 materials against the committed queue'] },
        { e: [['d1','l1'],['d2','l1']], emit: ['PET · 9,000 lb on hand'] },
        { e: [['l1','g1']], emit: ['R-LAM-12 needs 141,000 lb within 14 days'] },
        { e: [['g1','o1']], emit: ['SHORTFALL. Lead time 14 d = zero slack.', 'Order PET today or Line R stalls Aug 21.'] }
      ]
    },

    event: {
      title: 'CALENDAR MOVE → RESCHEDULE',
      sub: 'Event-driven · the manager drags an order in Outlook and the schedule answers back',
      nodes: {
        t:  N(96, 230, 'trigger', 'OUTLOOK CAL', 'move / add / delete'),
        l1: N(288, 230, 'logic', 'VALIDATE', 'line capability'),
        g:  N(482, 230, 'gate', 'SPEC MATCH?', 'gauge · width · color'),
        ob: N(676, 96, 'fault', 'BOUNCE', 'revert + reason', { dim: true }),
        l2: N(676, 340, 'logic', 'CASCADE', 'shift queue up/down'),
        d:  N(852, 340, 'data', 'WRITE factory.db', '+ audit row'),
        o:  N(944, 196, 'out', 'CONFIRM', 'new ETA + impact')
      },
      edges: [['t','l1'],['l1','g'],['g','ob',{dim:true,label:'invalid'}],['g','l2'],['l2','d'],['d','o']],
      waves: [
        { e: [['t','l1']], emit: ['ORD-10293 cancelled — Line R slot freed Aug 9'] },
        { e: [['l1','g']], emit: ['Checking line_capabilities for the next eligible order'] },
        { e: [['g','l2']], emit: ['ORD-10301 runs on R at 1,180 lb/h. Accepted.'] },
        { e: [['l2','d']], emit: ['Cascading 14 downstream jobs up by 6 h 20 m'] },
        { e: [['d','o']], emit: ['Confirmed. Two rush orders moved back inside due date.', 'Nothing written until the manager approves.'] }
      ]
    },

    human: {
      title: 'ORDER APPROVAL CHAIN',
      sub: 'Human-in-the-loop · a state machine that pauses on people and resumes on their answer',
      nodes: {
        t:  N(100, 230, 'trigger', 'ORD-10291', 'new order'),
        a1: N(336, 116, 'logic', 'CHEMICAL', 'feedstock confirm', { human: true }),
        a2: N(336, 344, 'logic', 'MANUFACTURING', 'line capacity', { human: true }),
        j:  N(556, 230, 'gate', 'JOIN', 'both must clear'),
        m:  N(760, 230, 'logic', 'MANAGEMENT', 'schedule sign-off', { human: true }),
        o:  N(944, 230, 'out', 'SCHEDULED', 'enters the queue')
      },
      edges: [['t','a1'],['t','a2'],['a1','j'],['a2','j'],['j','m'],['m','o']],
      waves: [
        { e: [['t','a1'],['t','a2']], emit: ['Stages open in parallel. Workflow parks and waits.'] },
        { e: [['a1','j']], hold: 900, emit: ['Chemical approved 04:12 — LLDPE lot 22-B confirmed'] },
        { e: [['a2','j']], hold: 500, emit: ['Manufacturing approved 05:40 — Line Y slot Aug 12'] },
        { e: [['j','m']], emit: ['Both cleared. Management gate opens.'] },
        { e: [['m','o']], hold: 1000, emit: ['Approved. Order drops into the production queue', 'with the full decision trail attached.'] }
      ]
    }
  };

  function mount(opts) {
    const canvas = opts.canvas;
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let W = 0, H = 0, scale = 1, offX = 0, offY = 0;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let key = opts.mode || 'scheduled';
    let g = GRAPHS[key];
    let waveIdx = 0, phase = 'hold', phaseStart = 0, doneNodes = {}, active = {};
    let raf = null;

    function resize() {
      const r = canvas.getBoundingClientRect();
      if (!r.width || !r.height) return;
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.height * dpr);
      W = r.width; H = r.height;
      scale = Math.min(W / VW, H / VH);
      offX = (W - VW * scale) / 2;
      offY = (H - VH * scale) / 2;
    }
    resize();

    function restart() {
      waveIdx = 0; phase = 'hold'; phaseStart = performance.now();
      doneNodes = {}; active = {};
      doneNodes[Object.keys(g.nodes)[0]] = true;
      if (opts.onEmit) opts.onEmit(null); // clear
    }

    function setMode(k) {
      if (!GRAPHS[k]) return;
      key = k; g = GRAPHS[k];
      if (opts.onMode) opts.onMode(g);
      restart();
    }

    /* ---------- geometry ---------- */
    const X = (x) => offX + x * scale;
    const Y = (y) => offY + y * scale;

    function anchor(from, to) {
      const a = g.nodes[from], b = g.nodes[to];
      const hw = (NW / 2), hh = (NH / 2);
      const ax = a.cx + (b.cx > a.cx ? hw : b.cx < a.cx ? -hw : 0);
      const bx = b.cx + (b.cx > a.cx ? -hw : b.cx < a.cx ? hw : 0);
      return { ax, ay: a.cy, bx, by: b.cy, ahh: hh, bhh: hh };
    }

    function pointOn(e, t) {
      // cubic-ish S curve between the two anchors
      const { ax, ay, bx, by } = e;
      const mx = (ax + bx) / 2;
      const u = 1 - t;
      const x = u * u * u * ax + 3 * u * u * t * mx + 3 * u * t * t * mx + t * t * t * bx;
      const y = u * u * u * ay + 3 * u * u * t * ay + 3 * u * t * t * by + t * t * t * by;
      return [x, y];
    }

    function strokeEdge(c, e, style, width, dash) {
      const { ax, ay, bx, by } = e;
      const mx = (ax + bx) / 2;
      c.strokeStyle = style;
      c.lineWidth = width;
      c.setLineDash(dash || []);
      c.beginPath();
      c.moveTo(X(ax), Y(ay));
      c.bezierCurveTo(X(mx), Y(ay), X(mx), Y(by), X(bx), Y(by));
      c.stroke();
      c.setLineDash([]);
    }

    function edgeKey(e) { return e[0] + '>' + e[1]; }

    /* ---------- draw ---------- */
    function draw(now) {
      const c = ctx;
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.fillStyle = '#0C0E0D';
      c.fillRect(0, 0, W, H);

      // faint schematic grid
      c.strokeStyle = '#151C1A';
      c.lineWidth = 1;
      c.beginPath();
      for (let x = 0; x <= VW; x += 40) { c.moveTo(X(x), Y(0)); c.lineTo(X(x), Y(VH)); }
      for (let y = 0; y <= VH; y += 40) { c.moveTo(X(0), Y(y)); c.lineTo(X(VW), Y(y)); }
      c.stroke();

      const wave = g.waves[waveIdx];
      const liveKeys = wave ? wave.e.map(edgeKey) : [];

      // edges
      for (const ed of g.edges) {
        const e = anchor(ed[0], ed[1]);
        const meta = ed[2] || {};
        const k = edgeKey(ed);
        const settled = doneNodes[ed[1]] && doneNodes[ed[0]];
        let col = '#232B29';
        if (meta.dim) col = '#2A1F21';
        else if (settled) col = '#31423C';
        strokeEdge(c, e, col, Math.max(1, 1.4 * scale), meta.dim ? [4, 4] : null);

        if (meta.label) {
          c.font = `600 ${Math.max(8, 9 * scale)}px "IBM Plex Mono", monospace`;
          c.fillStyle = '#5A3F41';
          c.textAlign = 'center';
          c.fillText(meta.label.toUpperCase(), X((e.ax + e.bx) / 2), Y((e.ay + e.by) / 2) - 6);
        }
      }

      // travelling tokens
      if (wave && phase === 'travel') {
        const t = Math.min(1, (now - phaseStart) / travelMs());
        for (const ed of wave.e) {
          const e = anchor(ed[0], ed[1]);
          strokeEdge(c, e, 'rgba(239,90,22,.55)', Math.max(1.2, 1.8 * scale));
          for (let s = 0; s < 3; s++) {
            const tt = t - s * 0.11;
            if (tt < 0 || tt > 1) continue;
            const [px, py] = pointOn(e, tt);
            const r = Math.max(1.6, (3.4 - s * 0.8) * scale);
            c.beginPath();
            c.arc(X(px), Y(py), r, 0, Math.PI * 2);
            c.fillStyle = s === 0 ? '#FFB088' : 'rgba(239,90,22,.5)';
            c.fill();
          }
        }
      }

      // nodes
      for (const id in g.nodes) {
        const n = g.nodes[id];
        const kk = KIND[n.kind] || KIND.logic;
        const x = X(n.cx - NW / 2), y = Y(n.cy - NH / 2);
        const w = NW * scale, h = NH * scale;
        const isDone = !!doneNodes[id];
        const isLive = wave && wave.e.some((ed) => ed[1] === id) && phase !== 'hold';
        const waiting = n.human && wave && wave.e.some((ed) => ed[0] === id) && phase === 'hold';

        c.fillStyle = n.dim ? '#101413' : (isDone || isLive ? '#151C1A' : '#101413');
        c.fillRect(x, y, w, h);

        let border = n.dim ? '#242B29' : (isDone ? kk.line : '#2C3532');
        if (isLive) border = '#EF5A16';
        if (waiting) border = '#C9A227';
        c.strokeStyle = border;
        c.lineWidth = isLive || waiting ? Math.max(1.4, 2 * scale) : 1;
        c.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);

        // left kind bar
        c.fillStyle = n.dim ? '#2A322F' : kk.line;
        c.globalAlpha = isDone || isLive ? 1 : 0.42;
        c.fillRect(x, y, Math.max(2, 3 * scale), h);
        c.globalAlpha = 1;

        c.textAlign = 'left';
        c.font = `600 ${Math.max(8.5, 11 * scale)}px "IBM Plex Mono", monospace`;
        c.fillStyle = n.dim ? '#4B5350' : (isDone || isLive ? kk.text : '#79837F');
        c.fillText(n.l1, x + 11 * scale, y + h * 0.42);
        c.font = `400 ${Math.max(7.5, 9.5 * scale)}px "IBM Plex Mono", monospace`;
        c.fillStyle = n.dim ? '#3C4442' : '#6E7A76';
        c.fillText(n.l2, x + 11 * scale, y + h * 0.72);

        if (waiting) {
          const pulse = 0.5 + 0.5 * Math.sin(now / 220);
          c.fillStyle = `rgba(201,162,39,${0.35 + 0.5 * pulse})`;
          c.beginPath();
          c.arc(x + w - 11 * scale, y + 12 * scale, Math.max(2, 3.2 * scale), 0, Math.PI * 2);
          c.fill();
          c.font = `600 ${Math.max(7, 8 * scale)}px "IBM Plex Mono", monospace`;
          c.fillStyle = '#C9A227';
          c.textAlign = 'right';
          c.fillText('WAITING', x + w - 20 * scale, y + 15 * scale);
        } else if (isDone && !n.dim) {
          c.fillStyle = kk.line;
          c.beginPath();
          c.arc(x + w - 11 * scale, y + 12 * scale, Math.max(1.8, 2.6 * scale), 0, Math.PI * 2);
          c.fill();
        }
      }

      c.textAlign = 'left';
      c.font = `600 ${Math.max(8.5, 10 * scale)}px "IBM Plex Mono", monospace`;
      c.fillStyle = '#5D6B66';
      c.fillText(g.title, X(8), Y(20));
    }

    function travelMs() { return reduced ? 60 : 700; }

    /* ---------- run loop ---------- */
    function tick(now) {
      const wave = g.waves[waveIdx];
      if (wave) {
        if (phase === 'hold') {
          const hold = reduced ? 40 : (wave.hold || 260);
          if (now - phaseStart > hold) { phase = 'travel'; phaseStart = now; }
        } else if (phase === 'travel') {
          if (now - phaseStart > travelMs()) {
            wave.e.forEach((ed) => { doneNodes[ed[1]] = true; });
            if (wave.emit && opts.onEmit) opts.onEmit(wave.emit);
            waveIdx++;
            phase = 'hold';
            phaseStart = now;
          }
        }
      } else {
        if (now - phaseStart > (reduced ? 1500 : 2400)) restart();
      }
      draw(now);
      raf = requestAnimationFrame(tick);
    }

    const io = new IntersectionObserver((es) => {
      es.forEach((e) => {
        if (e.isIntersecting && !raf) { phaseStart = performance.now(); raf = requestAnimationFrame(tick); }
        else if (!e.isIntersecting && raf) { cancelAnimationFrame(raf); raf = null; }
      });
    }, { threshold: 0.05 });
    io.observe(canvas);

    let rt;
    window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(resize, 120); });

    restart();
    if (opts.onMode) opts.onMode(g);

    return { setMode, restart, graph: () => g };
  }

  global.Pipeline = { mount, GRAPHS };
})(window);
