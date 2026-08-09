/* ============================================================
   swarm.js — 2D port of 02-swarm-viz: grid A* global paths +
   sampling-based reciprocal velocity obstacle (RVO) local
   avoidance, with a separate collision checker acting as the
   referee (it audits frames, it never steers).
   ============================================================ */
(function (global) {
  'use strict';

  const DT = 1 / 60;
  const V_MAX = 3.6;
  const R_AGENT = 0.42;
  const WP_TOL = 0.9;
  const GOAL_TOL = 0.7;
  const TRAIL = 90;
  const CELL = 0.5;

  const WORLD = { x0: -24, x1: 24, y0: -12.5, y1: 12.5 };

  // candidate velocities as (angle offset from preferred, speed fraction)
  const CAND = (function () {
    const out = [[0, 1], [0, 0.72], [0, 0.4]];
    for (const a of [0.26, -0.26, 0.55, -0.55, 0.95, -0.95, 1.5, -1.5, 2.3, -2.3, Math.PI]) {
      out.push([a, 1], [a, 0.55]);
    }
    return out;
  })();

  /* ---------------- world / obstacles ---------------- */

  function box(x0, y0, x1, y1) { return { x0, y0, x1, y1 }; }

  function insideInflated(obs, x, y, pad) {
    return x > obs.x0 - pad && x < obs.x1 + pad && y > obs.y0 - pad && y < obs.y1 + pad;
  }

  function blocked(boxes, x, y, pad) {
    for (let i = 0; i < boxes.length; i++) if (insideInflated(boxes[i], x, y, pad)) return true;
    return false;
  }

  // distance from a point to an AABB, 0 when inside
  function distToBox(b, x, y) {
    const dx = Math.max(b.x0 - x, 0, x - b.x1);
    const dy = Math.max(b.y0 - y, 0, y - b.y1);
    return Math.hypot(dx, dy);
  }

  /* ---------------- grid A* ---------------- */

  function buildGrid(boxes, pad) {
    const nx = Math.ceil((WORLD.x1 - WORLD.x0) / CELL);
    const ny = Math.ceil((WORLD.y1 - WORLD.y0) / CELL);
    const free = new Uint8Array(nx * ny);
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const x = WORLD.x0 + (i + 0.5) * CELL;
        const y = WORLD.y0 + (j + 0.5) * CELL;
        free[j * nx + i] = blocked(boxes, x, y, pad) ? 0 : 1;
      }
    }
    return { nx, ny, free };
  }

  function toCell(g, x, y) {
    return [
      Math.min(g.nx - 1, Math.max(0, Math.floor((x - WORLD.x0) / CELL))),
      Math.min(g.ny - 1, Math.max(0, Math.floor((y - WORLD.y0) / CELL)))
    ];
  }

  function astar(g, sx, sy, gx, gy) {
    const [si, sj] = toCell(g, sx, sy);
    const [gi, gj] = toCell(g, gx, gy);
    const n = g.nx * g.ny;
    const start = sj * g.nx + si, goal = gj * g.nx + gi;
    const gScore = new Float32Array(n).fill(Infinity);
    const came = new Int32Array(n).fill(-1);
    const open = [start];
    const inOpen = new Uint8Array(n);
    gScore[start] = 0;
    inOpen[start] = 1;

    const h = (idx) => {
      const i = idx % g.nx, j = (idx / g.nx) | 0;
      return Math.hypot(i - gi, j - gj);
    };

    // small maps, so a linear-scan priority queue is plenty
    while (open.length) {
      let bi = 0, bf = Infinity;
      for (let k = 0; k < open.length; k++) {
        const f = gScore[open[k]] + h(open[k]);
        if (f < bf) { bf = f; bi = k; }
      }
      const cur = open.splice(bi, 1)[0];
      inOpen[cur] = 0;
      if (cur === goal) break;

      const ci = cur % g.nx, cj = (cur / g.nx) | 0;
      for (let dj = -1; dj <= 1; dj++) {
        for (let di = -1; di <= 1; di++) {
          if (!di && !dj) continue;
          const ni = ci + di, nj = cj + dj;
          if (ni < 0 || nj < 0 || ni >= g.nx || nj >= g.ny) continue;
          const nid = nj * g.nx + ni;
          if (!g.free[nid]) continue;
          if (di && dj && (!g.free[cj * g.nx + ni] || !g.free[nj * g.nx + ci])) continue;
          const t = gScore[cur] + (di && dj ? 1.4142 : 1);
          if (t < gScore[nid]) {
            gScore[nid] = t;
            came[nid] = cur;
            if (!inOpen[nid]) { open.push(nid); inOpen[nid] = 1; }
          }
        }
      }
    }

    if (came[goal] === -1 && goal !== start) return [[gx, gy]];

    const path = [];
    let c = goal;
    while (c !== -1 && c !== start) {
      const i = c % g.nx, j = (c / g.nx) | 0;
      path.push([WORLD.x0 + (i + 0.5) * CELL, WORLD.y0 + (j + 0.5) * CELL]);
      c = came[c];
    }
    path.reverse();
    path.push([gx, gy]);

    // thin the path — keep every 4th waypoint plus the goal
    const thin = path.filter((_, k) => k % 4 === 0);
    thin.push(path[path.length - 1]);
    return thin;
  }

  /* ---------------- scenarios ---------------- */

  const SCENARIOS = {
    corridor: function (n) {
      // wall at x = 0 with three 4 m corridors at y = -6, 0, +6 — the same
      // segment list scenarios.corridor_swap uses
      const boxes = [
        box(-0.9, -12.5, 0.9, -8),
        box(-0.9, -4, 0.9, -2),
        box(-0.9, 2, 0.9, 4),
        box(-0.9, 8, 0.9, 12.5)
      ];
      const per = Math.max(1, Math.round(n / 2));
      const agents = [];
      for (let k = 0; k < per; k++) {
        // lanes spread to 20 m so neighbouring goals never crowd each other
        const y = per === 1 ? 0 : -10 + (20 * k) / (per - 1);
        agents.push({ sx: -19, sy: y, gx: 19, gy: -y, team: 0 });
        agents.push({ sx: 19, sy: y, gx: -19, gy: -y, team: 1 });
      }
      return { boxes, agents: agents.slice(0, n), label: 'CORRIDOR SWAP' };
    },

    antipodal: function (n) {
      const agents = [];
      const r = 10.5;
      for (let k = 0; k < n; k++) {
        const a = (2 * Math.PI * k) / n;
        agents.push({
          sx: r * Math.cos(a) * 1.5, sy: r * Math.sin(a),
          gx: -r * Math.cos(a) * 1.5, gy: -r * Math.sin(a),
          team: k % 2
        });
      }
      return { boxes: [], agents, label: 'ANTIPODAL CIRCLE' };
    },

    warehouse: function (n) {
      const boxes = [];
      for (let c = 0; c < 5; c++) {
        const x = -15 + c * 6.6;
        boxes.push(box(x, -9.5, x + 2.1, -2.4));
        boxes.push(box(x, 2.4, x + 2.1, 9.5));
      }
      // starts and goals are spaced, not random: two agents sharing a spawn
      // point start the run already in contact, which is a setup bug, not a
      // planner failure
      const per = Math.ceil(n / 2);
      const lane = (k) => (per === 1 ? 0 : -10.5 + (21 * k) / (per - 1));
      const agents = [];
      for (let k = 0; k < per; k++) {
        agents.push({ sx: -18.5, sy: lane(k), gx: 18.5, gy: lane(per - 1 - k), team: 0 });
        agents.push({ sx: 18.5, sy: lane(k) * 0.92, gx: -18.5, gy: lane(per - 1 - k) * 0.92, team: 1 });
      }
      return { boxes, agents: agents.slice(0, n), label: 'WAREHOUSE AISLES' };
    }
  };

  /* ---------------- simulation ---------------- */

  function Sim(scenarioKey, n) {
    const spec = SCENARIOS[scenarioKey](n);
    this.boxes = spec.boxes;
    this.label = spec.label;
    this.grid = buildGrid(this.boxes, R_AGENT + 0.25);
    this.agents = spec.agents.map((a) => ({
      x: a.sx, y: a.sy, vx: 0, vy: 0,
      gx: a.gx, gy: a.gy, team: a.team,
      r: R_AGENT,
      path: astar(this.grid, a.sx, a.sy, a.gx, a.gy),
      wp: 0,
      done: false,
      stall: 0,
      trail: []
    }));
    this.collisions = 0;
    this.minSep = Infinity;
    this.ticks = 0;
    this.checks = 0;
    this.near = [];
    this.settled = 0;
  }

  Sim.prototype.step = function () {
    const A = this.agents;
    const N = A.length;
    this.ticks++;

    for (let i = 0; i < N; i++) {
      const a = A[i];
      // carry the current command forward by default — a stale nvx from an
      // earlier tick would otherwise keep re-driving an agent that has parked
      a.nvx = a.vx; a.nvy = a.vy;
      if (a.done) { a.nvx = a.vx * 0.8; a.nvy = a.vy * 0.8; continue; }

      // advance along the A* path
      let tx, ty;
      while (a.wp < a.path.length - 1 &&
             Math.hypot(a.path[a.wp][0] - a.x, a.path[a.wp][1] - a.y) < WP_TOL) a.wp++;
      tx = a.path[a.wp][0]; ty = a.path[a.wp][1];

      const dgx = a.gx - a.x, dgy = a.gy - a.y;
      if (Math.hypot(dgx, dgy) < GOAL_TOL) { a.done = true; a.nvx = a.nvy = 0; continue; }

      let dx = tx - a.x, dy = ty - a.y;
      const d = Math.hypot(dx, dy) || 1;
      const speed = Math.min(V_MAX, Math.max(1.2, d * 2.2));
      let pvx = (dx / d) * speed, pvy = (dy / d) * speed;

      // Right-hand rule. Two agents meeting head-on have a perfectly
      // symmetric cost landscape and will mirror each other into a standoff;
      // a consistent veer to each one's own right breaks the tie the way
      // ORCA's side preference does.
      let headOn = 0;
      for (let j = 0; j < N; j++) {
        if (j === i) continue;
        const b = A[j];
        const rx = b.x - a.x, ry = b.y - a.y;
        const dist = Math.hypot(rx, ry);
        if (dist > 6 || dist < 1e-6) continue;
        if ((pvx * rx + pvy * ry) / dist < 0.55 * speed) continue;      // not ahead of us
        if ((a.vx - b.vx) * rx + (a.vy - b.vy) * ry <= 0) continue;      // not closing
        headOn++;
      }
      if (headOn) {
        const th = -0.42 * Math.min(1, headOn / 2);
        const cs = Math.cos(th), sn = Math.sin(th);
        const rx = pvx * cs - pvy * sn;
        pvy = pvx * sn + pvy * cs;
        pvx = rx;
      }

      // RVO: sample candidate velocities, score by time-to-collision,
      // obstacle penetration and deviation from the preferred velocity.
      // A deterministic ring around the preferred velocity plus a handful of
      // random draws — pure random sampling misses the good candidate often
      // enough to show up as jitter.
      let bestVx = pvx, bestVy = pvy, bestCost = Infinity;
      const base = Math.atan2(pvy, pvx);

      // an agent that has stopped making progress gets progressively more
      // willing to squeeze past — without this, a full corridor deadlocks and
      // nobody ever crosses. The near-collision term below is untouched, so
      // impatience buys tighter passes, never contact.
      const urg = Math.min(1, a.stall / 140);

      // only the walls we could actually reach this tick matter
      const nearBoxes = [];
      for (let q = 0; q < this.boxes.length; q++) {
        if (distToBox(this.boxes[q], a.x, a.y) < 5) nearBoxes.push(this.boxes[q]);
      }
      const nCand = CAND.length + 22;
      for (let s = 0; s < nCand; s++) {
        let cvx, cvy;
        if (s === 0) { cvx = pvx; cvy = pvy; }
        else if (s === 1) { cvx = a.vx; cvy = a.vy; }
        else if (s < CAND.length) {
          const ang = base + CAND[s][0];
          const mag = speed * CAND[s][1];
          cvx = Math.cos(ang) * mag; cvy = Math.sin(ang) * mag;
        } else {
          const ang = Math.random() * Math.PI * 2;
          const mag = Math.random() * V_MAX;
          cvx = Math.cos(ang) * mag; cvy = Math.sin(ang) * mag;
        }

        let cost = (0.9 + 2.4 * urg) * Math.hypot(cvx - pvx, cvy - pvy);

        // obstacle lookahead — graded on clearance, so the planner starts
        // easing away from a wall well before it would clip the corner
        if (nearBoxes.length) {
          const need = a.r + 0.32;
          for (let h = 1; h <= 3; h++) {
            const px = a.x + cvx * h * 0.15, py = a.y + cvy * h * 0.15;
            let dmin = Infinity;
            for (let q = 0; q < nearBoxes.length; q++) {
              const dd = distToBox(nearBoxes[q], px, py);
              if (dd < dmin) dmin = dd;
            }
            if (dmin < need) cost += (25 + 260 * (need - dmin)) / h;
          }
        }
        if (a.x + cvx * 0.4 < WORLD.x0 || a.x + cvx * 0.4 > WORLD.x1 ||
            a.y + cvy * 0.4 < WORLD.y0 || a.y + cvy * 0.4 > WORLD.y1) cost += 25;

        // reciprocal term: assume neighbours take half the avoidance effort
        for (let j = 0; j < N; j++) {
          if (j === i) continue;
          const b = A[j];
          const rx = b.x - a.x, ry = b.y - a.y;
          const distSq = rx * rx + ry * ry;
          if (distSq > 64) continue;

          // heavy but graded penalty for a velocity that puts us inside a
          // neighbour shortly. A hard veto instead of a penalty flattens the
          // cost landscape in a crowd and the agents just stop.
          const hx = rx + b.vx * 0.15 - cvx * 0.15;
          const hy = ry + b.vy * 0.15 - cvy * 0.15;
          const clear = a.r + b.r + 0.10;
          const hd = Math.hypot(hx, hy);
          if (hd < clear) cost += 120 + 400 * (clear - hd);

          const rvx = cvx - (a.vx + b.vx) * 0.5;
          const rvy = cvy - (a.vy + b.vy) * 0.5;
          const rad = a.r + b.r + 0.35;
          const c = distSq - rad * rad;
          if (c < 0) { cost += 60; continue; }
          const bDot = rx * rvx + ry * rvy;
          if (bDot <= 0) continue;
          const aq = rvx * rvx + rvy * rvy;
          const disc = bDot * bDot - aq * c;
          if (disc <= 0) continue;
          const tc = (bDot - Math.sqrt(disc)) / aq;
          if (tc > 0 && tc < 2.4) cost += (4.5 - 3.2 * urg) / tc;
        }

        if (cost < bestCost) { bestCost = cost; bestVx = cvx; bestVy = cvy; }
      }

      // smooth the command so drones don't teleport between samples
      a.nvx = a.vx + (bestVx - a.vx) * 0.42;
      a.nvy = a.vy + (bestVy - a.vy) * 0.42;
    }

    for (let i = 0; i < N; i++) {
      const a = A[i];
      a.vx = a.nvx; a.vy = a.nvy;
      const stepLen = Math.hypot(a.vx, a.vy) * DT;
      a.stall = (!a.done && stepLen < 0.018) ? a.stall + 1 : Math.max(0, a.stall - 3);
      a.x += a.vx * DT;
      a.y += a.vy * DT;
      a.trail.push(a.x, a.y);
      if (a.trail.length > TRAIL * 2) a.trail.splice(0, 2);
    }

    // ---- collision checker: audits the frame, never steers ----
    this.near.length = 0;
    let frameMin = Infinity;
    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        this.checks++;
        const dd = Math.hypot(A[i].x - A[j].x, A[i].y - A[j].y) - A[i].r - A[j].r;
        if (dd < frameMin) frameMin = dd;
        if (dd < 0) this.collisions++;
        else if (dd < 1.1) this.near.push(i, j);
      }
      for (let k = 0; k < this.boxes.length; k++) {
        this.checks++;
        if (insideInflated(this.boxes[k], A[i].x, A[i].y, A[i].r)) this.collisions++;
      }
    }
    if (frameMin < this.minSep) this.minSep = frameMin;
    this.settled = A.filter((a) => a.done).length;
    return this.settled === N;
  };

  /* ---------------- renderer ---------------- */

  function Renderer(canvas) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d');
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.resize();
  }

  Renderer.prototype.resize = function () {
    const r = this.cv.getBoundingClientRect();
    if (!r.width || !r.height) return false;
    this.cv.width = Math.round(r.width * this.dpr);
    this.cv.height = Math.round(r.height * this.dpr);
    this.w = r.width; this.h = r.height;
    const sx = this.w / (WORLD.x1 - WORLD.x0);
    const sy = this.h / (WORLD.y1 - WORLD.y0);
    this.s = Math.min(sx, sy);
    this.ox = (this.w - this.s * (WORLD.x1 - WORLD.x0)) / 2;
    this.oy = (this.h - this.s * (WORLD.y1 - WORLD.y0)) / 2;
    return true;
  };

  Renderer.prototype.px = function (x) { return this.ox + (x - WORLD.x0) * this.s; };
  Renderer.prototype.py = function (y) { return this.oy + (WORLD.y1 - y) * this.s; };

  Renderer.prototype.draw = function (sim, opts) {
    const c = this.ctx, o = opts || {};
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    c.clearRect(0, 0, this.w, this.h);

    c.fillStyle = '#0C0E0D';
    c.fillRect(0, 0, this.w, this.h);

    // world grid
    c.strokeStyle = '#182120';
    c.lineWidth = 1;
    c.beginPath();
    for (let x = WORLD.x0; x <= WORLD.x1; x += 4) {
      c.moveTo(this.px(x), this.py(WORLD.y1)); c.lineTo(this.px(x), this.py(WORLD.y0));
    }
    for (let y = -12; y <= 12; y += 4) {
      c.moveTo(this.px(WORLD.x0), this.py(y)); c.lineTo(this.px(WORLD.x1), this.py(y));
    }
    c.stroke();

    // obstacles
    for (const b of sim.boxes) {
      const x = this.px(b.x0), y = this.py(b.y1);
      const w = (b.x1 - b.x0) * this.s, h = (b.y1 - b.y0) * this.s;
      c.fillStyle = '#161D1B';
      c.fillRect(x, y, w, h);
      c.strokeStyle = '#2B3733';
      c.lineWidth = 1;
      c.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    }

    const COL = ['#74C9EE', '#EF5A16'];

    if (!o.mini) {
      // goals
      c.lineWidth = 1;
      for (const a of sim.agents) {
        const gx = this.px(a.gx), gy = this.py(a.gy);
        c.strokeStyle = a.done ? 'rgba(63,203,146,.55)' : 'rgba(255,255,255,.16)';
        c.beginPath();
        c.moveTo(gx - 4, gy); c.lineTo(gx + 4, gy);
        c.moveTo(gx, gy - 4); c.lineTo(gx, gy + 4);
        c.stroke();
      }
    }

    // trails
    for (const a of sim.agents) {
      const t = a.trail;
      if (t.length < 4) continue;
      c.lineWidth = o.mini ? 1 : 1.4;
      c.lineCap = 'round';
      const steps = t.length / 2;
      for (let k = 1; k < steps; k++) {
        const alpha = (k / steps) * (o.mini ? 0.34 : 0.42);
        c.strokeStyle = COL[a.team] + Math.round(alpha * 255).toString(16).padStart(2, '0');
        c.beginPath();
        c.moveTo(this.px(t[(k - 1) * 2]), this.py(t[(k - 1) * 2 + 1]));
        c.lineTo(this.px(t[k * 2]), this.py(t[k * 2 + 1]));
        c.stroke();
      }
    }

    // near-miss links — the checker's view of the frame
    if (!o.mini && sim.near.length) {
      c.strokeStyle = 'rgba(239,90,22,.34)';
      c.lineWidth = 1;
      c.setLineDash([2, 3]);
      c.beginPath();
      for (let k = 0; k < sim.near.length; k += 2) {
        const a = sim.agents[sim.near[k]], b = sim.agents[sim.near[k + 1]];
        c.moveTo(this.px(a.x), this.py(a.y));
        c.lineTo(this.px(b.x), this.py(b.y));
      }
      c.stroke();
      c.setLineDash([]);
    }

    // agents
    for (const a of sim.agents) {
      const x = this.px(a.x), y = this.py(a.y), r = Math.max(2.6, a.r * this.s);
      c.beginPath();
      c.arc(x, y, r * 2.2, 0, Math.PI * 2);
      c.fillStyle = COL[a.team] + '1a';
      c.fill();
      c.beginPath();
      c.arc(x, y, r, 0, Math.PI * 2);
      c.fillStyle = a.done ? '#3FCB92' : COL[a.team];
      c.fill();
      if (!o.mini && (a.vx || a.vy)) {
        c.strokeStyle = COL[a.team] + '99';
        c.lineWidth = 1.2;
        c.beginPath();
        c.moveTo(x, y);
        c.lineTo(x + a.vx * this.s * 0.28, y - a.vy * this.s * 0.28);
        c.stroke();
      }
    }

    if (!o.mini) {
      c.font = '600 10px "IBM Plex Mono", monospace';
      c.fillStyle = '#5D6B66';
      c.fillText(sim.label, 12, 18);
      c.fillText('t = ' + (sim.ticks / 60).toFixed(1) + ' s', 12, this.h - 12);
    }
  };

  /* ---------------- controller ---------------- */

  function mount(opts) {
    const canvas = opts.canvas;
    if (!canvas) return null;
    const rend = new Renderer(canvas);
    let sim = new Sim(opts.scenario || 'corridor', opts.n || 8);
    let raf = null, running = true, holdFrames = 0;
    let lastCheckTs = performance.now(), lastChecks = 0, rate = 0;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function reset(scenario, n) {
      sim = new Sim(scenario || sim.scenarioKey || opts.scenario || 'corridor', n || sim.agents.length);
      sim.scenarioKey = scenario || sim.scenarioKey;
      holdFrames = 0;
    }

    function frame() {
      if (running) {
        const all = sim.step();
        if (all) {
          holdFrames++;
          if (holdFrames > 110) { reset(sim.scenarioKey, sim.agents.length); }
        } else if (sim.ticks > 60 * 50) {
          // watchdog: a crowded corridor can occasionally leave one agent
          // circling. Start a fresh run rather than sit on a stalled frame.
          reset(sim.scenarioKey, sim.agents.length);
        }
      }
      rend.draw(sim, { mini: !!opts.mini });

      const now = performance.now();
      if (now - lastCheckTs > 450) {
        rate = ((sim.checks - lastChecks) / (now - lastCheckTs)) * 1000;
        lastChecks = sim.checks;
        lastCheckTs = now;
        if (opts.onStats) {
          opts.onStats({
            agents: sim.agents.length,
            settled: sim.settled,
            collisions: sim.collisions,
            minSep: sim.minSep === Infinity ? 0 : sim.minSep,
            rate: rate,
            t: sim.ticks / 60
          });
        }
      }
      raf = requestAnimationFrame(frame);
    }

    const io = new IntersectionObserver((es) => {
      es.forEach((e) => {
        if (e.isIntersecting && !raf) { raf = requestAnimationFrame(frame); }
        else if (!e.isIntersecting && raf) { cancelAnimationFrame(raf); raf = null; }
      });
    }, { threshold: 0.02 });
    io.observe(canvas);

    let rt;
    window.addEventListener('resize', () => {
      clearTimeout(rt);
      rt = setTimeout(() => rend.resize(), 120);
    });

    sim.scenarioKey = opts.scenario || 'corridor';
    if (reduced) { running = false; sim.step(); }

    return {
      reset: reset,
      setScenario: (k) => reset(k, sim.agents.length),
      setCount: (n) => reset(sim.scenarioKey, n),
      toggle: () => { running = !running; return running; },
      isRunning: () => running
    };
  }

  global.Swarm = { mount: mount };
})(window);
