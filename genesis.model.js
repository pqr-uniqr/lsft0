// @ts-nocheck genesis.model.js - the MODEL of GENESIS.txt: the file parsed
// into its anatomy, with an API that encodes the structure. pure: model()
// closes over nothing and requires nothing, so the same function runs in
// node (the reader renders from it) and, stringified into the page, in the
// browser (the reader re-renders and reads from it there).
//
// the anatomy, top down:
//   doc       the file: its text, its lines, and the nodes below
//   header    the blocks before the first loop: the title art
//   loop      "# Loop N: Name (From-To)" and all that follows until the
//             next loop; the blocks before its first layer are its lead
//   layer     a paragraph: the block that begins "N " (its body) and the
//             blocks after it until the next layer or loop (its notes);
//             its feet are its > lines, the one-liners the Lore closes on
//   block     a run of non-blank lines, the unit the page renders
//   line      a hard-wrapped line, classed by its first characters as ctrl
//             does, a layer's number set apart from its text
//   sentence  a block's run cut at terminals and counted from 0: the same
//             cut as the page's (VvilL.js's kernel), repeated here; a test
//             keeps the two equal
//   word      a sentence's words, for flashing
// every node has its offsets [start, end) in the text and its lines (0-
// based), so a scroll, a tap or a search hit maps back to its place.
//
// the API, a doc:
//   doc.text  doc.lines  doc.header { title, blocks }  doc.loops[]
//   doc.blocks[]  doc.sentences[] (every block's, in order)
//   doc.loop(n)  doc.layer(n, m)  doc.block(i)  doc.sentence(i, si)
//   doc.at(offset)  -> { block, line, loop, layer, sentence, col }
//   doc.atLine(l)   -> the same for a line (a blank line: the block before)
//   doc.offsetOf(line, col)  doc.words(sentence)
// its nodes:
//   loop      { n, name, span, head (block), lead [blocks], layers [],
//               start, end, line, last }
//   layer     { n, loop, body (block), notes [blocks], blocks [], feet
//               [{ text, line }], sentences (the body's), first (its text),
//               start, end, line, last }
//   block     { i, text, sep, start, end, line, lines [], sentences [],
//               loop, layer, role: header | loop | lead | body | note }
//   line      { k, line, text, start, end, cls, num, pieces [{ t, si,
//               start, end, line }], g: the sentence whose number this
//               line's gutter shows, else -1 }
//   sentence  { si, block, text (one line, single-spaced), raw, start, end,
//               line, last, words [], pieces [], shown (numbered in the
//               gutter: not the first, and has words), at (the line of its
//               number, else -1) }

const model = (text) => {
  // ---- the kernel's rules (VvilL.js), repeated so the model cuts as the page cuts
  const SYNTAX = [
    [/^(#{1,3})\s/, (m) => 'hdr hdr' + m[1].length],
    [/^-{3,}$/, 'sep'],
    [/^CP [A-Z]\d{6} \d\d:\d\d/, 'cp'],
    [/^>/, 'gt'], [/^~/, 'tilde'], [/^\+/, 'plus'], [/^-/, 'dash'], [/^=/, 'eq'], [/^\|/, 'pipe'],
    [/^\./, 'dot'], [/^,/, 'comma'], [/^\^/, 'caret'], [/^\$/, 'dollar'], [/^@/, 'at'],
    [/^\//, 'slash'], [/^\\/, 'bslash'], [/^!/, 'bang'],
    [/^t:/, 'topic'], [/^[a-z]:/i, 'letter'],
    [/^x+ /, 'done'],
  ];
  const NUM = /^(\d+) /, LOOP = /^# Loop (\d+): ([^(]*?)\s*(?:\((.*)\))?\s*$/;
  const TERM = /[.?!]["')\]]*(?=\s|$)/g, ABBR = /(?:^|[\s(])(?:e\.g|i\.e|etc|vs|cf)$/i;
  const LEAD = /^\s*(?:[>~+\-=|.,^$@\/\\!]|[a-z]:|x+ )?\s*/i;
  const words = (t) => t.match(LEAD)[0].length < t.length; // a word past any sigil
  const ends = (s) => { // the offsets just past each terminal
    const r = []; let m; TERM.lastIndex = 0;
    while ((m = TERM.exec(s))) { const i = m.index; if (s[i] === '.' && (s[i - 1] === '.' || ABBR.test(s.slice(0, i)))) continue; r.push(i + m[0].length); }
    return r;
  };
  const cut = (s, st) => { // a line into its sentence pieces, counting in st
    const pieces = []; let at = 0;
    for (const end of ends(s)) { pieces.push({ t: s.slice(at, end), si: st.si }); at = end; st.si++; }
    if (at < s.length) pieces.push({ t: s.slice(at), si: st.si });
    return pieces;
  };
  const classOf = (line, next) => {
    let cls = '';
    for (const [re, c] of SYNTAX) { const m = line.match(re); if (m) { cls = typeof c === 'function' ? c(m) : c; break; } }
    if (!cls && next !== undefined && /^-{3,}$/.test(next)) cls = 'shdr';
    return cls;
  };

  // ---- blocks, split as the kernel splits them, with offsets and line numbers
  const nl = (s) => (s.match(/\n/g) || []).length;
  const parts = text.split(/(\n(?:[ \t]*\n)+)/);
  let lead = ''; const raw = [];
  for (let k = 0; k < parts.length; k += 2) {
    let t = parts[k], sep = parts[k + 1] || '';
    if (k === 0) { const m = t.match(/^\n+/); if (m) { lead = m[0]; t = t.slice(m[0].length); } }
    const e = t.match(/\n+$/); if (e) { t = t.slice(0, -e[0].length); sep = e[0] + sep; }
    if (t === '') { if (raw.length) raw[raw.length - 1].sep += sep; else lead += sep; continue; }
    raw.push({ text: t, sep });
  }
  const blocks = []; let pos = lead.length, line = nl(lead);
  raw.forEach((r, i) => {
    const b = { i, text: r.text, sep: r.sep, start: pos, end: pos + r.text.length, line, lines: [], sentences: [], loop: null, layer: null, role: 'header' };
    const ls = r.text.split('\n'), st = { si: 0 }; let run = true, off = pos;
    b.lines = ls.map((l, k) => {
      const n = l.match(NUM), num = n ? n[1] : '', rest = num ? l.slice(num.length) : l;
      const cls = num ? '' : classOf(l, ls[k + 1]); if (cls) run = false;
      const pieces = run ? cut(rest, st) : [{ t: rest, si: -1 }];
      let at = off + num.length; for (const p of pieces) { p.start = at; p.end = at + p.t.length; p.line = line + k; at = p.end; }
      const o = { k, line: line + k, text: l, start: off, end: off + l.length, cls, num, pieces, g: -1 };
      off += l.length + 1; return o;
    });
    // the gutter: of two or more sentences with words, each claims the first
    // of its lines whose gutter is free; the first sentence shows no number
    const on = new Map();
    b.lines.forEach(ln => ln.pieces.forEach(p => { if (p.si >= 0 && words(p.t)) on.set(p.si, (on.get(p.si) || []).concat(ln.k)); }));
    if (on.size > 1) for (const [si, ks] of [...on].sort((x, y) => x[0] - y[0])) { const k = ks.find(k => b.lines[k].g < 0); if (k !== undefined) b.lines[k].g = si; }
    // sentences: the pieces of one count, across lines
    const by = [];
    for (const ln of b.lines) for (const p of ln.pieces) { if (p.si < 0) continue; (by[p.si] || (by[p.si] = { si: p.si, block: i, pieces: [] })).pieces.push(p); }
    b.sentences = by.filter(Boolean);
    for (const s of b.sentences) {
      const joined = s.pieces.map(p => p.t).join('\n'), lw = joined.match(/^\s*/)[0].length, tw = joined.match(/\s*$/)[0].length;
      s.raw = joined; s.text = joined.trim().replace(/\s+/g, ' '); s.words = s.text ? s.text.split(' ') : [];
      s.start = s.pieces[0].start + lw; s.end = s.pieces[s.pieces.length - 1].end - tw;
      s.line = s.pieces[0].line; s.last = s.pieces[s.pieces.length - 1].line;
      s.shown = s.si > 0 && s.pieces.some(p => words(p.t));
      const g = b.lines.find(ln => ln.g === s.si); s.at = g ? g.line : -1;
    }
    blocks.push(b); pos = b.end + r.sep.length; line += nl(r.text) + nl(r.sep);
  });

  // ---- the header, the loops, their layers
  const header = { title: '', blocks: [] }, loops = [];
  let loop = null, layer = null;
  for (const b of blocks) {
    const first = b.lines[0], m = first.text.match(LOOP);
    if (m) { loop = { n: +m[1], name: m[2].trim(), span: m[3] || '', head: b, lead: [], layers: [], start: b.start, end: text.length, line: b.line, last: b.line }; loops.push(loop); layer = null; b.role = 'loop'; b.loop = loop.n; continue; }
    if (!loop) { header.blocks.push(b); continue; }
    b.loop = loop.n;
    if (first.num) { layer = { n: +first.num, loop: loop.n, body: b, notes: [], blocks: [b], feet: [], sentences: b.sentences, first: b.sentences.length ? b.sentences[0].text : '', start: b.start, end: loop.end, line: b.line, last: b.line }; loop.layers.push(layer); b.role = 'body'; b.layer = layer.n; continue; }
    if (!layer) { loop.lead.push(b); b.role = 'lead'; continue; }
    layer.blocks.push(b); layer.notes.push(b); b.role = 'note'; b.layer = layer.n;
  }
  const lastLine = (b) => b.line + b.lines.length - 1;
  loops.forEach((l, j) => {
    const next = loops[j + 1]; l.end = next ? next.start : text.length;
    const bs = [l.head, ...l.lead, ...l.layers.flatMap(y => y.blocks)]; l.last = lastLine(bs[bs.length - 1]);
    l.layers.forEach((y, q) => {
      const ny = l.layers[q + 1]; y.end = ny ? ny.start : l.end; y.last = lastLine(y.blocks[y.blocks.length - 1]);
      y.feet = y.blocks.flatMap(b => b.lines.filter(ln => ln.cls === 'gt').map(ln => ({ text: ln.text.replace(/^>\s*/, ''), line: ln.line })));
    });
  });
  header.title = (header.blocks.map(b => b.text).join(' ').match(/[A-Za-z]+/) || [''])[0];

  // ---- queries
  const lineStarts = [0]; for (let i = 0; i < text.length; i++) if (text[i] === '\n') lineStarts.push(i + 1);
  const lastBy = (arr, key, v) => { let lo = 0, hi = arr.length - 1, r = -1; while (lo <= hi) { const mid = (lo + hi) >> 1; if (arr[mid][key] <= v) { r = mid; lo = mid + 1; } else hi = mid - 1; } return r < 0 ? null : arr[r]; };
  const sentences = blocks.flatMap(b => b.sentences);
  const place = (b, ln, off) => {
    const ps = ln ? ln.pieces : [];
    const p = off === undefined ? (ps.find(p => p.si >= 0 && words(p.t)) || ps.find(p => p.si >= 0)) : (ps.find(p => off < p.end) || ps[ps.length - 1]);
    const s = p && p.si >= 0 ? b.sentences.find(x => x.si === p.si) || null : null;
    return { block: b, line: ln, loop: b.loop, layer: b.layer, sentence: s, col: ln && off !== undefined ? off - ln.start : 0 };
  };
  const at = (off) => { const b = lastBy(blocks, 'start', off); if (!b) return null; const ln = off <= b.end ? b.lines.find(l => off <= l.end) || null : null; return place(b, ln, off); };
  const atLine = (l) => { const b = lastBy(blocks, 'line', l); if (!b) return null; return place(b, b.lines[l - b.line] || null); };
  const loopOf = (n) => loops.find(l => l.n === n) || null;
  const layerOf = (n, m) => { const l = loopOf(n); return l ? l.layers.find(y => y.n === m) || null : null; };
  return { text, lines: text.split('\n'), header, loops, blocks, sentences,
    loop: loopOf, layer: layerOf, block: (i) => blocks[i] || null,
    sentence: (i, si) => (blocks[i] ? blocks[i].sentences.find(s => s.si === si) : null) || null,
    at, atLine, offsetOf: (l, c) => (lineStarts[l] === undefined ? -1 : lineStarts[l] + (c || 0)), words: (s) => s.words };
};

module.exports = { model, MODEL: model.toString() };
