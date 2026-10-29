// @ts-nocheck genesis.js - the L3 expression of GENESIS.md, the one file it
// edits: the primary's page, driven by a keyboard with vim's bindings.
//
// every file has layers of representations down the substrate: the plain
// path is the interface, the primary representation; /_/path is L1, the
// user-facing application over HTTP for navigating and editing the
// mycelium; /_/_/path is L2, the agent-facing protocol that exposes the
// file system over HTTP; from /_/_/_/path (L3) down the layers are open: a
// scratch space for expressions that may become primary, and a closet of
// improvised alternative representations. this is one such, the first:
// http://vostok.local:8880/_/_/_/vvill/GENESIS.md
//
// mycelium already threads the underscores: a request at L3 reads its
// genes from /_/_/_/_/.node and /_/_/_/_/vvill/.node (the substrate of the
// substrate), and its interface file is still /vvill/GENESIS.md. so this
// expression is two gene lines there, scoped to GENESIS.md alone (L3 is
// for precisely scoped genes, and one shaped to this file would err on
// another), and this module.
//
// the page is the primary's (VvilL.js's frame and KERNEL render the same
// blocks, sentences numbered in the gutter), with a buffer and a cursor of
// its own: every blank line drawn so the cursor can rest on it, a caret, a
// hidden textbox holding the keyboard, a status line. the kernel is
// stringified into the page, so a block re-renders as it is typed, by the
// one renderer. links are left as written, so the columns match the
// file's. the dress is Pete's editor's, not the harness's: the Ctrl Custom
// theme's purple page and orange ink (the other sentence blue, > lines
// ctrl's green), his red cursor and selection and yellow matches, and the
// Ac437 Nix8810 M16 font at his size, leading and tracking, served from
// /_fonts. one scheme in either device mode.
//
// what vim does here: motions (h j k l w b e W B E ge 0 ^ $ | gg G { }
// ( ) f F t T ; , % n N * #, counts), operators d c y and gq (the reflow,
// at textwidth 55, the Lore's wrap; sigil lines and numbers kept whole)
// over motions and the text objects iw aw iW aW is as (sentences as the
// gutter counts them) ip ap (a block) i" a" i' a' i( a( ib i[ a[ i{ a{ iB
// i< a<; x X s S C D Y J p P r ~ u ^R and . ; v V with d c y J ~ u U p r gq
// : and o; i a I A o O, insert's ^W ^U, text breaking at the width as it
// is typed (never a line already past it); z z/t/b, ^D ^U ^F ^B ^E ^Y,
// PageDown and PageUp a third of a page, every scroll a glide; a ruler
// after the last column of the width; / ? searching as the pattern is
// typed, every match lit until :noh, n N (smartcase), :s/pat/rep/g over
// ranges (% N,M . $ '<,'>),
// :N, :w (and ⌘S), :q :q! :wq :x ZZ ZQ (q leaves for the interface path),
// :e :e!, :set tw=N, :help. the unnamed register also goes to the
// clipboard; a paste (⌘V) in normal mode puts. a click places the
// cursor; a drag still selects.
//
// :w posts the whole file to /_/_/_/vvill/.save (the 📮 gene), which
// writes it only if the file still holds what the page loaded (else 409,
// and :e! re-reads). the primary's block editor and vim on the same file
// are safe against each other this way. LAN only, like the primary's.

const log = require('./log.js').init(__filename, '⌨️', '32', 1);
const V = require('./atmosphere').register('VvilL.js');
const TW = 55; // the Lore's hard wrap
const FILE = '/vvill/GENESIS.md'; // the one file this editor is for

// the path's segments: substrate underscores as they are, the directories
// linked at the interface, the file last
const crumb = (cpath, ipath) => {
  const segs = cpath.split('/').filter(Boolean), n = segs.length;
  let acc = '';
  const parts = segs.map((s, i) => {
    if (s === '_') return '_';
    acc += '/' + s;
    return i === n - 1 ? V.kernel().esc(s) : `<a href="${acc}">${V.kernel().esc(s)}</a>`;
  });
  return `<p class="vvill-crumb">/${parts.join('/')}</p>`;
};

// 📄 GENESIS.md as vim. off the LAN, the primary's blocks, read only.
function conscious(xface, subgenes, petri) {
  const { cpath, ipath } = petri.pathology;
  const raw = xface.file.toString('utf8');
  let styles = {};
  try { styles = JSON.parse(subgenes['🎨'] || '{}'); }
  catch (e) { log.line(`🎨 unparseable subgene: ${subgenes['🎨']}`); }
  const K = V.kernel({ links: false });
  const f = K.blocksOf(raw);
  const local = petri.pathology.spore.isLocal();
  const esc = K.esc;
  const body = `<div id="vwrap"><div class="vvill-conscious vim" id="conscious" data-path="${esc(ipath)}" data-save="${esc(cpath.replace(/\/[^/]*$/, '') + '/.save')}" data-tw="${TW}">${K.blocksHtml(f)}</div>`
    + `<div id="vline"></div><div id="ruler"></div><div id="vhl"></div><div id="caret" class="normal"></div><div id="vsel"></div><textarea id="vin" spellcheck="false" autocomplete="off" autocapitalize="off" autocorrect="off"></textarea></div>`
    + `<div class="vim-stat"><span id="vmode"></span><span id="vpos"></span></div>`;
  const script = local ? `<script type="application/json" id="text">${JSON.stringify(raw).replace(/</g, '\\u003c')}</script>`
    + `<script>const K = (${V.KERNEL})({ links: false });\n${VIM_JS}</script>` : '';
  return V.frame(crumb(cpath, ipath) + body + script, { title: 'vim ' + ipath.split('/').pop(), styles: { ...DRESS, ...styles }, noZoom: local, head: `<style>${VIM_CSS}</style>` });
}

// 📮 save: the whole file, written only if it still holds what the page
// loaded (else 409 with the text on disk, and the page says :e!).
async function save(body, petri) {
  const json = (status, o) => ({ status, headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify(o) });
  if (!petri.pathology.spore.isLocal()) return json(403, { ok: false, reason: 'not local' });
  let q; try { q = JSON.parse(body); } catch (e) { return json(400, { ok: false, reason: 'not json' }); }
  const { path, was, now } = q;
  if (path !== FILE) return json(400, { ok: false, reason: 'not ' + FILE });
  if (!(await petri.zone.if(path))) return json(404, { ok: false, reason: 'no such file' });
  const raw = await petri.zone.rd8(path);
  if (typeof was !== 'string' || raw !== was) return json(409, { ok: false, reason: 'the file changed on disk since the page loaded', text: raw });
  if (typeof now !== 'string') return json(400, { ok: false, reason: 'no text' });
  if (now !== raw) await petri.zone.wr(path, now);
  log.line(`⌨️ ${path} ${now === raw ? 'unchanged' : 'written, ' + now.split('\n').length + ' lines'}`);
  return json(200, { ok: true });
}

// the editor's dress, Pete's editor's: the Ctrl Custom theme's page and
// ink (the other sentence blue; ctrl's syntax in its own colors, the >
// lines its green), the cursor, selection and match colors of his
// settings, and the Ac437 Nix8810 M16 font, served from /_fonts, at his
// 13px, 0.82 leading and 0.5px tracking, the pane 56 columns wide and
// centered. one scheme in either device
// mode: the frame's dark rules are outranked by :root[data-theme] and the
// ids. the overlays (the current line, the ruler, the selection, the
// matches) paint behind the text as an editor's do; the caret blends in
// difference, a red block with its glyph inverted.
const FONT = `'Ac437 Nix8810 M16', 'Courier New', monospace`;
const DRESS = { bgColor: '#2d0549', textColor: '#ef4811', fontFamily: FONT };
const INK = { s1: '#6796e6', hdr: '#ffddfa', sep: '#ffddfa', shdr: '#ffddfa', gt: '#009400', tilde: '#ff0000',
  d0: '#ff0000', d1: '#ff8000', d2: '#ffff00', d3: '#00ff00', d4: '#0080ff', d5: '#0000ff', d6: '#8000ff',
  plus: '#5fafaf', dash: '#ff87d7', eq: '#fffff0', pipe: '#39ff14', dot: '#ff00ff', comma: '#fff', caret: '#ff8700',
  dollar: '#ffd700', at: '#888', slash: '#fff', bang: '#00bfff', topic: '#808080', done: '#777', cp: '#5fd7ff' };
const VIM_CSS = /* css */ `
  @font-face { font-family: 'Ac437 Nix8810 M16'; src: url('/_fonts/Ac437_Nix8810_M16.ttf') format('truetype'); }
  :root, :root[data-theme] { color-scheme: dark; }
  :root a, :root[data-theme] a { color: #d9baff; }
  :root .vvill-bar, :root[data-theme] .vvill-bar { border-color: #5a2a7a; }
  .vvill-bar a { font-weight: normal; }
  .vvill-bar { font-size: 13px; letter-spacing: 0.5px; }
  main { font-size: 13px; letter-spacing: 0.5px; max-width: calc(56ch + 28px); }
  #conscious { font-family: ${FONT}; font-size: 13px; line-height: 0.82; letter-spacing: 0.5px; }
  #conscious, #conscious * { font-weight: normal; }
  #conscious .blk { margin: 0; }
  #conscious .l { min-height: 0.82em; }
  #conscious .g { font-size: 1em; line-height: inherit; }
  #conscious .hdr1, #conscious .hdr2, #conscious .hdr3, #conscious .cp { font-size: 1em; }
  #conscious .bslash { color: #000; background: rgba(255, 255, 255, 0.28); }
  ${Object.entries(INK).map(([c, v]) => `#conscious .${c} { color: ${v}; }`).join('\n  ')}
  #vwrap { position: relative; isolation: isolate; }
  #vline, #ruler, #vsel div, #vhl div { position: absolute; pointer-events: none; z-index: -1; }
  #vline { left: -16px; right: -16px; background: #241530; }
  #ruler { top: 0; bottom: 0; width: 0; border-left: 1px solid #ff0000; }
  #vsel div { background: #ff0000; }
  #vhl div { background: #ffff00; }
  #caret { position: absolute; pointer-events: none; background: #ff0000; mix-blend-mode: difference; }
  #caret.insert { mix-blend-mode: normal; }
  #vin { position: absolute; width: 1px; opacity: 0; border: 0; padding: 0; margin: 0; resize: none; outline: 0; font: inherit; overflow: hidden; }
  .vim-stat { position: fixed; left: 0; right: 0; bottom: 0; display: flex; justify-content: space-between; gap: 1em; padding: 4px 16px;
    border-top: 1px solid #5a2a7a; background: #2d0549; color: #ebebeb; font-family: ${FONT}; font-size: 13px; line-height: 20px; letter-spacing: 0.5px; white-space: pre; overflow: hidden; }
  .vim-stat #vpos { color: #747478; flex: none; }
`;

// ⌨️ the editor. one string, the buffer; one offset, the cursor; a key
// buffer parsed on every key by vim's grammar: [count] [operator [count]]
// (motion | object | command). raw, so its regexes read as written.
const VIM_JS = String.raw`(() => {
  // the editor's page: the same blocks as the primary, every blank line
  // drawn so the cursor can rest on it, a caret of its own, a hidden
  // textbox that holds the keyboard, and a status line. the buffer is one
  // string; the cursor an offset into it; lines are found by their starts.
  const wrap = document.getElementById('vwrap'), root = document.getElementById('conscious'),
    path = root.dataset.path, caret = document.getElementById('caret'), selbox = document.getElementById('vsel'), ruler = document.getElementById('ruler'), vline = document.getElementById('vline'), hlbox = document.getElementById('vhl'),
    ta = document.getElementById('vin'), left = document.getElementById('vmode'), right = document.getElementById('vpos');
  const raw = JSON.parse(document.getElementById('text').textContent);
  const eol = raw.endsWith('\n');
  let text = eol ? raw.slice(0, -1) : raw, savedRaw = raw;
  let tw = parseInt(root.dataset.tw, 10) || 55;
  let starts = [];
  const N = () => text.length;
  const index = () => { starts = [0]; for (let i = 0; i < text.length; i++) if (text[i] === '\n') starts.push(i + 1); };
  const lineOf = (o) => { let lo = 0, hi = starts.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (starts[m] <= o) lo = m; else hi = m - 1; } return lo; };
  const lineEnd = (l) => l + 1 < starts.length ? starts[l + 1] - 1 : text.length;
  const line = (l) => text.slice(starts[l], lineEnd(l));
  const lastLine = () => starts.length - 1;
  const at = (l, c) => starts[l] + Math.max(0, Math.min(c, lineEnd(l) - starts[l]));
  const col = (o) => o - starts[lineOf(o)];
  const firstNb = (l) => { const s = line(l), m = s.match(/\S/); return starts[l] + (m ? m.index : Math.max(0, s.length - 1)); };
  // the cursor, and the column it wants back after j and k
  let cur = 0, want = 0;
  let mode = 'normal', keys = [], anchor = 0, cmd = '', msg = '';
  let reg = { text: '', line: false };
  let undos = [], redos = [], last = null, rec = [], replaying = false;
  let lastSearch = null, lastFind = null;
  let hl = null, hlCache = { text: null, re: null, list: [] }, cmdFrom = 0;
  let prev = null, lineEl = [];
  index();

  // the buffer edited through one door; the page follows
  const edit = (a, b, s) => { text = text.slice(0, a) + s + text.slice(b); index(); };
  const snap = () => { undos.push({ text, cur }); if (undos.length > 500) undos.shift(); redos = []; };
  const modified = () => (text + (eol ? '\n' : '')) !== savedRaw;
  const clampNormal = (o) => { const l = lineOf(Math.max(0, Math.min(o, N()))); return Math.max(starts[l], Math.min(o, Math.max(starts[l], lineEnd(l) - 1))); };
  const clampInsert = (o) => Math.max(0, Math.min(o, N()));

  // the page: lead and separators as blank lines, each block by the kernel
  const nl = (s) => { let n = 0; for (let i = 0; i < s.length; i++) if (s[i] === '\n') n++; return n; };
  const same = (f, g) => f && g && f.lead === g.lead && f.blocks.length === g.blocks.length && f.blocks.every((b, i) => b.sep === g.blocks[i].sep);
  function render() {
    const f = K.blocksOf(text);
    if (same(prev, f)) {
      const diff = f.blocks.map((b, i) => b.text !== prev.blocks[i].text ? i : -1).filter(i => i >= 0);
      if (diff.length === 0) { prev = f; return; }
      if (diff.length === 1) { const i = diff[0]; const el = root.querySelector('.blk[data-i="' + i + '"]');
        if (el) { el.outerHTML = K.blockHtml(f.blocks[i], i); prev = f; reindex(f); return; } }
    }
    const parts = []; let l = 0;
    const blank = () => { parts.push('<span class="l blank">' + K.esc(line(l)) + '</span>'); l++; };
    for (let k = nl(f.lead); k > 0; k--) blank();
    f.blocks.forEach((b, i) => { parts.push(K.blockHtml(b, i)); l += nl(b.text) + 1; for (let k = b.sep ? nl(b.sep) - 1 : 0; k > 0; k--) blank(); });
    while (l < starts.length) blank();
    root.innerHTML = parts.join('');
    prev = f; reindex(f);
  }
  function reindex() { lineEl = Array.from(root.querySelectorAll('.l')); }

  // where a character sits on the page: a range over it, measured
  const nodeAt = (l, c) => {
    const el = lineEl[l]; if (!el) return null;
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, { acceptNode: (n) => n.parentElement.closest('.g') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT });
    let n, k = 0, lastN = null;
    while ((n = w.nextNode())) { if (c < k + n.data.length) return { node: n, off: c - k, el }; k += n.data.length; lastN = n; }
    return lastN ? { node: lastN, off: lastN.data.length, el, end: true } : { node: el, off: 0, el, end: true, empty: true };
  };
  const rectOf = (o) => {
    const l = lineOf(o), p = nodeAt(l, o - starts[l]); if (!p) return null;
    const r = document.createRange();
    if (p.empty) { const b = p.el.getBoundingClientRect(); return { left: b.left, top: b.top, width: 0, height: b.height, end: true }; }
    r.setStart(p.node, p.off); r.setEnd(p.node, p.end ? p.off : p.off + 1);
    const rs = r.getClientRects(); const b = rs.length ? rs[rs.length - 1] : r.getBoundingClientRect();
    if (p.end) return { left: b.right, top: b.top, width: 0, height: b.height, end: true };
    return { left: b.left, top: b.top, width: b.width, height: b.height };
  };
  let cw = 8, lh = 20;
  const measure = () => { const s = document.createElement('span'); s.textContent = '0000000000'; s.style.cssText = 'position:absolute;visibility:hidden;white-space:pre';
    root.appendChild(s); cw = s.getBoundingClientRect().width / 10; s.remove(); lh = (lineEl[0] && lineEl[0].getBoundingClientRect().height) || parseFloat(getComputedStyle(root).fontSize) * 1.45 || 20; rule(); };
  // the ruler: a hairline after the last column of the width
  const rule = () => { const l0 = lineEl[0] || root; ruler.style.left = (l0.getBoundingClientRect().left - wrap.getBoundingClientRect().left + tw * cw) + 'px'; };

  // ---- the view: every scroll is one eased glide toward an aim, so a key
  // pressed mid-glide reckons from where the view is heading, not where it is;
  // three lines of margin keep the caret off the edges, a wheel or a finger
  // takes the view back
  let aim = null, frame = 0, tick = 0;
  const pad = () => 3 * lh, viewH = () => innerHeight - 36, viewTop = () => aim === null ? scrollY : aim;
  const lineY = (l) => { const b = lineEl[l].getBoundingClientRect(); return { top: b.top + scrollY, bot: b.bottom + scrollY }; };
  const glide = (y) => { y = Math.max(0, Math.min(document.documentElement.scrollHeight - innerHeight, Math.round(y)));
    if (y === viewTop()) return; aim = y;
    if (Math.abs(aim - scrollY) > 2 * innerHeight) window.scrollTo(0, aim - Math.sign(aim - scrollY) * 2 * innerHeight);
    if (!frame) { tick = performance.now(); frame = requestAnimationFrame(step); } };
  const step = (now) => { const was = scrollY, d = aim - was, k = 1 - Math.exp(-(now - tick) / 70); tick = now;
    if (Math.abs(d * k) < 1) { window.scrollTo(0, aim); aim = null; frame = 0; return; }
    window.scrollTo(0, was + d * k); if (scrollY === was) { aim = null; frame = 0; return; } frame = requestAnimationFrame(step); };
  const settle = () => { if (frame) cancelAnimationFrame(frame); frame = 0; aim = null; };
  addEventListener('wheel', settle, { passive: true }); addEventListener('touchstart', settle, { passive: true });
  addEventListener('scroll', () => { if (hl) hilite(); }, { passive: true });

  // the caret, drawn: a block in normal mode, a bar in insert
  function place() {
    const r = rectOf(cur); if (!r) return;
    const w = wrap.getBoundingClientRect();
    const x = r.left - w.left, h = r.height || lh, y = r.top - w.top + (h - lh) / 2; // the line box, not the glyph's
    caret.className = mode;
    caret.style.left = x + 'px'; caret.style.top = y + 'px'; caret.style.height = lh + 'px';
    caret.style.width = (mode === 'insert' ? 2 : (r.width || cw)) + 'px';
    vline.style.top = y + 'px'; vline.style.height = lh + 'px';
    ta.style.left = x + 'px'; ta.style.top = y + 'px'; ta.style.height = lh + 'px';
    const top = r.top + scrollY, bot = top + h, vt = viewTop();
    if (top < vt + pad()) glide(top < 2 * pad() ? 0 : top - pad()); else if (bot > vt + viewH() - pad()) glide(bot - viewH() + pad());
    selection(); hilite(); status();
  }
  const selRange = () => {
    if (mode === 'visual') { const a = Math.min(anchor, cur), b = Math.max(anchor, cur); return { a, b: Math.min(N(), b + 1), lw: false }; }
    if (mode === 'vline') { const la = Math.min(lineOf(anchor), lineOf(cur)), lb = Math.max(lineOf(anchor), lineOf(cur)); return { a: starts[la], b: lineEnd(lb), lw: true, la, lb }; }
    return null;
  };
  function selection() {
    selbox.innerHTML = '';
    const s = selRange(); if (!s) return;
    const w = wrap.getBoundingClientRect(); const rects = [];
    const la = lineOf(s.a), lb = lineOf(Math.max(s.a, s.b - (s.lw ? 0 : 1)));
    for (let l = la; l <= lb; l++) {
      const from = l === la ? s.a - starts[l] : 0, to = l === lb ? s.b - starts[l] : lineEnd(l) - starts[l];
      const p = nodeAt(l, from), q = nodeAt(l, Math.max(from, to));
      if (!p) continue;
      if (p.empty || to <= from) { const b = lineEl[l].getBoundingClientRect(); rects.push({ left: b.left, top: b.top, width: cw, height: b.height }); continue; }
      const r = document.createRange(); r.setStart(p.node, p.off); r.setEnd(q.node, q.off);
      for (const b of r.getClientRects()) if (b.width > 0) rects.push(b);
    }
    for (const b of rects) { const d = document.createElement('div');
      d.style.cssText = 'left:' + (b.left - w.left) + 'px;top:' + (b.top - w.top + (b.height - lh) / 2) + 'px;width:' + b.width + 'px;height:' + lh + 'px'; selbox.appendChild(d); }
  }
  // every match of the lit pattern, drawn for the lines near the view;
  // the matches are found once per text, the boxes with each move
  function hilite() {
    hlbox.innerHTML = '';
    if (!hl) return;
    if (hlCache.text !== text || hlCache.re !== hl.re) { const list = [], re = hl.re; re.lastIndex = 0; let m;
      while ((m = re.exec(text)) && list.length < 20000) { if (m[0] === '') { re.lastIndex++; continue; } list.push([m.index, m.index + m[0].length]); }
      hlCache = { text, re, list }; }
    const w = wrap.getBoundingClientRect(), boxes = new Map();
    const near = (l) => { let b = boxes.get(l); if (!b) { b = lineEl[l].getBoundingClientRect(); boxes.set(l, b); } return b.bottom > -innerHeight && b.top < 2 * innerHeight; };
    for (const [a, b] of hlCache.list) {
      const la = lineOf(a), lb = lineOf(Math.max(a, b - 1));
      for (let l = la; l <= lb; l++) { if (!near(l)) continue;
        const from = l === la ? a - starts[l] : 0, to = l === lb ? b - starts[l] : lineEnd(l) - starts[l]; if (to <= from) continue;
        const p = nodeAt(l, from), q = nodeAt(l, to); if (!p || p.empty || !q) continue;
        const r = document.createRange(); r.setStart(p.node, p.off); r.setEnd(q.node, q.off);
        for (const c of r.getClientRects()) if (c.width > 0) { const d = document.createElement('div');
          d.style.cssText = 'left:' + (c.left - w.left) + 'px;top:' + (c.top - w.top + (c.height - lh) / 2) + 'px;width:' + c.width + 'px;height:' + lh + 'px'; hlbox.appendChild(d); } }
    }
  }
  function status() {
    const p = path.split('/').pop();
    if (mode === 'cmd') left.textContent = cmd;
    else if (msg) left.textContent = msg;
    else left.textContent = mode === 'insert' ? '-- INSERT --' : mode === 'visual' ? '-- VISUAL --' : mode === 'vline' ? '-- VISUAL LINE --' : '';
    right.textContent = (modified() ? '[+] ' : '') + p + '  ' + (lineOf(cur) + 1) + ':' + (col(cur) + 1) + '  ' + keys.join('');
  }
  const say = (m) => { msg = m; status(); };
  const changed = () => { render(); place(); };

  // ---- motions: each takes the count and the cursor, says where to go and
  // how the span is cut for an operator (linewise, inclusive, exclusive)
  const cls = (ch) => ch === undefined ? -1 : /\s/.test(ch) ? 0 : /[\wÀ-￿]/.test(ch) ? 1 : 2;
  const cls2 = (ch) => ch === undefined ? -1 : /\s/.test(ch) ? 0 : 1;
  const fwdWord = (o, big) => { const C = big ? cls2 : cls, n = N(); let i = o; if (i >= n) return n;
    const c0 = C(text[i]); if (c0 !== 0) while (i < n && C(text[i]) === c0) i++;
    while (i < n && C(text[i]) === 0) { if (text[i] === '\n' && i > o && (i + 1 === n || text[i + 1] === '\n')) return i + 1 < n ? i + 1 : n; i++; }
    return i; };
  const endWord = (o, big) => { const C = big ? cls2 : cls, n = N(); let i = o + 1; while (i < n && C(text[i]) === 0) i++;
    if (i >= n) return Math.max(0, n - 1); const c = C(text[i]); while (i + 1 < n && C(text[i + 1]) === c) i++; return i; };
  const backWord = (o, big) => { const C = big ? cls2 : cls; let i = o - 1; if (i < 0) return 0;
    while (i >= 0 && C(text[i]) === 0) { if (text[i] === '\n' && i > 0 && text[i - 1] === '\n') return i; i--; }
    if (i < 0) return 0; const c = C(text[i]); while (i > 0 && C(text[i - 1]) === c) i--; return i; };
  const backEnd = (o, big) => { const C = big ? cls2 : cls; let i = o; const c0 = C(text[i]); if (c0 !== 0) while (i > 0 && C(text[i - 1]) === c0) i--;
    i--; while (i >= 0 && C(text[i]) === 0) i--; return Math.max(0, i); };
  const blankLine = (l) => lineEnd(l) === starts[l];
  const sentenceStarts = () => { const f = K.blocksOf(text), r = []; let o = f.lead.length;
    for (const b of f.blocks) { const first = b.text.search(/\S/); r.push(o + (first < 0 ? 0 : first));
      for (const e of K.ends(b.text)) { let k = e; while (k < b.text.length && /\s/.test(b.text[k])) k++; if (k < b.text.length) r.push(o + k); }
      o += b.text.length + b.sep.length; }
    for (let l = 0; l <= lastLine(); l++) if (blankLine(l)) r.push(starts[l]);
    return r.sort((a, b) => a - b); };
  const sentences = () => { const f = K.blocksOf(text), r = []; let o = f.lead.length;
    for (const b of f.blocks) { let a = 0; const es = K.ends(b.text).concat(b.text.length);
      for (const e of es) { if (e <= a) continue; let s = a; while (s < e && /\s/.test(b.text[s])) s++; let t = e; while (t < b.text.length && /\s/.test(b.text[t])) t++;
        if (s < e) r.push({ a: o + s, b: o + e, c: o + t }); a = e; }
      o += b.text.length + b.sep.length; }
    return r; };
  const findIn = (o, ch, kind, n) => { const l = lineOf(o), s = line(l); let c = o - starts[l];
    for (let q = 0; q < n; q++) { if (kind === 'f' || kind === 't') { const i = s.indexOf(ch, c + (kind === 't' && q === 0 ? 2 : 1)); if (i < 0) return null; c = i; }
      else { const i = s.lastIndexOf(ch, c - (kind === 'T' && q === 0 ? 2 : 1)); if (i < 0) return null; c = i; } }
    if (kind === 't') c--; if (kind === 'T') c++; return starts[l] + c; };
  const PAIRS = { '(': ')', '[': ']', '{': '}', ')': '(', ']': '[', '}': '{' };
  const matchPair = (o) => { const ch = text[o]; if (!PAIRS[ch]) return null; const open = '([{'.includes(ch), pair = PAIRS[ch]; let d = 0;
    for (let i = o; i >= 0 && i < N(); i += open ? 1 : -1) { if (text[i] === ch) d++; else if (text[i] === pair) { d--; if (d === 0) return i; } } return null; };
  const search = (from, back, re) => { if (!re) return null; re.lastIndex = 0; let m, best = null, first = null;
    while ((m = re.exec(text))) { if (m[0] === '') { re.lastIndex++; continue; } if (first === null) first = m.index;
      if (back ? m.index < from : m.index > from) { if (back) best = m.index; else { best = m.index; break; } } }
    if (best !== null) return { o: best };
    if (back) { re.lastIndex = 0; let lastM = null; while ((m = re.exec(text))) { if (m[0] === '') { re.lastIndex++; continue; } lastM = m.index; } if (lastM !== null) { say('search hit TOP, continuing at BOTTOM'); return { o: lastM }; } }
    else if (first !== null) { say('search hit BOTTOM, continuing at TOP'); return { o: first }; }
    return null; };
  const wordAt = (o) => { const l = lineOf(o), s = line(l); let c = o - starts[l]; while (c < s.length && cls(s[c]) !== 1) c++; if (c >= s.length) return null;
    let a = c, b = c; while (a > 0 && cls(s[a - 1]) === 1) a--; while (b + 1 < s.length && cls(s[b + 1]) === 1) b++; return s.slice(a, b + 1); };
  const esc = (s) => s.replace(/[.*+?^{}$()|[\]\\]/g, '\\$&');

  // o: where to; lw: linewise; inc: inclusive; keep: j/k keep the wanted column
  function motion(t, i, ctx) {
    const n = ctx.n || 1, k = t[i], o = cur, l = lineOf(o);
    const need = (j) => i + j < t.length ? t[i + j] : undefined;
    const lw = (ln, c) => ({ o: at(Math.max(0, Math.min(ln, lastLine())), c === undefined ? firstCol(ln) : c), lw: true, i: i + 1 });
    const firstCol = (ln) => firstNb(Math.max(0, Math.min(ln, lastLine()))) - starts[Math.max(0, Math.min(ln, lastLine()))];
    switch (k) {
      case 'h': case '<Left>': case '<BS>': return { o: Math.max(starts[l], o - n), i: i + 1 };
      case 'l': case '<Right>': case ' ': return { o: Math.min(ctx.op ? lineEnd(l) : Math.max(starts[l], lineEnd(l) - 1), o + n), i: i + 1 };
      case 'j': case '<Down>': return { ...lw(l + n, want), keep: true };
      case 'k': case '<Up>': return { ...lw(l - n, want), keep: true };
      case '<CR>': case '+': return lw(l + n);
      case '-': return lw(l - n);
      case '0': case '<Home>': return { o: starts[l], i: i + 1 };
      case '^': return { o: firstNb(l), i: i + 1 };
      case '$': case '<End>': { const ln = Math.min(lastLine(), l + n - 1); return { o: Math.max(starts[ln], lineEnd(ln) - (ctx.op || ctx.vis ? 0 : 1)), inc: true, want: Infinity, i: i + 1 }; }
      case '|': return { o: at(l, n - 1), i: i + 1 };
      case 'w': case 'W': { let p = o; const big = k === 'W'; for (let q = 0; q < n; q++) p = fwdWord(p, big);
        if (ctx.op && lineOf(p) > l && p > o) p = Math.max(o, lineEnd(l)); return { o: p, i: i + 1 }; }
      case 'b': case 'B': { let p = o; const big = k === 'B'; for (let q = 0; q < n; q++) p = backWord(p, big); return { o: p, i: i + 1 }; }
      case 'e': case 'E': { let p = o; const big = k === 'E'; for (let q = 0; q < n; q++) p = endWord(p, big); return { o: p, inc: true, i: i + 1 }; }
      case 'G': return lw(ctx.n ? n - 1 : lastLine());
      case 'g': { const g = need(1); if (g === undefined) return 'wait';
        if (g === 'g') return lw(ctx.n ? n - 1 : 0, undefined);
        if (g === 'e' || g === 'E') { let p = o; for (let q = 0; q < n; q++) p = backEnd(p, g === 'E'); return { o: p, inc: true, i: i + 2 }; }
        if (g === '_') return { o: Math.max(starts[l], lineEnd(l) - 1 - (line(l).length - line(l).trimEnd().length)), inc: true, i: i + 2 };
        return null; }
      case '{': { let ln = l; for (let q = 0; q < n; q++) { ln--; while (ln > 0 && !blankLine(ln)) ln--; } ln = Math.max(0, ln); return { o: starts[ln], i: i + 1 }; }
      case '}': { let ln = l; for (let q = 0; q < n; q++) { ln++; while (ln < lastLine() && !blankLine(ln)) ln++; }
        if (ln > lastLine()) return { o: ctx.op ? N() : clampNormal(N()), i: i + 1 }; return { o: ln === lastLine() && !blankLine(ln) ? (ctx.op ? N() : clampNormal(N())) : starts[ln], i: i + 1 }; }
      case ')': { const ss = sentenceStarts(); let p = o; for (let q = 0; q < n; q++) { const q = ss.find(s => s > p); p = q === undefined ? (ctx.op ? N() : clampNormal(N())) : q; } return { o: p, i: i + 1 }; }
      case '(': { const ss = sentenceStarts(); let p = o; for (let q = 0; q < n; q++) { const q = ss.filter(s => s < p).pop(); p = q === undefined ? 0 : q; } return { o: p, i: i + 1 }; }
      case 'f': case 'F': case 't': case 'T': { const ch = need(1); if (ch === undefined) return 'wait'; if (ch.length !== 1) return null;
        lastFind = { ch, kind: k }; const p = findIn(o, ch, k, n); return p === null ? null : { o: p, inc: k === 'f' || k === 't', i: i + 2 }; }
      case ';': case ',': { if (!lastFind) return null; let kind = lastFind.kind;
        if (k === ',') kind = { f: 'F', F: 'f', t: 'T', T: 't' }[kind]; const p = findIn(o, lastFind.ch, kind, n); return p === null ? null : { o: p, inc: kind === 'f' || kind === 't', i: i + 1 }; }
      case 'n': case 'N': { if (!lastSearch) { say('E35: No previous regular expression'); return null; }
        hl = { re: lastSearch.re, src: lastSearch.src }; const r = search(o, (k === 'N') !== lastSearch.back, lastSearch.re); return r ? { o: r.o, i: i + 1 } : (say('E486: Pattern not found: ' + lastSearch.src), null); }
      case '*': case '#': { const w = wordAt(o); if (!w) return null; lastSearch = { re: new RegExp('\\b' + esc(w) + '\\b', 'g'), back: k === '#', src: w };
        hl = { re: lastSearch.re, src: lastSearch.src }; const r = search(o, k === '#', lastSearch.re); return r ? { o: r.o, i: i + 1 } : null; }
      case '%': { let p = o; const s = line(l); let c = o - starts[l]; while (c < s.length && !PAIRS[s[c]]) c++; if (c >= s.length) return null;
        const m = matchPair(starts[l] + c); return m === null ? null : { o: m, inc: true, i: i + 1 }; }
    }
    return null;
  }

  // ---- text objects: a span [a, b) (or lines la..lb) around the cursor
  function object(t, i) {
    const io = t[i], k = t[i + 1]; if (k === undefined) return 'wait';
    const inner = io === 'i', o = cur, l = lineOf(o), s = line(l), c = o - starts[l];
    const ret = (a, b, lw, la, lb) => ({ a, b, lw, la, lb, i: i + 2 });
    switch (k) {
      case 'w': case 'W': { const C = k === 'W' ? cls2 : cls; if (!s.length) return ret(o, o); const c0 = C(s[c]); let a = c, b = c;
        while (a > 0 && C(s[a - 1]) === c0) a--; while (b + 1 < s.length && C(s[b + 1]) === c0) b++;
        if (!inner) { if (c0 !== 0) { let e = b; while (e + 1 < s.length && C(s[e + 1]) === 0) e++; if (e > b) b = e; else { let st = a; while (st > 0 && C(s[st - 1]) === 0) st--; a = st; } }
          else { let e = b; if (e + 1 < s.length) { const c1 = C(s[e + 1]); while (e + 1 < s.length && C(s[e + 1]) === c1) e++; b = e; } } }
        return ret(starts[l] + a, starts[l] + b + 1); }
      case 's': { const ss = sentences(); let x = ss.find(q => o >= q.a && o < q.c) || ss.filter(q => q.a <= o).pop() || ss[0];
        if (!x) return ret(starts[l], lineEnd(l)); return ret(x.a, inner ? x.b : x.c); }
      case 'p': { let la = l, lb = l; const bl = blankLine(l);
        while (la > 0 && blankLine(la - 1) === bl) la--; while (lb < lastLine() && blankLine(lb + 1) === bl) lb++;
        if (!inner) { if (lb < lastLine()) { const b2 = blankLine(lb + 1); lb++; while (lb < lastLine() && blankLine(lb + 1) === b2) lb++; }
          else if (!bl) { while (la > 0 && blankLine(la - 1)) la--; } }
        return ret(starts[la], lineEnd(lb), true, la, lb); }
      case '"': case "'": case '\x60': { const qs = []; for (let j = 0; j < s.length; j++) if (s[j] === k && s[j - 1] !== '\\') qs.push(j);
        let a = -1, b = -1; for (let j = 0; j + 1 < qs.length; j += 2) { if (c <= qs[j + 1]) { a = qs[j]; b = qs[j + 1]; break; } }
        if (a < 0) return null; return inner ? ret(starts[l] + a + 1, starts[l] + b) : ret(starts[l] + a, starts[l] + b + 1); }
      case '(': case ')': case 'b': case '[': case ']': case '{': case '}': case 'B': case '<': case '>': {
        const open = { '(': '(', ')': '(', b: '(', '[': '[', ']': '[', '{': '{', '}': '{', B: '{', '<': '<', '>': '<' }[k], close = { '(': ')', '[': ']', '{': '}', '<': '>' }[open];
        let d = 0, a = -1; for (let j = o; j >= 0; j--) { if (text[j] === close && j !== o) d++; else if (text[j] === open) { if (d === 0) { a = j; break; } d--; } }
        if (a < 0) return null; d = 0; let b = -1; for (let j = a + 1; j < N(); j++) { if (text[j] === open) d++; else if (text[j] === close) { if (d === 0) { b = j; break; } d--; } }
        if (b < 0) return null; return inner ? ret(a + 1, b) : ret(a, b + 1); }
    }
    return null;
  }

  // ---- the span an operator works on, from a motion or an object
  const spanOf = (m) => {
    if (m.a !== undefined) return m.lw ? { lw: true, la: m.la, lb: m.lb } : { a: m.a, b: m.b };
    const a = Math.min(cur, m.o), b = Math.max(cur, m.o);
    if (m.lw) return { lw: true, la: lineOf(a), lb: lineOf(b) };
    if (m.inc) return { a, b: Math.min(N(), b + 1) };
    // exclusive: a motion that ends at a column 0 stops at the previous line's end, and is linewise if it also began at or before the first word
    if (b > a && col(b) === 0 && lineOf(b) > lineOf(a)) { if (a <= firstNb(lineOf(a))) return { lw: true, la: lineOf(a), lb: lineOf(b) - 1 }; return { a, b: b - 1 }; }
    return { a, b };
  };
  const linesText = (la, lb) => text.slice(starts[la], lineEnd(lb));
  const clip = (s) => { try { if (navigator.clipboard) { navigator.clipboard.writeText(s).catch(() => {}); return; }
    ta.value = s; ta.select(); document.execCommand('copy'); ta.value = ''; } catch (e) { ta.value = ''; } };
  const yank = (sp) => { if (sp.lw) reg = { text: linesText(sp.la, sp.lb), line: true }; else reg = { text: text.slice(sp.a, sp.b), line: false }; clip(reg.text); };
  const cutLines = (la, lb) => { if (lb < lastLine()) edit(starts[la], starts[lb + 1], ''); else if (la > 0) edit(starts[la] - 1, N(), ''); else edit(0, N(), ''); };
  function operate(op, sp) {
    if (op === 'y') { yank(sp); cur = sp.lw ? (lineOf(cur) > sp.la ? at(sp.la, col(cur)) : cur) : sp.a; cur = clampNormal(cur); changed();
      if (sp.lw && sp.lb > sp.la) say((sp.lb - sp.la + 1) + ' lines yanked'); return; }
    if (op === 'gq') { snap(); reflow(sp.lw ? sp.la : lineOf(sp.a), sp.lw ? sp.lb : lineOf(Math.max(sp.a, sp.b - 1))); return; }
    snap(); yank(sp);
    if (op === 'd') { if (sp.lw) { cutLines(sp.la, sp.lb); cur = firstNb(Math.min(sp.la, lastLine())); if (sp.lb > sp.la + 1) say((sp.lb - sp.la + 1) + ' fewer lines'); }
      else { edit(sp.a, sp.b, ''); cur = clampNormal(sp.a); } want = col(cur); changed(); return; }
    if (op === 'c') { if (sp.lw) { edit(starts[sp.la], lineEnd(sp.lb), ''); cur = starts[sp.la]; } else { edit(sp.a, sp.b, ''); cur = sp.a; } insert(); return; }
  }
  const SIGIL = /^(?:[>~+\-=|.,^$@\/\\!#]|[a-z]:|x+ )/i;
  function reflow(la, lb) {
    const out = []; let para = [];
    const flush = () => { if (!para.length) return; const ws = para.join(' ').split(/\s+/).filter(Boolean); let c = '';
      for (const w of ws) { if (c && (c + ' ' + w).length > tw) { out.push(c); c = w; } else c = c ? c + ' ' + w : w; } if (c) out.push(c); para = []; };
    for (let l = la; l <= lb; l++) { const s = line(l);
      if (!s.trim()) { flush(); out.push(s); } else if (SIGIL.test(s) || /^-{3,}$/.test(s)) { flush(); out.push(s); } else if (/^\d+ /.test(s)) { flush(); para.push(s.trim()); } else para.push(s.trim()); }
    flush();
    edit(starts[la], lineEnd(lb), out.join('\n')); cur = firstNb(Math.min(la + out.length - 1, lastLine())); want = col(cur); changed();
  }
  // breaking a line as it is typed past the width, at the last blank before the margin
  function autowrap() {
    const l = lineOf(cur), s = line(l); if (s.length <= tw || s.length - 1 > tw) return;
    let br = -1; for (let j = Math.min(tw, s.length - 1); j > 0; j--) if (s[j] === ' ' && s.slice(0, j).trim()) { br = j; break; }
    if (br < 0) return; let a = br; while (a > 0 && s[a - 1] === ' ') a--; let b = br; while (b < s.length && s[b] === ' ') b++;
    const p = starts[l] + a, q = starts[l] + b; const o = cur; edit(p, q, '\n'); cur = o >= q ? o - (q - p) + 1 : o >= p ? p + 1 : o;
  }

  // ---- insert mode
  function insert(o, fresh) { if (fresh) snap(); if (o !== undefined) cur = clampInsert(o); mode = 'insert'; msg = ''; ta.value = ''; changed(); }
  function leave() { if (mode !== 'insert') return; mode = 'normal'; const l = lineOf(cur); cur = Math.max(starts[l], cur - 1); cur = clampNormal(cur); want = col(cur);
    if (!replaying) last = rec.slice(); keys = []; changed(); }
  function typed(s) { if (!replaying) rec.push({ t: s }); edit(cur, cur, s); cur += s.length; if (s.length === 1 && /\S/.test(s)) autowrap(); changed(); }
  function insertKey(k) {
    if (!replaying) rec.push(k);
    const l = lineOf(cur);
    switch (k) {
      case '<Esc>': case '<C-[>': case '<C-c>': leave(); return true;
      case '<CR>': edit(cur, cur, '\n'); cur++; changed(); return true;
      case '<BS>': case '<C-h>': if (cur > 0) { edit(cur - 1, cur, ''); cur--; changed(); } return true;
      case '<Del>': if (cur < N()) { edit(cur, cur + 1, ''); changed(); } return true;
      case '<Tab>': edit(cur, cur, '\t'); cur++; changed(); return true;
      case '<C-w>': { const p = backWord(cur, false); const a = lineOf(p) === l ? p : starts[l]; if (a < cur) { edit(a, cur, ''); cur = a; changed(); } return true; }
      case '<C-u>': if (cur > starts[l]) { edit(starts[l], cur, ''); cur = starts[l]; changed(); } return true;
      case '<Left>': cur = Math.max(0, cur - 1); place(); return true;
      case '<Right>': cur = Math.min(N(), cur + 1); place(); return true;
      case '<Up>': cur = at(Math.max(0, l - 1), col(cur)); place(); return true;
      case '<Down>': cur = at(Math.min(lastLine(), l + 1), col(cur)); place(); return true;
      case '<Home>': cur = starts[l]; place(); return true;
      case '<End>': cur = lineEnd(l); place(); return true;
    }
    return false;
  }

  // ---- normal and visual modes: a key buffer, parsed each key
  const count = (t, i) => { let n = ''; if (/^[1-9]$/.test(t[i] || '')) while (i < t.length && /^[0-9]$/.test(t[i])) n += t[i++]; return { n: n ? +n : null, i }; };
  function feed(k) {
    if (!keys.length && mode === 'normal' && !replaying) rec = [];
    if (!replaying) rec.push(k);
    keys.push(k); msg = '';
    let r; try { r = run(keys); } catch (x) { console.error(x); say('E: ' + x.message); r = null; }
    if (r !== 'wait') keys = [];
    status();
  }
  function run(t) {
    const vis = mode === 'visual' || mode === 'vline';
    let { n: c1, i } = count(t, 0);
    if (i >= t.length) return 'wait';
    let op = null;
    if (!vis && 'dcy'.includes(t[i]) && t[i].length === 1) op = t[i++];
    else if (!vis && t[i] === 'g') { if (t[i + 1] === undefined) return 'wait'; if (t[i + 1] === 'q') { op = 'gq'; i += 2; } }
    if (op) {
      const c2 = count(t, i); i = c2.i; const n = (c1 || 1) * (c2.n || 1);
      if (i >= t.length) return 'wait';
      if (t[i] === op[op.length - 1] || (op === 'gq' && t[i] === 'g' && t[i + 1] === 'q')) { const la = lineOf(cur), lb = Math.min(lastLine(), la + n - 1); operate(op, { lw: true, la, lb }); return done(op); }
      if (op === 'gq' && t[i] === 'g' && t[i + 1] === undefined) return 'wait';
      let m;
      if (t[i] === 'i' || t[i] === 'a') m = object(t, i); else m = motion(t, i, { n: c2.n || c1 ? n : null, op: true });
      if (m === 'wait') return 'wait'; if (!m) return null;
      const sp = spanOf(m); operate(op, sp); return done(op);
    }
    const k = t[i];
    if (vis) {
      const sp = selRange();
      switch (k) {
        case '<Esc>': case '<C-[>': case '<C-c>': mode = 'normal'; cur = clampNormal(cur); changed(); return true;
        case 'v': if (mode === 'visual') { mode = 'normal'; cur = clampNormal(cur); } else mode = 'visual'; changed(); return true;
        case 'V': if (mode === 'vline') { mode = 'normal'; cur = clampNormal(cur); } else mode = 'vline'; changed(); return true;
        case 'o': { const a = anchor; anchor = cur; cur = a; place(); return true; }
        case 'd': case 'x': case '<Del>': mode = 'normal'; operate('d', sp); return true;
        case 'c': case 's': mode = 'normal'; operate('c', sp); return true;
        case 'y': mode = 'normal'; operate('y', sp); return true;
        case 'J': { mode = 'normal'; snap(); const la = lineOf(sp.a), lb = Math.max(la + 1, lineOf(Math.max(sp.a, sp.b - 1))); cur = starts[la]; join(lb - la); return true; }
        case '~': case 'u': case 'U': { mode = 'normal'; snap(); const a = sp.lw ? starts[sp.la] : sp.a, b = sp.lw ? lineEnd(sp.lb) : sp.b;
          const s = text.slice(a, b); edit(a, b, k === 'u' ? s.toLowerCase() : k === 'U' ? s.toUpperCase() : swapCase(s)); cur = clampNormal(a); changed(); return true; }
        case 'p': case 'P': { mode = 'normal'; snap(); const r = reg; const a = sp.lw ? starts[sp.la] : sp.a, b = sp.lw ? lineEnd(sp.lb) : sp.b;
          edit(a, b, r.line && !sp.lw ? '\n' + r.text + '\n' : r.text); cur = clampNormal(a); changed(); return true; }
        case 'r': { if (t[i + 1] === undefined) return 'wait'; mode = 'normal'; snap(); const a = sp.lw ? starts[sp.la] : sp.a, b = sp.lw ? lineEnd(sp.lb) : sp.b;
          edit(a, b, text.slice(a, b).replace(/[^\n]/g, t[i + 1])); cur = clampNormal(a); changed(); return true; }
        case 'g': { if (t[i + 1] === undefined) return 'wait'; if (t[i + 1] === 'q') { mode = 'normal'; operate('gq', sp); return true; } break; }
        case ':': mode = 'normal'; cur = clampNormal(cur); enterCmd(":'<,'>", sp); return true;
        case 'i': case 'a': { const m = object(t, i); if (m === 'wait') return 'wait'; if (!m) return null;
          if (m.lw) { mode = 'vline'; anchor = starts[m.la]; cur = starts[m.lb]; } else { mode = 'visual'; anchor = m.a; cur = Math.max(m.a, m.b - 1); } place(); return true; }
      }
      const m = motion(t, i, { n: c1, vis: true }); if (m === 'wait') return 'wait'; if (!m) return null;
      move(m); return true;
    }
    const n = c1 || 1;
    switch (k) {
      case 'i': insert(undefined, true); return done();
      case 'a': insert(line(lineOf(cur)).length ? cur + 1 : cur, true); return done();
      case 'I': insert(line(lineOf(cur)).trim() ? firstNb(lineOf(cur)) : lineEnd(lineOf(cur)), true); return done();
      case 'A': insert(lineEnd(lineOf(cur)), true); return done();
      case 'o': { snap(); const e = lineEnd(lineOf(cur)); edit(e, e, '\n'); insert(e + 1); return done(); }
      case 'O': { snap(); const s = starts[lineOf(cur)]; edit(s, s, '\n'); insert(s); return done(); }
      case 'x': case '<Del>': { const l = lineOf(cur); if (lineEnd(l) === starts[l]) return true; operate('d', { a: cur, b: Math.min(lineEnd(l), cur + n) }); return done(); }
      case 'X': { const l = lineOf(cur); if (cur === starts[l]) return true; operate('d', { a: Math.max(starts[l], cur - n), b: cur }); return done(); }
      case 's': { const l = lineOf(cur); operate('c', { a: cur, b: Math.min(lineEnd(l), cur + n) }); return done(); }
      case 'S': { const la = lineOf(cur); operate('c', { lw: true, la, lb: Math.min(lastLine(), la + n - 1) }); return done(); }
      case 'C': { const la = lineOf(cur), lb = Math.min(lastLine(), la + n - 1); operate('c', { a: cur, b: lineEnd(lb) }); return done(); }
      case 'D': { const la = lineOf(cur), lb = Math.min(lastLine(), la + n - 1); operate('d', { a: cur, b: lineEnd(lb) }); return done(); }
      case 'Y': { const la = lineOf(cur); operate('y', { lw: true, la, lb: Math.min(lastLine(), la + n - 1) }); return true; }
      case 'p': case 'P': put(k === 'P', n); return done();
      case 'J': snap(); join(Math.max(1, n - 1)); return done();
      case 'r': { if (t[i + 1] === undefined) return 'wait'; const ch = t[i + 1] === '<CR>' ? '\n' : t[i + 1]; if (ch.length !== 1) return null;
        const l = lineOf(cur); if (cur + n > lineEnd(l)) return true; snap(); edit(cur, cur + n, ch.repeat(n)); cur = ch === '\n' ? cur + n : cur + n - 1; changed(); return done(); }
      case '~': { const l = lineOf(cur); const b = Math.min(lineEnd(l), cur + n); if (b <= cur) return true; snap(); edit(cur, b, swapCase(text.slice(cur, b))); cur = clampNormal(b); changed(); return done(); }
      case 'u': { const u = undos.pop(); if (!u) { say('Already at oldest change'); return true; } redos.push({ text, cur }); text = u.text; index(); cur = clampNormal(u.cur); changed(); say(undos.length + ' changes left'); return true; }
      case '<C-r>': { const u = redos.pop(); if (!u) { say('Already at newest change'); return true; } undos.push({ text, cur }); text = u.text; index(); cur = clampNormal(u.cur); changed(); return true; }
      case '.': { if (!last || replaying) return true; const seq = last; replaying = true; keys = []; try { for (const x of seq) { if (typeof x === 'string') { if (mode === 'insert') insertKey(x); else feed(x); } else typed(x.t); } } finally { replaying = false; keys = []; } return true; }
      case 'v': mode = 'visual'; anchor = cur; changed(); return true;
      case 'V': mode = 'vline'; anchor = cur; changed(); return true;
      case ':': enterCmd(c1 ? ':.,.+' + (n - 1) : ':'); return true;
      case '/': enterCmd('/'); return true;
      case '?': enterCmd('?'); return true;
      case 'z': { if (t[i + 1] === undefined) return 'wait'; const r = rectOf(cur); if (!r) return true; const y = r.top + scrollY, h = r.height || lh;
        if (t[i + 1] === 'z') glide(y + h / 2 - viewH() / 2); else if (t[i + 1] === 't') glide(y < 2 * pad() ? 0 : y - pad()); else if (t[i + 1] === 'b') glide(y + h - viewH() + pad()); place(); return true; }
      case '<C-d>': case '<C-u>': case '<C-f>': case '<C-b>': case '<PageDown>': case '<PageUp>': { const page = Math.max(1, Math.floor((innerHeight - 40) / lh));
        const d = Math.max(1, (k === '<C-d>' || k === '<C-u>') ? Math.floor(page / 2) : (k === '<PageDown>' || k === '<PageUp>') ? Math.floor(page / 3) : page - 2);
        const dir = (k === '<C-d>' || k === '<C-f>' || k === '<PageDown>') ? 1 : -1; glide(viewTop() + dir * d * lh); const l = Math.max(0, Math.min(lastLine(), lineOf(cur) + dir * d)); cur = at(l, want); cur = clampNormal(cur); place(); return true; }
      case '<C-e>': case '<C-y>': { glide(viewTop() + (k === '<C-e>' ? n : -n) * lh); let l = lineOf(cur);
        while (l < lastLine() && lineY(l).top < viewTop() + pad()) l++; while (l > 0 && lineY(l).bot > viewTop() + viewH() - pad()) l--;
        if (l !== lineOf(cur)) cur = clampNormal(at(l, want)); place(); return true; }
      case 'Z': { if (t[i + 1] === undefined) return 'wait'; if (t[i + 1] === 'Z') ex('x'); else if (t[i + 1] === 'Q') ex('q!'); return true; }
      case '<Esc>': case '<C-[>': case '<C-c>': return true;
    }
    const m = motion(t, i, { n: c1, op: false }); if (m === 'wait') return 'wait'; if (!m) return null;
    move(m); return true;
  }
  const done = (op) => { if (!replaying && mode !== 'insert' && op !== 'y') last = rec.slice(); return true; };
  function move(m) { cur = (mode === 'normal' ? clampNormal : (o) => Math.max(0, Math.min(o, Math.max(0, N() - 1))))(m.o); if (m.want !== undefined) want = m.want; else if (!m.keep) want = col(cur); place(); }
  const swapCase = (s) => s.replace(/[a-zA-ZÀ-ɏ]/g, (c) => c === c.toLowerCase() ? c.toUpperCase() : c.toLowerCase());
  function put(before, n) {
    if (!reg.text) return; snap(); const l = lineOf(cur);
    const body = Array(n).fill(reg.text).join(reg.line ? '\n' : '');
    if (reg.line) { if (before) { edit(starts[l], starts[l], body + '\n'); cur = firstNb(l); } else { const e = lineEnd(l); edit(e, e, '\n' + body); cur = firstNb(l + 1); } }
    else { const o = before || lineEnd(l) === starts[l] ? cur : cur + 1; edit(o, o, body); cur = clampNormal(o + body.length - 1); }
    want = col(cur); changed();
  }
  function join(times) {
    for (let k = 0; k < times; k++) { const l = lineOf(cur); if (l >= lastLine()) break;
      const e = lineEnd(l); let s = starts[l + 1]; while (s < lineEnd(l + 1) && (text[s] === ' ' || text[s] === '\t')) s++;
      const next = text.slice(s, lineEnd(l + 1)); const sp = !next || /\s$/.test(line(l)) || !line(l) ? '' : (next[0] === ')' ? '' : ' ');
      edit(e, s, sp); cur = e; }
    cur = clampNormal(cur); want = col(cur); changed();
  }

  // ---- the command line: : / ?
  let cmdRange = null;
  function enterCmd(prefix, sp) { mode = 'cmd'; cmd = prefix; cmdRange = sp || null; cmdFrom = cur; msg = ''; status(); }
  function cmdKey(k) {
    const live = cmd[0] === '/' || cmd[0] === '?';
    const back = () => { mode = 'normal'; cmd = ''; if (live) { cur = cmdFrom; want = col(cur); hl = null; place(); } status(); };
    if (k === '<Esc>' || k === '<C-[>' || k === '<C-c>') { back(); return; }
    if (k === '<BS>') { if (cmd.length <= 1) { back(); return; } cmd = cmd.slice(0, -1); }
    else if (k === '<C-u>') cmd = cmd[0];
    else if (k === '<CR>') { const c = cmd; mode = 'normal'; cmd = '';
      if (c[0] === ':') ex(c.slice(1)); else { cur = cmdFrom; find(c[0] === '?', c.slice(1)); hl = lastSearch ? { re: lastSearch.re, src: lastSearch.src } : null; hilite(); }
      status(); return; }
    else if (k.length === 1) cmd += k;
    else return;
    if (live) incsearch(); status();
  }
  // the search as it is typed: the view goes to the first match, every match lit
  function incsearch() {
    const src = cmd.slice(1), re = src && compile(src), m0 = msg;
    hl = re instanceof RegExp ? { re, src } : null;
    const r = hl && search(cmdFrom, cmd[0] === '?', re); msg = m0;
    cur = r ? clampNormal(r.o) : cmdFrom; want = col(cur); place();
  }
  const compile = (src, extra) => { try { return new RegExp(src, 'g' + (/[A-Z]/.test(src) ? '' : 'i') + (extra || '')); } catch (e) { return e; } };
  const regex = (src, extra) => { const r = compile(src, extra); if (r instanceof RegExp) return r; say('E: ' + r.message); return null; };
  function find(back, src) {
    if (src) { const re = regex(src); if (!re) return; lastSearch = { re, back, src }; }
    if (!lastSearch) return;
    const r = search(cur, lastSearch.back, lastSearch.re); if (!r) { say('E486: Pattern not found: ' + lastSearch.src); return; }
    if (mode === 'normal') { cur = clampNormal(r.o); want = col(cur); } place();
  }
  const lineRange = (spec) => {
    const one = (s) => { s = s.trim(); if (s === '.' || s === '') return lineOf(cur); if (s === '$') return lastLine(); if (s === "'<") return cmdRange ? (cmdRange.lw ? cmdRange.la : lineOf(cmdRange.a)) : lineOf(cur);
      if (s === "'>") return cmdRange ? (cmdRange.lw ? cmdRange.lb : lineOf(Math.max(cmdRange.a, cmdRange.b - 1))) : lineOf(cur);
      const m = s.match(/^(\.|\$|\d+)?([+-]\d+)?$/); if (!m) return null; let b = m[1] === '$' ? lastLine() : m[1] === '.' || !m[1] ? lineOf(cur) : +m[1] - 1; if (m[2]) b += +m[2]; return Math.max(0, Math.min(lastLine(), b)); };
    if (spec === '%') return [0, lastLine()];
    const parts = spec.split(','); if (parts.length === 1) { const a = one(parts[0]); return a === null ? null : [a, a]; }
    const a = one(parts[0]), b = one(parts[1]); return a === null || b === null ? null : [Math.min(a, b), Math.max(a, b)];
  };
  async function write(then) {
    const now = text + (eol ? '\n' : '');
    say('writing…');
    let o; try { const r = await fetch(root.dataset.save, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path, was: savedRaw, now }) }); o = await r.json(); }
    catch (x) { say('E: write failed: ' + x.message); return; }
    if (!o.ok) { say('E: ' + (o.reason || 'not written') + (o.text !== undefined ? ' · :e! to re-read it' : '')); return; }
    savedRaw = now; say('"' + path.split('/').pop() + '" ' + starts.length + 'L, ' + new TextEncoder().encode(now).length + 'B written'); if (then) then();
  }
  const leaveTo = () => { window.onbeforeunload = null; location.href = path; };
  function ex(c) {
    c = c.trim(); let m;
    if ((m = c.match(/^(%|'<,'>|[\d.$+\-,]*)s([^A-Za-z0-9\s])(.*)$/))) {
      const r = lineRange(m[1] || '.'); if (!r) { say('E: bad range'); return; }
      const d = m[2], rest = m[3]; const parts = []; let acc = '', escd = false;
      for (const ch of rest) { if (escd) { acc += ch; escd = false; } else if (ch === '\\') { acc += ch; escd = true; } else if (ch === d) { parts.push(acc); acc = ''; } else acc += ch; } parts.push(acc);
      const [pat, rep = '', flags = ''] = parts; if (!pat) { say('E: empty pattern'); return; }
      const re = regex(pat); if (!re) return; const all = flags.includes('g');
      const reI = flags.includes('i') && !re.flags.includes('i') ? new RegExp(re.source, re.flags + 'i') : re, reNoG = new RegExp(reI.source, reI.flags.replace('g', ''));
      const jsrep = rep.replace(/\\(\d)/g, '$$$1').replace(/(^|[^\\])&/g, '$1$$&').replace(/\\&/g, '&');
      snap(); let count = 0, lines = 0;
      for (let l = r[0]; l <= r[1]; l++) { const s = line(l); const k = all ? (s.match(reI) || []).length : (reNoG.test(s) ? 1 : 0);
        if (k) { count += k; lines++; edit(starts[l], lineEnd(l), s.replace(all ? reI : reNoG, jsrep)); } }
      if (!count) { undos.pop(); say('E486: Pattern not found: ' + pat); return; }
      cur = firstNb(r[1]); want = col(cur); changed(); say(count > 1 || lines > 1 ? count + ' substitutions on ' + lines + ' lines' : ''); return;
    }
    if ((m = c.match(/^(\d+)$/))) { cur = firstNb(Math.max(0, Math.min(lastLine(), +m[1] - 1))); want = col(cur); place(); return; }
    if (c === '$') { cur = firstNb(lastLine()); place(); return; }
    switch (c) {
      case 'w': write(); return;
      case 'wq': case 'x': write(leaveTo); return;
      case 'q': if (modified()) { say('E37: No write since last change (add ! to override)'); return; } leaveTo(); return;
      case 'q!': leaveTo(); return;
      case 'e': if (modified()) { say('E37: No write since last change (add ! to override)'); return; } window.onbeforeunload = null; location.reload(); return;
      case 'e!': window.onbeforeunload = null; location.reload(); return;
      case 'noh': case 'nohlsearch': hl = null; hilite(); return;
      case 'set tw?': case 'set textwidth?': say('  textwidth=' + tw); return;
      case 'help': say('genesis.js: motions, operators d c y gq, objects, v V, u ^R ., / n *, :w :q :s :N :noh :set tw='); return;
    }
    if ((m = c.match(/^set\s+(tw|textwidth)=(\d+)$/))) { tw = +m[2]; rule(); say('  textwidth=' + tw); return; }
    if (c === '') return;
    say('E492: Not an editor command: ' + c);
  }

  // ---- the keyboard
  const NAMES = { Escape: '<Esc>', Enter: '<CR>', Backspace: '<BS>', Tab: '<Tab>', Delete: '<Del>', ArrowLeft: '<Left>', ArrowRight: '<Right>', ArrowUp: '<Up>', ArrowDown: '<Down>', Home: '<Home>', End: '<End>', PageUp: '<PageUp>', PageDown: '<PageDown>' };
  const nameOf = (e) => { const k = e.key; if (NAMES[k]) return NAMES[k]; if (k.length !== 1) return null;
    if (e.ctrlKey) return '<C-' + k.toLowerCase() + '>'; if (e.metaKey) return '<D-' + k.toLowerCase() + '>'; return k; };
  const CTRL = new Set(['<C-r>', '<C-d>', '<C-u>', '<C-f>', '<C-b>', '<C-e>', '<C-y>', '<C-[>', '<C-c>']);
  ta.addEventListener('keydown', (e) => {
    if (e.isComposing || e.keyCode === 229) return;
    const k = nameOf(e); if (!k) return;
    if (k === '<D-s>') { e.preventDefault(); ex('w'); return; }
    if (k.startsWith('<D-')) return;
    if (mode === 'insert') {
      if (k.length === 1 && !e.ctrlKey && !e.altKey) { e.preventDefault(); typed(k); return; }
      if (k.length === 1) return;
      if (insertKey(k)) e.preventDefault(); return;
    }
    if (k.length === 1 && e.altKey) return;
    if (mode === 'cmd') { e.preventDefault(); cmdKey(k); return; }
    if (k.startsWith('<C-') && !CTRL.has(k)) return;
    e.preventDefault(); feed(k);
  });
  // an extension can eat Escape and blur the box instead (vimium does): a blur
  // that leaves nothing focused while the page keeps focus is read as that Escape
  let pressed = 0; document.addEventListener('pointerdown', () => { pressed = Date.now(); }, true);
  ta.addEventListener('blur', () => setTimeout(() => {
    if (!document.hasFocus() || document.activeElement !== document.body || Date.now() - pressed < 500) return;
    if (mode === 'insert') leave(); else if (mode === 'cmd') cmdKey('<Esc>'); else feed('<Esc>'); ta.focus({ preventScroll: true }); }, 0));
  // what the textbox catches on its own: composed text, dead keys, a paste
  const drain = () => { const v = ta.value; if (!v) return; ta.value = '';
    if (mode === 'insert') typed(v); else if (mode === 'normal') { reg = { text: v.endsWith('\n') ? v.slice(0, -1) : v, line: v.endsWith('\n') }; put(false, 1); } };
  ta.addEventListener('input', (e) => { if (e.isComposing) return; drain(); });
  ta.addEventListener('compositionend', () => setTimeout(drain, 0));
  // a click places the cursor; a drag still selects, for copying
  root.addEventListener('click', (e) => {
    const s = getSelection(); if (s && !s.isCollapsed) return;
    const p = document.caretPositionFromPoint ? document.caretPositionFromPoint(e.clientX, e.clientY) : (document.caretRangeFromPoint && document.caretRangeFromPoint(e.clientX, e.clientY));
    const node = p && (p.offsetNode || p.startContainer), off = p && (p.offset !== undefined ? p.offset : p.startOffset);
    const el = node && (node.nodeType === 1 ? node : node.parentElement).closest('.l'); const l = el ? lineEl.indexOf(el) : -1;
    if (l >= 0) { let c = 0; const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, { acceptNode: (n) => n.parentElement.closest('.g') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT });
      let n; while ((n = w.nextNode())) { if (n === node) { c += off; break; } c += n.data.length; }
      if (node.nodeType === 1) c = line(l).length;
      cur = mode === 'insert' ? at(l, c) : clampNormal(at(l, c)); want = col(cur); place(); }
    ta.focus({ preventScroll: true });
  });
  document.addEventListener('click', (e) => { if (!e.target.closest('a, input, textarea, button')) ta.focus({ preventScroll: true }); });
  window.addEventListener('resize', () => { measure(); place(); });
  window.onbeforeunload = (e) => { if (modified()) { e.preventDefault(); e.returnValue = ''; } };

  render(); measure(); cur = clampNormal(0); place(); ta.focus({ preventScroll: true });
  // the font arrives after the first layout: measure again in it
  if (document.fonts) { const fit = () => { measure(); place(); }; document.fonts.ready.then(fit); document.fonts.addEventListener('loadingdone', fit); }
  // a handle for scripts: send('dwihello<Esc>') types as vim reads it
  const KEYS = { '<Esc>': 'Escape', '<CR>': 'Enter', '<BS>': 'Backspace', '<Tab>': 'Tab', '<Del>': 'Delete', '<Left>': 'ArrowLeft', '<Right>': 'ArrowRight', '<Up>': 'ArrowUp', '<Down>': 'ArrowDown', '<PageDown>': 'PageDown', '<PageUp>': 'PageUp' };
  window.vim = { get text() { return text; }, get cur() { return cur; }, get mode() { return mode; }, get reg() { return reg; }, get msg() { return msg; },
    send: (s) => { const toks = s.match(/<[^>]+>|[^]/g) || []; for (const t of toks) { let m;
      if ((m = t.match(/^<C-(.)>$/))) ta.dispatchEvent(new KeyboardEvent('keydown', { key: m[1], ctrlKey: true, cancelable: true }));
      else ta.dispatchEvent(new KeyboardEvent('keydown', { key: KEYS[t] || t, cancelable: true })); } } };
})();`;

module.exports = { conscious, save };
