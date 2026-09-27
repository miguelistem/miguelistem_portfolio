/* ============================================================
   pipeline.js — Authentic n8n Workflow Engine Simulation
   Models the real n8n production workflows from project captures:
   1. Event: Outlook Calendar Sync & Change Detection (from n8n-calendar-sync.webp)
   2. Scheduled: Shift Handoff Briefing (06:00 Manager Summary)
   3. Threshold: Material Depletion & PO Warning (Lead-time burn-down)
   4. Human Gate: Order Production Approval Chain (Multi-dept signoff)
   ============================================================ */

(function (global) {
  'use strict';

  const VW = 1040, VH = 480;
  const NW = 142, NH = 58;

  // n8n Category color themes matching real n8n node icons
  const NODE_STYLES = {
    trigger: { bg: '#1E2522', border: '#FF6D5A', iconBg: '#FF6D5A', iconTxt: '⚡', text: '#FFEAE6' },
    cron:    { bg: '#1E2522', border: '#FF6D5A', iconBg: '#FF6D5A', iconTxt: '⏰', text: '#FFEAE6' },
    outlook: { bg: '#142129', border: '#0078D4', iconBg: '#0078D4', iconTxt: '✉', text: '#E1F1FD' },
    db:      { bg: '#162329', border: '#336791', iconBg: '#336791', iconTxt: '⛁', text: '#DCEDF9' },
    code:    { bg: '#1F2420', border: '#4E9F3D', iconBg: '#4E9F3D', iconTxt: '{ }', text: '#E5F7E2' },
    switch:  { bg: '#262215', border: '#F0A000', iconBg: '#F0A000', iconTxt: '⌥', text: '#FDF3DC' },
    ai:      { bg: '#24192B', border: '#9B51E0', iconBg: '#9B51E0', iconTxt: '✦', text: '#F6EBFF' },
    gate:    { bg: '#292314', border: '#EF5A16', iconBg: '#EF5A16', iconTxt: '⏳', text: '#FFEFE6' },
    out:     { bg: '#14261F', border: '#3FCB92', iconBg: '#3FCB92', iconTxt: '✔', text: '#DDF9EC' },
    fault:   { bg: '#2A171A', border: '#E5484D', iconBg: '#E5484D', iconTxt: '✕', text: '#FFE6E7' }
  };

  function Node(cx, cy, type, title, sub, extra) {
    return Object.assign({ cx, cy, type, title, sub }, extra || {});
  }

  const GRAPHS = {
    // Exact reproduction of n8n-calendar-sync.webp
    event: {
      title: 'CALENDAR SYNC & RECONCILIATION // n8n WORKFLOW',
      sub: 'Event Driven · Outlook line calendars merged with factory.db SQL planned schedule',
      nodes: {
        t:   Node(80,  230, 'trigger', 'Schedule / Webhook', 'on 15m polling'),
        c1:  Node(240, 130, 'outlook', '5 Line Calendars', 'fetch Outlook events'),
        sql: Node(240, 330, 'db',      'SQL factory.db',   'pull planned orders'),
        dif: Node(410, 230, 'code',    'Change Detection', 'diff timestamp & ID'),
        sw:  Node(570, 230, 'switch',  'Rules Switch',     'valid vs conflict'),
        
        // Accept branch (upper)
        em:  Node(730, 130, 'outlook', 'Approval Email',   'send to plant mgr'),
        gt:  Node(880, 130, 'gate',    'Human Webhook Gate','waiting for click', { human: true }),
        up:  Node(990, 230, 'out',     'Sync Calendar & DB','commit audit row'),
        
        // Reject branch (lower)
        ai:  Node(730, 330, 'ai',      'LLM Diagnostics',  'explain conflict'),
        bn:  Node(880, 330, 'fault',   'Bounce Notice',    'delete invalid item')
      },
      edges: [
        ['t', 'c1'], ['t', 'sql'],
        ['c1', 'dif'], ['sql', 'dif'],
        ['dif', 'sw'],
        ['sw', 'em', { label: 'Valid Move' }],
        ['em', 'gt'],
        ['gt', 'up'],
        ['sw', 'ai', { label: 'Conflict / Invalid', fault: true }],
        ['ai', 'bn', { fault: true }]
      ],
      waves: [
        { e: [['t','c1'], ['t','sql']], emit: ['14:30:00 · Webhook triggered: schedule scan started'] },
        { e: [['c1','dif'], ['sql','dif']], emit: ['Fetched 5 line calendars (42 events) + 301 SQL ledger rows'] },
        { e: [['dif','sw']], emit: ['Diff detected: Line 2 ORD-10293 shifted forward by +4.5 hrs'] },
        { e: [['sw','em']], emit: ['Rules check: slot available. Dispatched Actionable Message to manager'] },
        { e: [['em','gt']], hold: 1400, emit: ['HUMAN GATE ACTIVE · Waiting for manager email click...'] },
        { e: [['gt','up']], emit: ['Manager approved! Synced Outlook calendar and committed factory.db ledger.'] }
      ]
    },

    scheduled: {
      title: 'SHIFT BRIEFING AUTOMATION // 06:00 CRON',
      sub: 'Scheduled · Runs 1 hour before shift handoff to brief incoming crew',
      nodes: {
        t:   Node(80,  230, 'cron',    'Cron 06:00',       'shift change trigger'),
        sh:  Node(260, 120, 'db',      'Shift Records',    'pull outgoing crew'),
        ro:  Node(260, 230, 'db',      'Production Rolls', 'extract roll counts'),
        ev:  Node(260, 340, 'db',      'Extruder Events',  'stops, faults, downtime'),
        ef:  Node(460, 230, 'code',    'Line Efficiency',  'calc actual vs target'),
        ai:  Node(660, 230, 'ai',      'Qwen 7B Narrator', 'numbers → briefing prose'),
        gw:  Node(830, 230, 'gate',    'Accuracy Gate',    'verify anomaly flags'),
        ml:  Node(980, 230, 'out',     'Manager Outlook',  'send morning briefing')
      },
      edges: [
        ['t', 'sh'], ['t', 'ro'], ['t', 'ev'],
        ['sh', 'ef'], ['ro', 'ef'], ['ev', 'ef'],
        ['ef', 'ai'], ['ai', 'gw'], ['gw', 'ml']
      ],
      waves: [
        { e: [['t','sh'],['t','ro'],['t','ev']], emit: ['06:00:00 · Shift cron fired for morning handoff'] },
        { e: [['sh','ef'],['ro','ef'],['ev','ef']], emit: ['Overnight aggregate: 48 rolls logged (40.1 k-lb)'] },
        { e: [['ef','ai']], emit: ['Line 2 operated at 61% target due to 03:10 extruder heater fault (90 min)'] },
        { e: [['ai','gw']], emit: ['LLM generated concise explanation attributing gap to fault, not crew pace'] },
        { e: [['gw','ml']], emit: ['Briefing verified and delivered to Operations Manager Outlook inbox'] }
      ]
    },

    threshold: {
      title: 'MATERIAL DEPLETION MONITOR // PREDICTIVE FORECAST',
      sub: 'Threshold · Evaluates raw resin burn-down against supplier lead times',
      nodes: {
        t:   Node(80,  230, 'cron',    'Interval 30m',     'material ledger scan'),
        st:  Node(260, 140, 'db',      'Material Stock',   'balance_after_lb'),
        sc:  Node(260, 320, 'db',      'Committed Queue',  '6-week order demand'),
        fc:  Node(460, 230, 'code',    'Depletion Model',  'burn rate vs lead time'),
        sw:  Node(640, 230, 'switch',  'Stockout Risk?',   'cover < 14 days?'),
        al:  Node(840, 140, 'fault',   'Procurement Alert','PO draft generated'),
        ok:  Node(840, 320, 'out',     'Sufficient Stock', 'log safe operating reserve')
      },
      edges: [
        ['t','st'], ['t','sc'],
        ['st','fc'], ['sc','fc'],
        ['fc','sw'],
        ['sw','al', { label: 'Deficit Risk', fault: true }],
        ['sw','ok', { label: 'Adequate Stock' }]
      ],
      waves: [
        { e: [['t','st'],['t','sc']], emit: ['Scanning 12 material silos against active line queue'] },
        { e: [['st','fc'],['sc','fc']], emit: ['Resin PET on-hand: 9,000 lb. Projected 14-day need: 141,000 lb'] },
        { e: [['fc','sw']], emit: ['Lead-time threshold breach: PET cover drops to 2.8 days (threshold = 14 d)'] },
        { e: [['sw','al']], emit: ['CRITICAL SHORTFALL: Line 3 will stall in 3 days. Automated PO draft sent!'] }
      ]
    },

    human: {
      title: 'ORDER APPROVAL CHAIN // STATE MACHINE',
      sub: 'Human-in-the-Loop · Order state machine that pauses on humans and resumes on commit',
      nodes: {
        t:   Node(80,  230, 'trigger', 'New Sales Order',  'ORD-10305 submitted'),
        c1:  Node(270, 130, 'gate',    'Chemical Approval','feedstock verification', { human: true }),
        c2:  Node(270, 330, 'gate',    'Line Capacity',    'slot feasibility signoff', { human: true }),
        jn:  Node(470, 230, 'code',    'Barrier Join',     'wait for both approvals'),
        mg:  Node(680, 230, 'gate',    'Management Exec',  'final executive gate', { human: true }),
        db:  Node(870, 230, 'db',      'Postgres Commit',  'insert into prod queue'),
        ok:  Node(990, 230, 'out',     'Order Scheduled',  'notify plant & customer')
      },
      edges: [
        ['t','c1'], ['t','c2'],
        ['c1','jn'], ['c2','jn'],
        ['jn','mg'], ['mg','db'], ['db','ok']
      ],
      waves: [
        { e: [['t','c1'],['t','c2']], emit: ['ORD-10305 dispatched to Chemical Lab and Line Supervisors'] },
        { e: [['c1','jn']], hold: 900, emit: ['Chemical lab confirmed resin blend lot #44-A'] },
        { e: [['c2','jn']], hold: 600, emit: ['Manufacturing confirmed Line 4 window open Aug 14'] },
        { e: [['jn','mg']], emit: ['Both prerequisite gates cleared. Order elevated to Plant Manager'] },
        { e: [['mg','db']], hold: 1100, emit: ['Plant Manager signed off via mobile webhook'] },
        { e: [['db','ok']], emit: ['Order committed to production queue with full cryptographic audit trail.'] }
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

    let key = opts.mode || 'event';
    let g = GRAPHS[key] || GRAPHS.event;
    let waveIdx = 0, phase = 'hold', phaseStart = 0, doneNodes = {}, activeEdges = [];
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
      doneNodes = {}; activeEdges = [];
      doneNodes[Object.keys(g.nodes)[0]] = true;
      if (opts.onEmit) opts.onEmit(null);
    }

    function setMode(k) {
      if (!GRAPHS[k]) return;
      key = k; g = GRAPHS[k];
      if (opts.onMode) opts.onMode(g);
      restart();
    }

    const X = (x) => offX + x * scale;
    const Y = (y) => offY + y * scale;

    function anchor(from, to) {
      const a = g.nodes[from], b = g.nodes[to];
      const hw = (NW / 2) * scale;
      const ax = X(a.cx) + (b.cx > a.cx ? hw : b.cx < a.cx ? -hw : 0);
      const ay = Y(a.cy);
      const bx = X(b.cx) + (b.cx > a.cx ? -hw : b.cx < a.cx ? hw : 0);
      const by = Y(b.cy);
      return { ax, ay, bx, by };
    }

    function drawCard(c, n, isDone, isLive, waiting, now) {
      const w = NW * scale;
      const h = NH * scale;
      const x = X(n.cx) - w / 2;
      const y = Y(n.cy) - h / 2;
      const st = NODE_STYLES[n.type] || NODE_STYLES.code;

      // Card body with rounded corners
      const r = 6 * scale;
      c.beginPath();
      c.roundRect(x, y, w, h, r);
      c.fillStyle = st.bg;
      c.fill();

      // Border glow when live or waiting
      let borderColor = isDone ? st.border : '#2B3732';
      let borderWidth = 1;

      if (isLive) {
        borderColor = '#EF5A16';
        borderWidth = 2;
        c.shadowColor = 'rgba(239, 90, 22, 0.4)';
        c.shadowBlur = 10;
      } else if (waiting) {
        const pulse = 0.5 + 0.5 * Math.sin(now / 180);
        borderColor = `rgba(239, 90, 22, ${0.4 + 0.6 * pulse})`;
        borderWidth = 2;
        c.shadowColor = 'rgba(239, 90, 22, 0.5)';
        c.shadowBlur = 12;
      }

      c.lineWidth = borderWidth;
      c.strokeStyle = borderColor;
      c.stroke();
      c.shadowBlur = 0; // reset shadow

      // Left Icon square (n8n node style)
      const iconSize = h - 10 * scale;
      const iconX = x + 5 * scale;
      const iconY = y + 5 * scale;
      c.beginPath();
      c.roundRect(iconX, iconY, iconSize, iconSize, 4 * scale);
      c.fillStyle = st.iconBg;
      c.fill();

      // Icon symbol
      c.fillStyle = '#FFFFFF';
      c.font = `700 ${Math.max(10, 13 * scale)}px "IBM Plex Mono", monospace`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(st.iconTxt, iconX + iconSize / 2, iconY + iconSize / 2 + 1);

      // Node title text
      const textX = iconX + iconSize + 7 * scale;
      c.textAlign = 'left';
      c.textBaseline = 'alphabetic';
      c.font = `600 ${Math.max(9, 11 * scale)}px "IBM Plex Sans", -apple-system, sans-serif`;
      c.fillStyle = isDone || isLive ? '#FFFFFF' : '#8A9792';
      c.fillText(n.title, textX, y + 22 * scale, w - (iconSize + 16 * scale));

      // Node subtitle / action
      c.font = `400 ${Math.max(8, 9.5 * scale)}px "IBM Plex Mono", monospace`;
      c.fillStyle = isDone ? '#A2B3AD' : '#5E6B66';
      c.fillText(n.sub, textX, y + 42 * scale, w - (iconSize + 16 * scale));

      // Input port circle on left
      c.beginPath();
      c.arc(x, Y(n.cy), 3.5 * scale, 0, Math.PI * 2);
      c.fillStyle = '#202A26';
      c.fill();
      c.strokeStyle = borderColor;
      c.lineWidth = 1;
      c.stroke();

      // Output port circle on right
      c.beginPath();
      c.arc(x + w, Y(n.cy), 3.5 * scale, 0, Math.PI * 2);
      c.fillStyle = '#202A26';
      c.fill();
      c.strokeStyle = borderColor;
      c.lineWidth = 1;
      c.stroke();

      // Execution status badge
      if (waiting) {
        c.font = `700 ${Math.max(7.5, 9 * scale)}px "IBM Plex Mono", monospace`;
        c.fillStyle = '#EF5A16';
        c.textAlign = 'right';
        c.fillText('PAUSED (GATE)', x + w - 4 * scale, y - 4 * scale);
      } else if (isDone) {
        c.font = `600 ${Math.max(7.5, 8.5 * scale)}px "IBM Plex Mono", monospace`;
        c.fillStyle = '#3FCB92';
        c.textAlign = 'right';
        c.fillText('✔ EXECUTED', x + w - 4 * scale, y - 4 * scale);
      }
    }

    function strokeN8nEdge(c, a, isDone, isLive, fault, label) {
      const { ax, ay, bx, by } = a;
      const mx = (ax + bx) / 2;

      c.beginPath();
      c.moveTo(ax, ay);
      c.bezierCurveTo(mx, ay, mx, by, bx, by);

      if (fault) {
        c.strokeStyle = isDone ? '#E5484D' : '#4E2429';
        c.lineWidth = isLive ? 2.5 : 1.5;
        c.setLineDash([4 * scale, 4 * scale]);
      } else if (isLive) {
        c.strokeStyle = '#EF5A16';
        c.lineWidth = 2.5;
        c.setLineDash([]);
      } else if (isDone) {
        c.strokeStyle = '#3FCB92';
        c.lineWidth = 1.5;
        c.setLineDash([]);
      } else {
        c.strokeStyle = '#27342F';
        c.lineWidth = 1;
        c.setLineDash([]);
      }

      c.stroke();
      c.setLineDash([]);

      // Optional edge branch label
      if (label) {
        c.font = `500 ${Math.max(8, 9.5 * scale)}px "IBM Plex Mono", monospace`;
        c.fillStyle = fault ? '#E5484D' : '#8A9792';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText(label, mx, (ay + by) / 2 - 8 * scale);
      }
    }

    function draw(now) {
      const c = ctx;
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.fillStyle = '#0C0E0D';
      c.fillRect(0, 0, W, H);

      // n8n dotted grid canvas background
      c.fillStyle = '#18221E';
      const dotSpacing = 24 * scale;
      for (let gx = offX % dotSpacing; gx < W; gx += dotSpacing) {
        for (let gy = offY % dotSpacing; gy < H; gy += dotSpacing) {
          c.fillRect(gx, gy, 1.2, 1.2);
        }
      }

      // Draw all connection edges
      g.edges.forEach((ed) => {
        const fromId = ed[0], toId = ed[1];
        const extra = ed[2] || {};
        const isDone = doneNodes[fromId] && doneNodes[toId];
        const isLive = activeEdges.some(ae => ae[0] === fromId && ae[1] === toId);
        const a = anchor(fromId, toId);
        strokeN8nEdge(c, a, isDone, isLive, extra.fault, extra.label);
      });

      // Draw live animated data packets traveling along edges
      if (phase === 'travel' && activeEdges.length) {
        const t = Math.min(1, Math.max(0, (now - phaseStart) / travelMs()));
        activeEdges.forEach((ed) => {
          const a = anchor(ed[0], ed[1]);
          const mx = (a.ax + a.bx) / 2;
          const u = 1 - t;
          const px = u * u * u * a.ax + 3 * u * u * t * mx + 3 * u * t * t * mx + t * t * t * a.bx;
          const py = u * u * u * a.ay + 3 * u * u * t * a.ay + 3 * u * t * t * a.by + t * t * t * a.by;

          c.beginPath();
          c.arc(px, py, Math.max(3.5, 5 * scale), 0, Math.PI * 2);
          c.fillStyle = '#EF5A16';
          c.shadowColor = 'rgba(239, 90, 22, 0.8)';
          c.shadowBlur = 10;
          c.fill();
          c.shadowBlur = 0;
        });
      }

      // Draw all n8n node cards
      Object.keys(g.nodes).forEach((id) => {
        const n = g.nodes[id];
        const isDone = !!doneNodes[id];
        const isLive = activeEdges.some(ae => ae[1] === id);
        const waiting = n.human && isLive && phase === 'hold';
        drawCard(c, n, isDone, isLive, waiting, now);
      });

      // Canvas Header HUD
      c.textAlign = 'left';
      c.textBaseline = 'top';
      c.font = `700 ${Math.max(9, 10.5 * scale)}px "IBM Plex Mono", monospace`;
      c.fillStyle = '#6E7C77';
      c.fillText(g.title, offX + 12 * scale, offY + 12 * scale);
    }

    function travelMs() { return reduced ? 60 : 750; }

    function tick(now) {
      const wave = g.waves[waveIdx];
      if (wave) {
        if (phase === 'hold') {
          activeEdges = [];
          const hold = reduced ? 40 : (wave.hold || 340);
          if (now - phaseStart > hold) {
            phase = 'travel';
            phaseStart = now;
            activeEdges = wave.e.slice();
          }
        } else if (phase === 'travel') {
          if (now - phaseStart > travelMs()) {
            wave.e.forEach((ed) => { doneNodes[ed[1]] = true; });
            if (wave.emit && opts.onEmit) opts.onEmit(wave.emit);
            waveIdx++;
            phase = 'hold';
            phaseStart = now;
            activeEdges = [];
          }
        }
      } else {
        // Run completed: hold final state for 4.5 seconds, then replay
        if (now - phaseStart > 4500) {
          restart();
        }
      }

      draw(now);
      raf = requestAnimationFrame(tick);
    }

    raf = requestAnimationFrame(tick);

    window.addEventListener('resize', () => {
      resize();
    });

    return {
      setMode,
      restart,
      destroy: () => {
        if (raf) cancelAnimationFrame(raf);
      }
    };
  }

  global.Pipeline = { mount, GRAPHS };
})(window);
