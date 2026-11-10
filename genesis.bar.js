// @ts-nocheck genesis.bar.js - the bar of GENESIS.txt's pages: the
// harness's bar, VvilL at its left, made sticky, naming at its center the
// loop and the layer in view. shared by the reader (genesis.reader.js,
// the primary, L0) and the L4 editor (genesis.js), shipped after the
// script that stands window.genesis up with the model under .doc (the
// reader's, once; the editor's, live from its buffer).
//
// in view: once the first loop header has scrolled under the bar, the
// last loop header above the probe, and the last layer body after it.
// the probe is the page's center, or what the page points at through
// genesis.probe (the editor's caret, when it is in view); a page that
// points needs only the first header above its probe. before that, at
// the top, the center says the document's name, GENESIS, in the loop's
// style. the loop stands large, bold italic, number and name
// (0: Reincarnation); under it, bold, the layer (Layer 4), in the
// number's own color from the body; under the logo, the document's name
// once a loop is named. the focus, the layer named (with its notes) or
// the loop named, is boxed, one box around its blocks; none at the top. a tap on the loop
// scrolls to the next loop's header, on the layer to the next layer's
// body, the first again after the last; a page may take the taps for
// its own ends through genesis.tap (the L4 editor switches its scheme)
// and carry the moves out its own way through genesis.go. the bar looks again on
// every scroll and resize, and on genesis:render from the page; after
// each look it tells the page: genesis:view. on window.genesis it sets
// loop and layer (the ones named, or null), nextLoop, nextLayer, inView.

// the bar sticks, in the page's own background (inherit: the body's, in
// either mode), a grid of two rows: VvilL left on the loop's line, the
// loop centered and larger, the layer centered under it, its line always
// kept so the bar never jumps, the document's name under the logo. the
// layer takes the body's number colors, n mod 7 (the kernel's, light and
// dark)
const INK = ['#d00000', '#e07000', '#b8a000', '#00a000', '#0070d0', '#0000d0', '#7000d0'];
const INK_DARK = ['#ff0000', '#ff8000', '#ffff00', '#00ff00', '#0080ff', '#0000ff', '#8000ff'];
const inks = (pre, cols) => cols.map((c, n) => `${pre} .vvill-bar .d${n} { color: ${c}; }`).join('\n  ');
const BAR_CSS = /* css */ `
  .vvill-bar { position: sticky; top: 0; z-index: 2; background: inherit; display: grid; grid-template-columns: 1fr auto 1fr; column-gap: 12px; align-items: center; padding: 8px 16px; }
  .vvill-bar a { grid-area: 1 / 1; }
  .vvill-doc { grid-area: 2 / 1; font-weight: bold; white-space: nowrap; line-height: 1.2; min-height: 1.2em; }
  .vvill-loop { grid-area: 1 / 2; text-align: center; font-size: 1.3em; font-weight: bold; font-style: italic; white-space: nowrap; line-height: 1.15; min-height: 1.15em; }
  .vvill-layer { grid-area: 2 / 2; text-align: center; font-weight: bold; white-space: nowrap; line-height: 1.2; min-height: 1.2em; }
  .vvill-loop, .vvill-layer { cursor: pointer; }
  ${inks('', INK)}
  @media (prefers-color-scheme: dark) { ${inks(':root:not([data-theme="light"])', INK_DARK)} }
  ${inks(':root[data-theme="dark"]', INK_DARK)}
  .vvill-conscious { position: relative; } /* the box's ground */
  .vvill-focus { position: absolute; left: -0.25em; right: -0.3em; border: 1px solid currentColor; opacity: 0.45; pointer-events: none; } /* around the layer or the loop named */
`;

const BAR_JS = /* js */ `(() => {
  const g = window.genesis, root = document.getElementById('conscious');
  const bar = document.querySelector('.vvill-bar'), head = document.createElement('i'), sub = document.createElement('span'), name = document.createElement('span');
  head.className = 'vvill-loop'; sub.className = 'vvill-layer'; name.className = 'vvill-doc'; bar.append(head, sub, name);
  const els = new Map();
  const el = (b) => { let e = els.get(b.i); if (!e) { e = root.querySelector('.blk[data-i="' + b.i + '"]'); els.set(b.i, e); } return e; };
  let loop = null, layer = null;
  // the box: one around the blocks in focus, in the page's own
  // coordinates, a little outside the text, the gutter numbers left
  // outside; hung again after a re-render takes it
  const box = document.createElement('div'); box.className = 'vvill-focus'; box.hidden = true;
  const frame = (blocks) => {
    if (!box.isConnected) root.appendChild(box);
    const r = root.getBoundingClientRect(); let top = Infinity, bot = -Infinity;
    for (const b of blocks) { const e = el(b); if (!e) continue; const q = e.getBoundingClientRect(); if (q.top < top) top = q.top; if (q.bottom > bot) bot = q.bottom; }
    box.hidden = top === Infinity; if (box.hidden) return;
    box.style.top = (top - r.top - 3) + 'px'; box.style.height = (bot - top + 6) + 'px';
  };
  // the loop and the layer in view: once the first loop header has scrolled
  // under the bar (or, when the page points, above the probe), the last loop
  // header above the probe (the page's center, or where the page points),
  // and the last layer body after it; named in the bar, and told to the page
  const inView = () => {
    const doc = g.doc, under = bar.getBoundingClientRect().bottom, mid = g.probe ? g.probe() : innerHeight / 2; let l = null, y = null;
    const first = doc.loops.length ? el(doc.loops[0].head) : null;
    if (first && first.getBoundingClientRect().top < (g.probe ? mid : under)) for (const b of doc.blocks) {
      if (b.role !== 'loop' && b.role !== 'body') continue;
      const e = el(b); if (!e || e.getBoundingClientRect().top >= mid) break;
      if (b.role === 'loop') { l = b.loop; y = null; } else y = b.layer;
    }
    loop = l === null ? null : doc.loop(l); layer = loop && y !== null ? doc.layer(l, y) : null;
    head.textContent = loop ? loop.n + ': ' + loop.name : doc.header.title; name.textContent = loop ? doc.header.title : '';
    sub.textContent = layer ? 'Layer ' + layer.n : ''; sub.className = 'vvill-layer' + (layer ? ' d' + (layer.n % 7) : '');
    // the focus: the layer named, with its notes, or the loop named, boxed; none at the top
    frame(layer ? layer.blocks : loop ? [loop.head, ...loop.lead, ...loop.layers.flatMap(z => z.blocks)] : []);
    root.dispatchEvent(new Event('genesis:view'));
  };
  addEventListener('scroll', inView, { passive: true }); addEventListener('resize', inView);
  root.addEventListener('genesis:render', () => { els.clear(); inView(); });
  // a tap on the bar's loop: to the next loop's header; on its layer: to the
  // next layer's body, unless the page takes the taps (genesis.tap). the
  // block's first line is set just under the bar so the bar names it; the
  // page's end stands for the blocks that cannot come under the bar on a
  // tall window; past the last, the first again. a page with a cursor (the
  // editor) carries the move out its own way (genesis.go)
  const topOf = (b) => el(b).getBoundingClientRect().top + scrollY;
  const go = (bs) => {
    if (g.go) return g.go(bs);
    const h = bar.getBoundingClientRect().height, max = document.documentElement.scrollHeight - innerHeight;
    const aim = (b) => Math.min(topOf(b) - h + 1, max);
    const b = bs.find(b => aim(b) > scrollY + 1) || bs[0];
    window.scrollTo({ top: aim(b), behavior: 'smooth' });
  };
  const nextLoop = () => go(g.doc.loops.map(l => l.head)), nextLayer = () => go(g.doc.loops.flatMap(l => l.layers).map(y => y.body));
  head.addEventListener('click', () => g.tap ? g.tap('loop') : nextLoop()); sub.addEventListener('click', () => g.tap ? g.tap('layer') : nextLayer());
  Object.defineProperties(g, { loop: { get: () => loop }, layer: { get: () => layer }, nextLoop: { value: nextLoop }, nextLayer: { value: nextLayer }, inView: { value: inView } });
  inView();
})();`;

module.exports = { BAR_JS, BAR_CSS };
