/* ============================================================
   coach.js — the review loop from chess-coach-ai, in the
   browser: engine evaluation on the left, the LLM's reading of
   it on the right. The engine finds the mistake; the model
   explains it; the tool chips show what it looked at.
   ============================================================ */
(function (global) {
  'use strict';

  /* Two Knights Defence → Fried Liver. The student is Black. */
  const LINE = [
    {
      san: null, ply: 0,
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      cp: 20, cls: 'book',
      tools: ['show_position'],
      text: 'Pulled 214 of your games off chess.com and ran every move through Stockfish. This one is a loss as Black, and it follows a pattern I keep seeing in your history.'
    },
    { san: 'e4',   ply: 1, fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1', cp: 30, cls: 'book', tools: ['show_position'], text: 'Standard opening move.' },
    { san: 'e5',   ply: 2, fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2', cp: 22, cls: 'book', tools: ['show_position'], text: 'You meet it in the centre, like you do in 78% of your Black games.' },
    { san: 'Nf3',  ply: 3, fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2', cp: 28, cls: 'book', tools: ['show_position'], text: 'White hits e5.' },
    { san: 'Nc6',  ply: 4, fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3', cp: 24, cls: 'book', tools: ['show_position'], text: 'You defend it. Nothing to say yet.' },
    { san: 'Bc4',  ply: 5, fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3', cp: 30, cls: 'book', tools: ['show_position'], text: 'The bishop aims at f7 — the square your king has not castled away from yet. Keep an eye on it.' },
    { san: 'Nf6',  ply: 6, fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4', cp: 26, cls: 'book', tools: ['show_position'], text: 'Two Knights Defence. You reach this position in about a third of your games as Black, and you score 31% from here — your worst opening by a wide margin.' },
    { san: 'Ng5',  ply: 7, fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p1N1/2B1P3/8/PPPP1PPP/RNBQK2R b KQkq - 5 4', cp: 34, cls: 'book', tools: ['worst_mistakes'], text: 'And here is the fork in the road. Six of your last nine losses as Black went through this exact position.' },
    { san: 'd5',   ply: 8, fen: 'r1bqkb1r/ppp2ppp/2n2n2/3pp1N1/2B1P3/8/PPPP1PPP/RNBQK2R w KQkq d6 0 5', cp: 40, cls: 'good', tools: ['show_position'], text: 'Right idea. You have to hit that bishop before it does damage.' },
    { san: 'exd5', ply: 9, fen: 'r1bqkb1r/ppp2ppp/2n2n2/3Pp1N1/2B5/8/PPPP1PPP/RNBQK2R b KQkq - 0 5', cp: 48, cls: 'book', tools: ['show_position'], text: 'White takes. Now the decision that decides the game.' },
    {
      san: 'Nxd5', ply: 10,
      fen: 'r1bqkb1r/ppp2ppp/2n5/3np1N1/2B5/8/PPPP1PPP/RNBQK2R w KQkq - 0 6',
      cp: 195, cls: 'blunder',
      tools: ['worst_mistakes', 'top_engine_moves', 'try_line'],
      arrow: ['c6', 'a5'],
      text: '<span class="flag">This is the move.</span> Taking the pawn back feels obvious, but the knight on d5 no longer guards f7 — and both of White\'s pieces are already pointed there. <span class="good">Na5</span> is what you want: chase the bishop off the f7 diagonal first, take the pawn later. You have played Nxd5 here eleven times. You have lost nine of them.'
    },
    { san: 'Nxf7', ply: 11, fen: 'r1bqkb1r/ppp2Npp/2n5/3np3/2B5/8/PPPP1PPP/RNBQK2R b KQkq - 0 6', cp: 262, cls: 'sharp', tools: ['try_line'], text: 'The Fried Liver. The knight is free to take because f7 is only defended by the king.' },
    { san: 'Kxf7', ply: 12, fen: 'r1bq1b1r/ppp2kpp/2n5/3np3/2B5/8/PPPP1PPP/RNBQK2R w KQ - 0 7', cp: 240, cls: 'forced', tools: ['try_move'], text: 'Forced. You are up a piece for two pawns, but your king is on f7 and cannot castle for the rest of the game.' },
    { san: 'Qf3+', ply: 13, fen: 'r1bq1b1r/ppp2kpp/2n5/3np3/2B5/5Q2/PPPP1PPP/RNB1K2R b KQ - 1 7', cp: 275, cls: 'sharp', tools: ['top_engine_moves'], text: 'And every move from here comes with check. <b>The fix is one move deep:</b> when the bishop is on c4 and a knight lands on g5, look at f7 before you look at the free pawn.' }
  ];

  // Every piece is drawn twice: the solid glyph paints the silhouette, the
  // outline glyph on top paints the line art. Same silhouette, so they align.
  const WHITE_GLYPH = { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' };
  const BLACK_GLYPH = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
  const FILES = 'abcdefgh';

  function parseFen(fen) {
    const rows = fen.split(' ')[0].split('/');
    const board = [];
    for (let r = 0; r < 8; r++) {
      const row = [];
      for (const ch of rows[r]) {
        if (/\d/.test(ch)) { for (let k = 0; k < +ch; k++) row.push(null); }
        else row.push({ type: ch.toLowerCase(), white: ch === ch.toUpperCase() });
      }
      board.push(row);
    }
    return board; // board[0] is rank 8
  }

  function sqToRC(sq) {
    const f = FILES.indexOf(sq[0]);
    const r = 8 - parseInt(sq[1], 10);
    return [r, f];
  }

  function mount(opts) {
    const canvas = opts.canvas;
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const flip = true; // student plays Black — show their side of the board
    let idx = 0, size = 0, sq = 0;
    let typeTimer = null;
    let autoTimer = null;
    let playing = false;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function resize() {
      const r = canvas.getBoundingClientRect();
      if (!r.width) return;
      size = r.width;
      canvas.width = Math.round(size * dpr);
      canvas.height = Math.round(size * dpr);
      canvas.style.height = size + 'px';
      sq = size / 8;
      draw();
    }

    function xy(r, f) {
      return flip ? [(7 - f) * sq, (7 - r) * sq] : [f * sq, r * sq];
    }

    function draw() {
      if (!size) return;
      const c = ctx;
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      const st = LINE[idx];
      const board = parseFen(st.fen);

      for (let r = 0; r < 8; r++) {
        for (let f = 0; f < 8; f++) {
          const [x, y] = xy(r, f);
          c.fillStyle = (r + f) % 2 === 0 ? '#A7B2AC' : '#4A5852';
          c.fillRect(x, y, sq + 0.5, sq + 0.5);
        }
      }

      // last move squares
      if (st.san && idx > 0) {
        const prev = parseFen(LINE[idx - 1].fen);
        for (let r = 0; r < 8; r++) {
          for (let f = 0; f < 8; f++) {
            const a = prev[r][f], b = board[r][f];
            const changed = (!a && b) || (a && !b) || (a && b && (a.type !== b.type || a.white !== b.white));
            if (changed) {
              const [x, y] = xy(r, f);
              c.fillStyle = st.cls === 'blunder' ? 'rgba(229,72,77,.42)' : 'rgba(239,90,22,.30)';
              c.fillRect(x, y, sq, sq);
            }
          }
        }
      }

      // coordinates
      c.font = `600 ${Math.max(8, sq * 0.16)}px "IBM Plex Mono", monospace`;
      for (let f = 0; f < 8; f++) {
        const [x, y] = xy(0, f); // rank 8 sits on the bottom edge when flipped
        c.fillStyle = f % 2 === 0 ? '#5A6660' : '#93A09A';
        c.textAlign = 'left';
        c.fillText(FILES[f], x + 3, y + sq - 4);
      }
      for (let r = 0; r < 8; r++) {
        const [x, y] = xy(r, 0); // file a sits on the right edge when flipped
        c.fillStyle = r % 2 === 0 ? '#5A6660' : '#93A09A';
        c.textAlign = 'right';
        c.fillText(String(8 - r), x + sq - 3, y + sq * 0.2 + 5);
      }

      // pieces
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.font = `${sq * 0.78}px "Segoe UI Symbol", "Apple Symbols", "DejaVu Sans", "Noto Sans Symbols 2", serif`;
      for (let r = 0; r < 8; r++) {
        for (let f = 0; f < 8; f++) {
          const p = board[r][f];
          if (!p) continue;
          const [x, y] = xy(r, f);
          const cx = x + sq / 2, cy = y + sq / 2 + sq * 0.02;
          // solid glyph paints the silhouette, the outline glyph on top adds
          // the line art. Two fills beat fill+stroke — a stroke on these
          // glyphs swallows the detail on the denser pieces.
          c.fillStyle = p.white ? '#F4F6F3' : '#111615';
          c.fillText(BLACK_GLYPH[p.type], cx, cy);
          c.fillStyle = p.white ? '#0E1211' : '#AEBCB6';
          c.fillText(WHITE_GLYPH[p.type], cx, cy);
        }
      }
      c.textBaseline = 'alphabetic';

      // engine's recommendation
      if (st.arrow) {
        const [fr, ff] = sqToRC(st.arrow[0]);
        const [tr, tf] = sqToRC(st.arrow[1]);
        const [x1, y1] = xy(fr, ff);
        const [x2, y2] = xy(tr, tf);
        const ax = x1 + sq / 2, ay = y1 + sq / 2, bx = x2 + sq / 2, by = y2 + sq / 2;
        const ang = Math.atan2(by - ay, bx - ax);
        const head = sq * 0.3;
        const ex = bx - Math.cos(ang) * head * 0.7;
        const ey = by - Math.sin(ang) * head * 0.7;
        c.strokeStyle = 'rgba(63,203,146,.92)';
        c.lineWidth = sq * 0.11;
        c.lineCap = 'round';
        c.beginPath();
        c.moveTo(ax, ay); c.lineTo(ex, ey);
        c.stroke();
        c.fillStyle = 'rgba(63,203,146,.92)';
        c.beginPath();
        c.moveTo(bx, by);
        c.lineTo(bx - Math.cos(ang - 0.42) * head, by - Math.sin(ang - 0.42) * head);
        c.lineTo(bx - Math.cos(ang + 0.42) * head, by - Math.sin(ang + 0.42) * head);
        c.closePath();
        c.fill();
      }
    }

    function typeInto(el, html) {
      clearTimeout(typeTimer);
      if (reduced) { el.innerHTML = html; return; }
      // walk the html, revealing text nodes while keeping tags intact
      const tmp = document.createElement('div');
      tmp.innerHTML = html;
      const full = tmp.textContent;
      let shown = 0;
      el.innerHTML = '<span class="caret">&nbsp;</span>';
      const step = () => {
        shown += 3;
        if (shown >= full.length) { el.innerHTML = html; return; }
        // rebuild partial html by trimming from the source string
        let out = '', count = 0, i = 0, open = [];
        while (i < html.length && count < shown) {
          if (html[i] === '<') {
            const close = html.indexOf('>', i);
            const tag = html.slice(i, close + 1);
            out += tag;
            const name = /^<\/?\s*([a-z0-9]+)/i.exec(tag);
            if (name) { if (tag[1] === '/') open.pop(); else if (!/\/>$/.test(tag)) open.push(name[1]); }
            i = close + 1;
          } else { out += html[i]; i++; count++; }
        }
        while (open.length) out += '</' + open.pop() + '>';
        el.innerHTML = out + '<span class="caret">&nbsp;</span>';
        typeTimer = setTimeout(step, 14);
      };
      step();
    }

    function evalPct(cp) {
      return 50 + 50 * (2 / (1 + Math.exp(-cp / 320)) - 1);
    }

    function sync() {
      const st = LINE[idx];
      draw();

      if (opts.evalEl) {
        // bar fills from Black's side: the student sees their own share shrink
        opts.evalEl.style.height = (100 - evalPct(st.cp)) + '%';
      }
      if (opts.scoreEl) {
        const v = st.cp / 100;
        opts.scoreEl.textContent = (v >= 0 ? '+' : '') + v.toFixed(2);
        opts.scoreEl.className = st.cls === 'blunder' ? 'bad' : (v > 1.5 ? 'warn' : '');
      }
      if (opts.moveEl) {
        const num = Math.ceil(st.ply / 2);
        opts.moveEl.textContent = st.san ? (st.ply % 2 ? num + '. ' : num + '... ') + st.san : 'START';
      }
      if (opts.tagEl) {
        const map = { blunder: 'BLUNDER', good: 'GOOD MOVE', book: 'BOOK', sharp: 'CRITICAL', forced: 'FORCED' };
        opts.tagEl.textContent = map[st.cls] || '';
        opts.tagEl.style.color = st.cls === 'blunder' ? 'var(--fault)' : (st.cls === 'good' ? 'var(--signal)' : '#7C8783');
      }
      if (opts.textEl) typeInto(opts.textEl, st.text);
      if (opts.chipRoot) {
        opts.chipRoot.querySelectorAll('.toolchip').forEach((ch) => {
          ch.classList.toggle('fired', st.tools.indexOf(ch.dataset.tool) !== -1);
        });
      }
      if (opts.stripRoot) {
        opts.stripRoot.querySelectorAll('button').forEach((b, i) => {
          b.classList.toggle('now', i === idx);
        });
      }
    }

    function go(i) {
      idx = Math.max(0, Math.min(LINE.length - 1, i));
      sync();
    }

    function stop() {
      playing = false;
      clearTimeout(autoTimer);
      if (opts.playBtn) opts.playBtn.textContent = 'Play through';
    }

    function play() {
      if (playing) { stop(); return; }
      playing = true;
      if (opts.playBtn) opts.playBtn.textContent = 'Pause';
      if (idx >= LINE.length - 1) idx = 0;
      const advance = () => {
        if (!playing) return;
        if (idx >= LINE.length - 1) { stop(); return; }
        go(idx + 1);
        autoTimer = setTimeout(advance, LINE[idx].cls === 'blunder' ? 6200 : 2600);
      };
      sync();
      autoTimer = setTimeout(advance, 1400);
    }

    // move strip
    if (opts.stripRoot) {
      opts.stripRoot.innerHTML = '';
      LINE.forEach((m, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = m.san ? (m.ply % 2 ? Math.ceil(m.ply / 2) + '.' + m.san : m.san) : 'start';
        if (m.cls === 'blunder') b.classList.add('blunder');
        b.addEventListener('click', () => { stop(); go(i); });
        opts.stripRoot.appendChild(b);
      });
    }

    let rt;
    window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(resize, 120); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw);
    resize();
    sync();

    return {
      next: () => { stop(); go(idx + 1); },
      prev: () => { stop(); go(idx - 1); },
      jumpBlunder: () => { stop(); go(LINE.findIndex((m) => m.cls === 'blunder')); },
      play: play,
      reset: () => { stop(); go(0); }
    };
  }

  global.Coach = { mount };
})(window);
