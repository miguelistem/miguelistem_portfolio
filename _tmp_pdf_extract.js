// Minimal PDF text extractor: inflate content streams, walk text-showing operators,
// emit lines grouped by font size + y-position.
const fs = require('fs');
const zlib = require('zlib');

function extract(buf) {
  // find stream ... endstream
  const out = [];
  const re = /stream\r?\n/g;
  let m;
  while ((m = re.exec(buf)) !== null) {
    const start = m.index + m[0].length;
    const end = buf.indexOf('endstream', start);
    if (end === -1) continue;
    let data = buf.slice(start, end);
    // strip trailing whitespace/newline before endstream
    let inflated = null;
    try {
      inflated = zlib.inflateSync(data);
    } catch {
      try { inflated = zlib.inflateRawSync(data); } catch { continue; }
    }
    if (!inflated) continue;
    const txt = inflated.toString('latin1');
    // Only interested in streams with text operators
    if (!/\bTj\b|\bTJ\b/.test(txt)) continue;
    out.push(txt);
  }
  return out;
}

// parse a literal string from PDF content
function readStr(s, i) {
  // s[i] === '('
  let depth = 0, out = '';
  let j = i + 1;
  while (j < s.length) {
    const c = s[j];
    if (c === '\\') {
      const n = s[j + 1];
      const map = { n: '\n', r: '\r', t: '\t', b: '\b', f: '\f', '(': '(', ')': ')', '\\': '\\' };
      if (map[n] !== undefined) { out += map[n]; j += 2; continue; }
      if (/[0-7]/.test(n)) {
        let oct = '';
        let k = j + 1;
        while (k < s.length && oct.length < 3 && /[0-7]/.test(s[k])) { oct += s[k]; k++; }
        out += String.fromCharCode(parseInt(oct, 8));
        j = k; continue;
      }
      // line continuation
      if (n === '\n' || n === '\r') { j += 2; continue; }
      out += n; j += 2; continue;
    }
    if (c === '(') depth++;
    if (c === ')') { if (depth === 0) return [out, j + 1]; depth--; }
    out += c; j++;
  }
  return [out, j];
}

function parseContent(txt) {
  // We track: font size (via Tf), text matrix y (via Tm/Td/TD/T*), and text.
  // Simple: scan for operators sequentially, keeping state.
  const lines = [];
  let curSize = 12;
  let tmY = 0; // text matrix ty
  let lineY = null;
  let acc = [];
  let accSize = null;
  let accX = 0;
  let x = 0;

  const flush = () => {
    if (acc.length === 0) return;
    lines.push({ size: accSize, y: accY, x: accXStart, text: acc.join('') });
    acc = []; accSize = null; accY = null; accXStart = null;
  };

  let i = 0;
  const tokens = [];
  // tokenize: strings ( ... ), numbers, names, arrays, operators
  while (i < txt.length) {
    const c = txt[i];
    if (/\s/.test(c)) { i++; continue; }
    if (c === '%') { while (i < txt.length && txt[i] !== '\n') i++; continue; }
    if (c === '(') {
      const [str, nj] = readStr(txt, i);
      tokens.push({ t: 'str', v: str });
      i = nj; continue;
    }
    if (c === '[') {
      const arr = [];
      i++;
      while (i < txt.length && txt[i] !== ']') {
        if (/\s/.test(txt[i])) { i++; continue; }
        if (txt[i] === '(') { const [str, nj] = readStr(txt, i); arr.push(str); i = nj; continue; }
        // number
        let j = i;
        while (j < txt.length && /[0-9.eE+\-]/.test(txt[j])) j++;
        arr.push(parseFloat(txt.slice(i, j)) || 0);
        i = j;
      }
      i++;
      tokens.push({ t: 'arr', v: arr });
      continue;
    }
    if (c === '/' && i + 1 < txt.length) {
      let j = i + 1;
      while (j < txt.length && !/[\s\[<>()/{}/%]/.test(txt[j])) j++;
      tokens.push({ t: 'name', v: txt.slice(i + 1, j) });
      i = j; continue;
    }
    // number or operator
    let j = i;
    while (j < txt.length && !/[\s\[<>()/{}/%]/.test(txt[j])) j++;
    const word = txt.slice(i, j);
    const num = Number(word);
    if (!isNaN(num) && /^[-+]?[0-9.]+$/.test(word)) tokens.push({ t: 'num', v: num });
    else tokens.push({ t: 'op', v: word });
    i = j;
  }

  const Tm = [1, 0, 0, 1, 0, 0]; // text matrix
  const Td = [1, 0, 0, 1, 0, 0]; // line matrix
  let lastY = 0;

  const applyTm = (a, b, c, d, e, f) => {
    Tm[0] = a; Tm[1] = b; Tm[2] = c; Tm[3] = d; Tm[4] = e; Tm[5] = f;
    Td[0] = a; Td[1] = b; Td[2] = c; Td[3] = d; Td[4] = e; Td[5] = f;
  };
  const applyTd = (a, b) => {
    // new line matrix = [1 0 0 1 a b] * line matrix
    const [a1, b1, c1, d1, e1, f1] = Td;
    Td = [a1, b1, c1, d1, a1 * a + c1 * b + e1, a1 * b + d1 * b + f1];
    // note: Td e/f: e' = a*a1? Let's do proper matrix mult:
    // [1 0 0 1 a b] * [a1 b1; c1 d1; e1 f1]
    Td = [a1, b1, c1, d1, a1 * a + c1 * b + e1, a1 * b + d1 * b + f1];
  };

  let k = 0;
  while (k < tokens.length) {
    const tk = tokens[k];
    if (tk.t === 'op') {
      const op = tk.v;
      if (op === 'BT') { flush(); }
      else if (op === 'Tf') {
        // /name size Tf -> tokens[k-2]=name, tokens[k-1]=num
        if (tokens[k - 1] && tokens[k - 1].t === 'num') curSize = Math.round(tokens[k - 1].v);
      }
      else if (op === 'Tm') {
        const nums = tokens.slice(k - 6, k).filter(t => t.t === 'num').map(t => t.v);
        if (nums.length === 6) applyTm(...nums);
      }
      else if (op === 'Td' || op === 'TD') {
        const nums = tokens.slice(k - 2, k).filter(t => t.t === 'num').map(t => t.v);
        if (nums.length === 2) applyTd(nums[0], nums[1]);
      }
      else if (op === 'T*') {
        // move down one line
      }
      else if (op === 'Tj') {
        const prev = tokens[k - 1];
        if (prev && prev.t === 'str') {
          flush();
          acc = [prev.v]; accSize = curSize; accY = Td[5]; accXStart = Td[4];
        }
      }
      else if (op === 'TJ') {
        const prev = tokens[k - 1];
        if (prev && prev.t === 'arr') {
          let s = '';
          for (const part of prev.v) if (typeof part === 'string') s += part;
          flush();
          acc = [s]; accSize = curSize; accY = Td[5]; accXStart = Td[4];
        }
      }
      else if (op === 'ET') { flush(); }
    }
    k++;
  }
  flush();
  return lines;
}

const file = process.argv[2];
const buf = fs.readFileSync(file);
const streams = extract(buf);
const lines = [];
for (const s of streams) lines.push(...parseContent(s));

// group into visual lines: sort by y desc, cluster within 2 units, sort x asc
const clusters = [];
const used = new Set();
for (const l of lines) {
  if (used.has(l)) continue;
  const group = [l];
  used.add(l);
  for (const m of lines) {
    if (used.has(m)) continue;
    if (Math.abs(m.y - l.y) <= Math.max(1.5, l.size * 0.35)) { group.push(m); used.add(m); }
  }
  group.sort((a, b) => a.x - b.x);
  clusters.push(group.map(g => g.text).join(' ').replace(/\s+/g, ' ').trim());
}
clusters.sort((a, b) => 0); // keep content order; streams already ordered
// Better: sort clusters by descending y
const withY = lines.map(() => 0);
// recompute: sort clusters by their min y desc
const yOf = new Map();
for (const cl of clusters) {
  // find first line matching start
  let best = null;
  for (const l of lines) { if (l.text && cl.startsWith(l.text.slice(0, 12)) && best === null) { best = l; break; } }
  yOf.set(cl, best ? best.y : 0);
}
clusters.sort((a, b) => (yOf.get(b) || 0) - (yOf.get(a) || 0));
console.log(clusters.filter(c => c.length > 0).join('\n'));
