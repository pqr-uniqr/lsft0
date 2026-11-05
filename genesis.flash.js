// @ts-nocheck genesis.flash.js - the FLASH READERS of GENESIS.txt: a page
// module the reader (genesis.reader.js) ships after its own, driven by
// the model through window.genesis. the reader's bar names the loop and
// the layer the page's center holds; this module hangs the flash reader
// at the bar's right, for that TARGET: the layer in view; a loop's header
// region, the whole loop; the top of the page, before any loop has come
// under the bar, the whole document, every loop header and every layer
// body in turn (not the notes that trail them). a button wipes the
// target's text and writes it again at a constant rate, to guide the eye,
// following the writing down the page; under it the time the writing
// will take and a slider for the speed. a second button opens a player
// over the page that flashes the target word by word, one word at a time
// in the middle of the screen, with its own speed slider and playtime.
// speeds are words per minute, kept on the phone (localStorage
// genesis-speed); the writing takes a word for six characters, a word
// and its space.
//
// the writing hides every character of the target's blocks (a loop's
// header line only; the gutter and the numbers stay, as landmarks) and
// shows them one by one, each frame as many as the clock says; stop, or
// the end, restores the html as it was; while it writes, the reader's
// greying of the blocks out of focus is lifted. the player takes the words of the
// target's sentences (the model's cut), pausing a little longer on
// punctuation and long words, and says which layer it is in; a tap on the
// word pauses and resumes, Escape closes, space pauses. window.genesis
// .flash offers target, start, stop, open, close, toggle and the speeds.

const FLASH_CSS = /* css */ `
  .flash-go { grid-area: 1 / 3; justify-self: end; display: flex; gap: 6px; }
  .flash-set { grid-area: 2 / 3; justify-self: end; display: flex; align-items: center; gap: 6px; font-size: 0.85em; line-height: 1.2; }
  .flash-set input { width: 72px; margin: 0; }
  .flash-set .time { font-variant-numeric: tabular-nums; }
  .flash-go button, .flash-modal button { font: inherit; font-size: 0.85em; border: 1px solid #000; background: #fff; color: #000; padding: 2px 8px; cursor: pointer; }
  .flashing .c { visibility: hidden; } .flashing .c.on { visibility: visible; }
  .flash-modal { position: fixed; inset: 0; z-index: 10; background: #fff; color: #000; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 24px;
    font-family: ui-monospace, Menlo, Consolas, monospace; }
  .flash-modal[hidden] { display: none; } /* the attribute, over the flex */
  .flash-modal .close { position: absolute; top: 12px; right: 16px; }
  .flash-modal .where { font-size: 0.85em; opacity: 0.6; }
  .flash-modal .word { font-size: min(2.4em, 9vw); font-weight: bold; white-space: nowrap; min-height: 1.3em; cursor: pointer; padding: 0 16px; }
  .flash-modal .ctl { display: flex; align-items: center; gap: 12px; }
  .flash-modal .ctl input { width: 120px; margin: 0; }
  .flash-modal .time { font-variant-numeric: tabular-nums; }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) .flash-go button, :root:not([data-theme="light"]) .flash-modal button { background: #000; color: #fff; border-color: #fff; }
    :root:not([data-theme="light"]) .flash-modal { background: #000; color: #fff; }
  }
  :root[data-theme="dark"] .flash-go button, :root[data-theme="dark"] .flash-modal button { background: #000; color: #fff; border-color: #fff; }
  :root[data-theme="dark"] .flash-modal { background: #000; color: #fff; }
`;

const FLASH_JS = /* js */ `(() => {
  const g = window.genesis, root = document.getElementById('conscious'), bar = document.querySelector('.vvill-bar'); // the model live under g.doc (the editor's changes as it types)
  const SPEED = { text: 300, words: 300 };
  try { Object.assign(SPEED, JSON.parse(localStorage.getItem('genesis-speed') || '{}')); } catch (e) {}
  const keep = () => { try { localStorage.setItem('genesis-speed', JSON.stringify(SPEED)); } catch (e) {} };
  const clock = (s) => { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  const cps = () => SPEED.text * 6 / 60; // characters a second: a word and its space, six characters
  // a block's element; of a loop's header block, its header line alone
  const el = (b) => { const e = root.querySelector('.blk[data-i="' + b.i + '"]'); return e && b.role === 'loop' ? e.querySelector('.l.loop') : e; };
  const texts = (e) => { // the text nodes the writing writes: not the gutter, not the number
    const walker = document.createTreeWalker(e, NodeFilter.SHOW_TEXT), nodes = []; let n;
    while ((n = walker.nextNode())) if (!n.parentElement.closest('.g, b')) nodes.push(n);
    return nodes; };
  const length = (e) => texts(e).reduce((n, t) => n + t.data.length, 0);

  // ---- the target: what the bar holds
  const target = () => {
    const y = g.layer, l = g.loop;
    if (y) return { kind: 'layer', name: 'Loop ' + y.loop + ' · Layer ' + y.n, blocks: [y.body], layers: [y] };
    if (l) return { kind: 'loop', name: 'Loop ' + l.n + ': ' + l.name, blocks: [l.head, ...l.layers.map(z => z.body)], layers: l.layers };
    const doc = g.doc;
    return { kind: 'doc', name: doc.header.title, blocks: doc.loops.flatMap(z => [z.head, ...z.layers.map(q => q.body)]), layers: doc.loops.flatMap(z => z.layers) };
  };

  // ---- the controls, at the bar's right: the buttons above, the time and the speed below
  const go = document.createElement('div'); go.className = 'flash-go';
  go.innerHTML = '<button type="button" class="write">flash</button><button type="button" class="words">words</button>';
  const set = document.createElement('div'); set.className = 'flash-set';
  set.innerHTML = '<span class="time"></span><input type="range" min="100" max="900" step="20">';
  bar.append(go, set);
  const C = { write: go.querySelector('.write'), words: go.querySelector('.words'), time: set.querySelector('.time'), speed: set.querySelector('input') };
  C.speed.value = SPEED.text;
  const times = () => { if (run) return; const t = target(); C.time.textContent = clock(t.blocks.reduce((n, b) => n + length(el(b)), 0) / cps()); C.time.title = t.name; };
  C.speed.oninput = () => { SPEED.text = +C.speed.value; keep(); if (run) run.t0 = performance.now() - run.n / cps() * 1000; else times(); };
  C.write.onclick = () => (run ? stop() : start(target()));
  C.words.onclick = () => open(target());
  root.addEventListener('genesis:view', times);
  root.addEventListener('genesis:render', () => { stop(); times(); });

  // ---- the writing
  let run = null;
  const chars = (e) => { // every character of the text in a span of its own
    const spans = [];
    for (const t of texts(e)) { const frag = document.createDocumentFragment();
      for (const ch of t.data) { const s = document.createElement('span'); s.className = 'c'; s.textContent = ch; frag.appendChild(s); spans.push(s); }
      t.replaceWith(frag); }
    return spans;
  };
  const start = (t) => {
    stop(); const parts = t.blocks.map(el).filter(Boolean).map(e => ({ e, html: e.innerHTML })); if (!parts.length) return;
    for (const p of parts) { p.spans = chars(p.e); p.e.classList.add('flashing'); }
    run = { t, parts, spans: parts.flatMap(p => p.spans), n: 0, t0: performance.now(), scrolled: 0 };
    root.classList.add('writing'); C.write.textContent = 'stop'; run.frame = requestAnimationFrame(tick);
  };
  const tick = (now) => {
    const r = run; if (!r) return;
    const want = Math.min(r.spans.length, Math.floor((now - r.t0) / 1000 * cps()));
    for (; r.n < want; r.n++) r.spans[r.n].classList.add('on');
    C.time.textContent = clock((r.spans.length - r.n) / cps());
    if (r.n && now - r.scrolled > 400) { const b = r.spans[r.n - 1].getBoundingClientRect(); // follow the writing down the page
      if (b.bottom > innerHeight * 0.7 || b.top < 0) { window.scrollTo({ top: scrollY + b.bottom - innerHeight * 0.4, behavior: 'smooth' }); r.scrolled = now; } }
    if (r.n >= r.spans.length) { stop(); return; }
    r.frame = requestAnimationFrame(tick);
  };
  const stop = () => {
    const r = run; if (!r) return; run = null; cancelAnimationFrame(r.frame);
    for (const p of r.parts) { p.e.innerHTML = p.html; p.e.classList.remove('flashing'); }
    root.classList.remove('writing'); C.write.textContent = 'flash'; times();
  };

  // ---- the player
  const modal = document.createElement('div'); modal.className = 'flash-modal'; modal.hidden = true;
  modal.innerHTML = '<button type="button" class="close">close</button><div class="where"></div><div class="word"></div>'
    + '<div class="ctl"><button type="button" class="play">pause</button><span class="time"></span><input type="range" min="100" max="900" step="20"></div>';
  document.body.appendChild(modal);
  const M = { word: modal.querySelector('.word'), where: modal.querySelector('.where'), play: modal.querySelector('.play'), time: modal.querySelector('.time'), speed: modal.querySelector('input') };
  let play = null;
  const dur = (w) => 60 / SPEED.words * (/[.?!,;:]["')\\]]*$/.test(w) ? 1.6 : 1) * (w.length > 9 ? 1.3 : 1); // seconds on a word
  const total = (ws) => ws.reduce((s, w) => s + dur(w), 0);
  const open = (t) => {
    const words = [], segs = []; // the target's words, and which layer each run of them is from
    for (const y of t.layers) { const ws = y.sentences.flatMap(s => s.words); if (!ws.length) continue; segs.push({ y, from: words.length, to: words.length + ws.length }); words.push(...ws); }
    if (!words.length) return;
    close(); stop(); play = { t, words, segs, i: 0, on: true, timer: 0 };
    M.speed.value = SPEED.words; modal.hidden = false; show();
  };
  const show = () => {
    const p = play; if (!p) return; const w = p.words[p.i], seg = p.segs.find(s => p.i >= s.from && p.i < s.to);
    M.where.textContent = seg ? 'Loop ' + seg.y.loop + ' · Layer ' + seg.y.n : p.t.name;
    M.word.textContent = w; M.time.textContent = clock(total(p.words.slice(0, p.i))) + ' / ' + clock(total(p.words));
    M.play.textContent = p.on ? 'pause' : (p.i + 1 < p.words.length ? 'play' : 'again');
    clearTimeout(p.timer);
    if (p.on) p.timer = setTimeout(() => { if (p.i + 1 < p.words.length) { p.i++; show(); } else { p.on = false; show(); } }, dur(w) * 1000);
  };
  const toggle = () => { const p = play; if (!p) return; if (p.on) { p.on = false; show(); } else { if (p.i + 1 >= p.words.length) p.i = 0; p.on = true; show(); } };
  const close = () => { const p = play; if (!p) return; clearTimeout(p.timer); play = null; modal.hidden = true; };
  M.play.onclick = toggle; M.word.onclick = toggle; modal.querySelector('.close').onclick = close;
  M.speed.oninput = () => { SPEED.words = +M.speed.value; keep(); show(); };
  addEventListener('keydown', (e) => { if (!play) return; if (e.key === 'Escape') close(); else if (e.key === ' ') { e.preventDefault(); toggle(); } });

  times();
  g.flash = { target, start, stop, open, close, toggle, speed: SPEED, get run() { return run; }, get play() { return play; } };
})();`;

module.exports = { FLASH_JS, FLASH_CSS };
