/* ============================================================
   inbox-orchestrator.js — Live n8n Multi-Agent Workflow Simulation
   Accurately models Miguel's production n8n tri-agent inbox system:
   - Outlook Ingest -> Loop Over Items -> AI Orchestrator (Qwen2.5-7B on localhost:1234)
   - Specialized Sub-Agents: Job Application Tracker (Excel tool) & Reply Drafter (Discord human gate)
   - Authentic early filtering (spam drop) and schema validation guardrails
   ============================================================ */

(function (global) {
  'use strict';

  const VW = 1040, VH = 480;
  const NW = 142, NH = 58;

  const NODE_STYLES = {
    outlook:  { bg: '#142129', border: '#0078D4', iconBg: '#0078D4', iconTxt: '✉', text: '#E1F1FD' },
    loop:     { bg: '#172228', border: '#0284C7', iconBg: '#0284C7', iconTxt: '⟳', text: '#E0F2FE' },
    ai:       { bg: '#24192B', border: '#9B51E0', iconBg: '#9B51E0', iconTxt: '🤖', text: '#F6EBFF' },
    submodel: { bg: '#1C152B', border: '#6366F1', iconBg: '#6366F1', iconTxt: '✦', text: '#EEF2FF' },
    track:    { bg: '#16281E', border: '#22C55E', iconBg: '#22C55E', iconTxt: '📋', text: '#DCFCE7' },
    excel:    { bg: '#142820', border: '#107C41', iconBg: '#107C41', iconTxt: '⛁', text: '#D1FAE5' },
    gate:     { bg: '#2B1E14', border: '#EF5A16', iconBg: '#EF5A16', iconTxt: '⏳', text: '#FFEDD5' },
    reply:    { bg: '#142129', border: '#0078D4', iconBg: '#0078D4', iconTxt: '✉', text: '#E1F1FD' },
    fault:    { bg: '#2A171A', border: '#E5484D', iconBg: '#E5484D', iconTxt: '✕', text: '#FFE6E7' }
  };

  function Node(cx, cy, type, title, sub, extra) {
    return Object.assign({ cx, cy, type, title, sub }, extra || {});
  }

  const SCENARIOS = {
    job: {
      title: 'JOB APPLICATION TRACKER // n8n + LOCAL QWEN 7B',
      sub: 'Confirmation Ingest · Structured Entity Extraction → Excel Tool Append',
      nodes: {
        trig:  Node(80,  240, 'outlook',  'Outlook Trigger',      'on email received'),
        loop:  Node(240, 240, 'loop',     'Loop Over Items',      'item #852 of 1000'),
        orch:  Node(420, 240, 'ai',       'AI Orchestrator',      'Qwen2.5-7B (Local)'),
        lm:    Node(420, 390, 'submodel', 'LM Studio :1234',      'OpenAI-compat API'),
        track: Node(670, 140, 'track',    'Job App Tracker',      'parse role & status'),
        excel: Node(900, 140, 'excel',    'Microsoft Excel',      'append row to sheet')
      },
      edges: [
        ['trig', 'loop'],
        ['loop', 'orch'],
        ['orch', 'lm', { sub: true }],
        ['orch', 'track', { label: 'Classify: Job Mail' }],
        ['track', 'excel', { label: 'Extracted JSON' }]
      ],
      waves: [
        { e: [['trig', 'loop']], emit: ['11:36:27 · Outlook trigger: email received from "jobs-noreply@tesla.com"'] },
        { e: [['loop', 'orch']], emit: ['Batch processor: processing item #852 of 1,000 in active queue'] },
        { e: [['orch', 'lm']], emit: ['LM Studio localhost:1234 queried: Qwen2.5-7B returned classification "job_application" (98.4%)'] },
        { e: [['orch', 'track']], emit: ['Routed to Job App Tracker: extracted { company: "Tesla", role: "Mfg Automation", status: "Received" }'] },
        { e: [['track', 'excel']], emit: ['Excel Tool called: Row #852 committed to OneDrive / JobTracking.xlsx (status: OK)'] }
      ]
    },

    interview: {
      title: 'INTERVIEW INVITATION // HUMAN APPROVAL GATE',
      sub: 'Actionable Ingest · Draft Specialist → Discord Webhook Signoff → Outlook Send',
      nodes: {
        trig:  Node(80,  240, 'outlook',  'Outlook Trigger',      'on email received'),
        loop:  Node(240, 240, 'loop',     'Loop Over Items',      'urgent priority'),
        orch:  Node(420, 240, 'ai',       'AI Orchestrator',      'Qwen2.5-7B (Local)'),
        lm:    Node(420, 390, 'submodel', 'LM Studio :1234',      'OpenAI-compat API'),
        drafter: Node(670, 240, 'gate',    'Email-Response Agent', 'draft reply prose'),
        gate:  Node(840, 240, 'gate',     'Discord Gate',         'waiting for reaction', { human: true }),
        send:  Node(970, 240, 'reply',    'Outlook Dispatch',     'send approved draft')
      },
      edges: [
        ['trig', 'loop'],
        ['loop', 'orch'],
        ['orch', 'lm', { sub: true }],
        ['orch', 'drafter', { label: 'Classify: Interview' }],
        ['drafter', 'gate', { label: 'Draft Payload' }],
        ['gate', 'send', { label: 'Human Approved' }]
      ],
      waves: [
        { e: [['trig', 'loop']], emit: ['14:15:10 · Outlook trigger: recruiter invitation from "sarah.h@fanucamerica.com"'] },
        { e: [['loop', 'orch']], emit: ['Batch processor: flagged high-priority inbound request'] },
        { e: [['orch', 'lm']], emit: ['Qwen2.5-7B classified: "interview_request" · Sentiment: urgent · Requires prompt confirmation'] },
        { e: [['orch', 'drafter']], emit: ['Email-Response Agent generated draft: "Hi Sarah, available Tuesday 10am-2pm EST..."'] },
        { e: [['drafter', 'gate']], hold: 1600, emit: ['HUMAN GATE ACTIVE · Discord webhook posted. Awaiting user [APPROVE] reaction...'] },
        { e: [['gate', 'send']], emit: ['Human approval received via Discord! Outbound reply dispatched via Microsoft Outlook.'] }
      ]
    },

    noise: {
      title: 'COLD PROMO & NOISE FILTER // ZERO-TOKEN DISCARD',
      sub: 'Marketing Ingest · Early Classifier Drop · Preserves Downstream LLM Tokens',
      nodes: {
        trig:  Node(80,  240, 'outlook',  'Outlook Trigger',      'on email received'),
        loop:  Node(240, 240, 'loop',     'Loop Over Items',      'scan item #853'),
        orch:  Node(420, 240, 'ai',       'AI Orchestrator',      'Qwen2.5-7B (Local)'),
        lm:    Node(420, 390, 'submodel', 'LM Studio :1234',      'OpenAI-compat API'),
        drop:  Node(730, 240, 'fault',    'Early Discard',        'drop before tools')
      },
      edges: [
        ['trig', 'loop'],
        ['loop', 'orch'],
        ['orch', 'lm', { sub: true }],
        ['orch', 'drop', { label: 'Classify: Marketing/Spam', fault: true }]
      ],
      waves: [
        { e: [['trig', 'loop']], emit: ['09:02:44 · Outlook trigger: email from "outreach@b2bsaaspromo.io"'] },
        { e: [['loop', 'orch']], emit: ['Batch processor: evaluating unsolicited vendor blast'] },
        { e: [['orch', 'lm']], emit: ['Qwen2.5-7B classified: "marketing_spam" (confidence: 99.8%)'] },
        { e: [['orch', 'drop']], emit: ['EARLY DROP · Terminated run without tool calls. Saved 3,200 downstream tokens.'] }
      ]
    },

    guardrail: {
      title: 'SCHEMA GUARDRAIL // DEFECT PROTECTION',
      sub: 'Malformed Email · Missing Key Null-Path · Prevents LLM Field Hallucination',
      nodes: {
        trig:  Node(80,  240, 'outlook',  'Outlook Trigger',      'on email received'),
        loop:  Node(240, 240, 'loop',     'Loop Over Items',      'unstructured text'),
        orch:  Node(420, 240, 'ai',       'AI Orchestrator',      'Qwen2.5-7B (Local)'),
        lm:    Node(420, 390, 'submodel', 'LM Studio :1234',      'OpenAI-compat API'),
        track: Node(670, 140, 'track',    'Job App Tracker',      'schema validator'),
        quar:  Node(900, 140, 'fault',    'Quarantine Log',       'manual inspection')
      },
      edges: [
        ['trig', 'loop'],
        ['loop', 'orch'],
        ['orch', 'lm', { sub: true }],
        ['orch', 'track', { label: 'Missing Fields' }],
        ['track', 'quar', { label: 'Schema Rejection', fault: true }]
      ],
      waves: [
        { e: [['trig', 'loop']], emit: ['16:48:02 · Outlook trigger: notification without sender organization header'] },
        { e: [['loop', 'orch']], emit: ['Batch processor: parsing unstructured recruiter notification'] },
        { e: [['orch', 'lm']], emit: ['Tracker Agent invoked: schema check detects missing "company" property'] },
        { e: [['orch', 'track']], emit: ['GUARDRAIL ACTIVATED: prevented generative hallucination of missing company'] },
        { e: [['track', 'quar']], emit: ['Row routed to manual review queue; zero invalid writes committed to Excel.'] }
      ]
    }
  };

  function mount(opts) {
    const canvas = opts.canvas;
    if (!canvas) return;

    let modeKey = opts.mode || 'job';
    let g = SCENARIOS[modeKey] || SCENARIOS.job;
    const onMode = opts.onMode || (() => {});
    const onEmit = opts.onEmit || (() => {});

    let curWave = 0;
    let waveT0 = performance.now();
    let waveDur = 1100;
    let holdUntil = 0;
    let reqId = null;

    function resetWave(k) {
      modeKey = k;
      g = SCENARIOS[modeKey] || SCENARIOS.job;
      curWave = 0;
      waveT0 = performance.now();
      holdUntil = 0;
      onMode(g);
      onEmit(null); // clear log
    }

    function edgeCoords(from, to, scale, X, Y) {
      const a = g.nodes[from], b = g.nodes[to];
      const hw = (NW / 2) * scale;
      const ax = X(a.cx) + (b.cx > a.cx ? hw : b.cx < a.cx ? -hw : 0);
      const ay = Y(a.cy);
      const bx = X(b.cx) + (b.cx > a.cx ? -hw : b.cx < a.cx ? hw : 0);
      const by = Y(b.cy);
      return { ax, ay, bx, by };
    }

    function drawCard(c, n, isDone, isLive, waiting, now, scale, X, Y) {
      const w = NW * scale;
      const h = NH * scale;
      const x = X(n.cx) - w / 2;
      const y = Y(n.cy) - h / 2;
      const st = NODE_STYLES[n.type] || NODE_STYLES.loop;

      const r = 6 * scale;
      c.beginPath();
      c.roundRect(x, y, w, h, r);
      c.fillStyle = st.bg;
      c.fill();

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
      c.shadowBlur = 0;

      // Icon badge
      const iconSize = h - 10 * scale;
      const iconX = x + 5 * scale;
      const iconY = y + 5 * scale;
      c.beginPath();
      c.roundRect(iconX, iconY, iconSize, iconSize, 4 * scale);
      c.fillStyle = st.iconBg;
      c.fill();

      c.fillStyle = '#FFFFFF';
      c.font = `700 ${Math.max(10, 13 * scale)}px "IBM Plex Mono", monospace`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(st.iconTxt, iconX + iconSize / 2, iconY + iconSize / 2 + 1);

      // Title & Subtitle
      const textX = iconX + iconSize + 7 * scale;
      c.textAlign = 'left';
      c.textBaseline = 'alphabetic';
      c.font = `600 ${Math.max(9, 11 * scale)}px "IBM Plex Sans", -apple-system, sans-serif`;
      c.fillStyle = isDone || isLive ? '#FFFFFF' : '#8A9792';
      c.fillText(n.title, textX, y + 22 * scale, w - (iconSize + 14 * scale));

      c.font = `400 ${Math.max(8, 9.5 * scale)}px "IBM Plex Mono", monospace`;
      c.fillStyle = isDone ? '#A2B3AD' : '#5E6B66';
      c.fillText(n.sub, textX, y + 42 * scale, w - (iconSize + 14 * scale));

      // Ports
      c.beginPath();
      c.arc(x, Y(n.cy), 3.5 * scale, 0, Math.PI * 2);
      c.fillStyle = '#202A26';
      c.fill();
      c.strokeStyle = borderColor;
      c.lineWidth = 1;
      c.stroke();

      c.beginPath();
      c.arc(x + w, Y(n.cy), 3.5 * scale, 0, Math.PI * 2);
      c.fillStyle = '#202A26';
      c.fill();
      c.strokeStyle = borderColor;
      c.lineWidth = 1;
      c.stroke();

      if (waiting) {
        c.font = `700 ${Math.max(7.5, 9 * scale)}px "IBM Plex Mono", monospace`;
        c.fillStyle = '#EF5A16';
        c.textAlign = 'right';
        c.fillText('PAUSED (DISCORD GATE)', x + w - 4 * scale, y - 4 * scale);
      } else if (isDone) {
        c.font = `600 ${Math.max(7.5, 8.5 * scale)}px "IBM Plex Mono", monospace`;
        c.fillStyle = '#3FCB92';
        c.textAlign = 'right';
        c.fillText('✔ EXECUTED', x + w - 4 * scale, y - 4 * scale);
      }
    }

    function strokeEdge(c, a, isDone, isLive, fault, sub, label, scale) {
      const { ax, ay, bx, by } = a;
      const mx = (ax + bx) / 2;

      c.beginPath();
      c.moveTo(ax, ay);
      c.bezierCurveTo(mx, ay, mx, by, bx, by);

      if (fault) {
        c.strokeStyle = isDone ? '#E5484D' : '#4E2429';
        c.lineWidth = isLive ? 2.5 : 1.5;
        c.setLineDash([4 * scale, 4 * scale]);
      } else if (sub) {
        c.strokeStyle = isDone ? '#6366F1' : '#2A294A';
        c.lineWidth = isLive ? 2 : 1.2;
        c.setLineDash([3 * scale, 3 * scale]);
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

      if (label) {
        c.font = `500 ${Math.max(8, 9.5 * scale)}px "IBM Plex Mono", monospace`;
        c.fillStyle = fault ? '#E5484D' : sub ? '#818CF8' : '#8A9792';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        const lx = (ax + bx) / 2;
        const ly = (ay + by) / 2 - 8 * scale;
        c.fillText(label, lx, ly);
      }
    }

    function render(now) {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.floor(rect.width * dpr);
      const h = Math.floor(rect.height * dpr);

      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }

      const c = canvas.getContext('2d');
      c.save();
      c.scale(dpr, dpr);

      const rw = rect.width;
      const rh = rect.height;

      // Dark scanline background
      c.fillStyle = '#0C0E0D';
      c.fillRect(0, 0, rw, rh);

      // n8n dot grid
      c.fillStyle = '#18201D';
      for (let gx = 12; gx < rw; gx += 22) {
        for (let gy = 12; gy < rh; gy += 22) {
          c.fillRect(gx, gy, 1.2, 1.2);
        }
      }

      // Title watermark
      c.font = '700 9px "IBM Plex Mono", monospace';
      c.fillStyle = '#485550';
      c.textAlign = 'left';
      c.fillText(g.title, 14, 20);

      const scale = Math.min(rw / VW, rh / VH) * 0.94;
      const offsetX = (rw - VW * scale) / 2;
      const offsetY = (rh - VH * scale) / 2;

      const X = (x) => offsetX + x * scale;
      const Y = (y) => offsetY + y * scale;

      // Wave timing
      const wave = g.waves[curWave];
      let p = (now - waveT0) / waveDur;

      if (holdUntil > 0) {
        if (now < holdUntil) {
          p = 1.0;
        } else {
          holdUntil = 0;
          curWave++;
          waveT0 = now;
          if (curWave < g.waves.length) {
            onEmit(g.waves[curWave].emit);
            if (g.waves[curWave].hold) holdUntil = now + g.waves[curWave].hold;
          }
        }
      } else if (p >= 1.0) {
        if (wave && wave.hold) {
          holdUntil = now + wave.hold;
        } else {
          curWave++;
          waveT0 = now;
          if (curWave < g.waves.length) {
            onEmit(g.waves[curWave].emit);
            if (g.waves[curWave].hold) holdUntil = now + g.waves[curWave].hold;
          }
        }
      }

      if (curWave >= g.waves.length) {
        if (now - waveT0 > 2400) {
          curWave = 0;
          waveT0 = now;
          holdUntil = 0;
          onEmit(null);
        }
      }

      // Track active/done edges
      const activeEdges = new Set();
      const doneEdges = new Set();
      const doneNodes = new Set();
      const liveNodes = new Set();

      for (let wi = 0; wi < curWave && wi < g.waves.length; wi++) {
        g.waves[wi].e.forEach(([u, v]) => {
          doneEdges.add(`${u}->${v}`);
          doneNodes.add(u);
          doneNodes.add(v);
        });
      }

      if (curWave < g.waves.length) {
        g.waves[curWave].e.forEach(([u, v]) => {
          activeEdges.add(`${u}->${v}`);
          liveNodes.add(u);
          liveNodes.add(v);
        });
      }

      // Draw all n8n wires
      g.edges.forEach(([u, v, extra]) => {
        const key = `${u}->${v}`;
        const isLive = activeEdges.has(key);
        const isDone = doneEdges.has(key);
        const fault = extra && extra.fault;
        const sub = extra && extra.sub;
        const label = extra && extra.label;

        const coords = edgeCoords(u, v, scale, X, Y);
        strokeEdge(c, coords, isDone, isLive, fault, sub, label, scale);
      });

      // Draw animated payload packets
      if (curWave < g.waves.length && holdUntil === 0) {
        const clampedP = Math.min(Math.max(p, 0), 1);
        g.waves[curWave].e.forEach(([u, v]) => {
          const coords = edgeCoords(u, v, scale, X, Y);
          const mx = (coords.ax + coords.bx) / 2;
          const t1 = clampedP;
          const it = 1 - t1;

          const px = it * it * it * coords.ax + 3 * it * it * t1 * mx + 3 * it * t1 * t1 * mx + t1 * t1 * t1 * coords.bx;
          const py = it * it * it * coords.ay + 3 * it * it * t1 * coords.ay + 3 * it * t1 * t1 * coords.by + t1 * t1 * t1 * coords.by;

          c.beginPath();
          c.arc(px, py, 4.5 * scale, 0, Math.PI * 2);
          c.fillStyle = '#EF5A16';
          c.shadowColor = '#EF5A16';
          c.shadowBlur = 10;
          c.fill();
          c.shadowBlur = 0;
        });
      }

      // Draw all nodes
      Object.keys(g.nodes).forEach((k) => {
        const n = g.nodes[k];
        const isDone = doneNodes.has(k);
        const isLive = liveNodes.has(k);
        const waiting = Boolean(n.human && holdUntil > 0 && isLive);
        drawCard(c, n, isDone, isLive, waiting, now, scale, X, Y);
      });

      c.restore();
      reqId = requestAnimationFrame(render);
    }

    onMode(g);
    if (g.waves.length > 0) onEmit(g.waves[0].emit);
    reqId = requestAnimationFrame(render);

    return {
      setMode(k) { resetWave(k); },
      restart() { resetWave(modeKey); },
      destroy() { if (reqId) cancelAnimationFrame(reqId); }
    };
  }

  global.InboxPipeline = { mount };
})(window);
