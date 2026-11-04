// @ts-nocheck genesis.reader.js - the primary expression of GENESIS.txt: the
// mobile reader. the file is parsed into its model (genesis.model.js), the
// model rendered by a view (genesis.views.js), the page framed as the
// harness's (VvilL.js). the first view is the page as it has been, white,
// the sentences black and red. the model and the views are stringified
// into the page, where the reader rebuilds the model from the text and
// keeps it, with the views and a re-render, under window.genesis: the
// ground for what comes next (loop headers always in view, a corner that
// says the loop, layer and sentence in view, the flash readers). the loop
// headers stand in the body's style; the harness's bar, VvilL at its left,
// sticks to the top and, once a loop's header has scrolled under it, says
// the loop at its center, large, bold italic, number and name (0:
// Reincarnation), and under it, bold, the layer whose body has scrolled
// under it (Layer 4), in the number's own color from the body; and under
// the logo, the document's name, GENESIS, as the title art names it. a tap
// on the loop there scrolls to the next loop, a tap on the layer to the
// next layer, the first again after the last. a tap on
// the title art turns dark mode on or off, as the page has done. reading
// only: the block editor and the reset button stayed with the .md
// expression (VvilL.js); the editor for this file is the L3 (genesis.js).

const log = require('./log.js').init(__filename, '📖', '32', 1);
const V = require('./atmosphere').register('VvilL.js');
const M = require('./atmosphere').register('genesis.model.js');
const W = require('./atmosphere').register('genesis.views.js');

// 📄 GENESIS.txt, read. a 🎨 subgene passes style overrides to the frame.
function read(xface, subgenes, petri) {
  const cpath = petri.pathology.cpath, raw = xface.file.toString('utf8');
  let styles = {};
  try { styles = JSON.parse(subgenes['🎨'] || '{}'); }
  catch (e) { log.line(`🎨 unparseable subgene: ${subgenes['🎨']}`); }
  const esc = V.kernel().esc, doc = M.model(raw), vs = W.views(), name = 'primary';
  const segs = cpath.split('/').filter(Boolean); let acc = '';
  const crumb = `<p class="vvill-crumb">/${segs.map((s, i) => { acc += '/' + s; return i === segs.length - 1 ? esc(s) : `<a href="${acc}">${esc(s)}</a>`; }).join('/')}</p>`;
  log.line(`📖 ${cpath}: ${doc.loops.length} loops, ${doc.loops.reduce((n, l) => n + l.layers.length, 0)} layers, ${doc.sentences.length} sentences`);
  return V.frame(crumb
    + `<div class="vvill-conscious" id="conscious" data-path="${esc(cpath)}" data-view="${name}">${vs[name].html(doc)}</div>`
    + `<p id="cstatus" class="vvill-status"></p>`
    + `<script type="application/json" id="text">${JSON.stringify(raw).replace(/</g, '\\u003c')}</script>`
    + `<script>const model = (${M.MODEL}), views = (${W.VIEWS})();\n${READER_JS}</script>`,
    { title: cpath.split('/').pop(), styles, head: `<style>${READER_CSS}</style>` });
}

// the bar sticks, in the page's own background (inherit: the body's, in
// either mode), a grid of two rows: VvilL left on the loop's line, the
// loop centered and larger, the layer centered under it, its line always
// kept so the bar never jumps, the document's name under the logo. the
// layer takes the body's number colors,
// n mod 7 (the kernel's, light and dark). the gutter numbers in full color
const INK = ['#d00000', '#e07000', '#b8a000', '#00a000', '#0070d0', '#0000d0', '#7000d0'];
const INK_DARK = ['#ff0000', '#ff8000', '#ffff00', '#00ff00', '#0080ff', '#0000ff', '#8000ff'];
const inks = (pre, cols) => cols.map((c, n) => `${pre} .vvill-bar .d${n} { color: ${c}; }`).join('\n  ');
const READER_CSS = /* css */ `
  .vvill-bar { position: sticky; top: 0; z-index: 2; background: inherit; display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; padding: 8px 16px; }
  .vvill-bar a { grid-area: 1 / 1; }
  .vvill-doc { grid-area: 2 / 1; font-weight: bold; white-space: nowrap; line-height: 1.2; min-height: 1.2em; }
  .vvill-loop { grid-area: 1 / 2; text-align: center; font-size: 1.3em; font-weight: bold; font-style: italic; white-space: nowrap; line-height: 1.15; min-height: 1.15em; }
  .vvill-layer { grid-area: 2 / 2; text-align: center; font-weight: bold; white-space: nowrap; line-height: 1.2; min-height: 1.2em; }
  .vvill-loop, .vvill-layer { cursor: pointer; }
  ${inks('', INK)}
  @media (prefers-color-scheme: dark) { ${inks(':root:not([data-theme="light"])', INK_DARK)} }
  ${inks(':root[data-theme="dark"]', INK_DARK)}
  .vvill-conscious .g { opacity: 1; font-weight: bold; } /* the gutter numbers in full color, so they read on a phone */
`;

// the page's script: the model rebuilt from the text, the reader's API,
// the loop in view named in the bar, dark mode on a tap of the title art
const READER_JS = /* js */ `(() => {
  const root = document.getElementById('conscious'), status = document.getElementById('cstatus');
  const doc = model(JSON.parse(document.getElementById('text').textContent));
  const say = (m) => { status.textContent = m; };
  const render = (name) => { const v = views[name]; if (!v) return false; root.innerHTML = v.html(doc); root.dataset.view = name; els.clear(); inView(); return true; };
  // the loop and the layer in view: the last loop header, and the last layer
  // body after it, scrolled under the bar; named there
  const bar = document.querySelector('.vvill-bar'), head = document.createElement('i'), sub = document.createElement('span'), name = document.createElement('span');
  head.className = 'vvill-loop'; sub.className = 'vvill-layer'; name.className = 'vvill-doc'; bar.append(head, sub, name);
  const els = new Map();
  const el = (b) => { let e = els.get(b.i); if (!e) { e = root.querySelector('.blk[data-i="' + b.i + '"]'); els.set(b.i, e); } return e; };
  let loop = null, layer = null;
  const inView = () => {
    const under = bar.getBoundingClientRect().bottom; let l = null, y = null;
    for (const b of doc.blocks) {
      if (b.role !== 'loop' && b.role !== 'body') continue;
      const e = el(b); if (!e || e.getBoundingClientRect().top >= under) break;
      if (b.role === 'loop') { l = b.loop; y = null; } else y = b.layer;
    }
    loop = l === null ? null : doc.loop(l); layer = loop && y !== null ? doc.layer(l, y) : null;
    head.textContent = loop ? loop.n + ': ' + loop.name : ''; name.textContent = loop ? doc.header.title : '';
    sub.textContent = layer ? 'Layer ' + layer.n : ''; sub.className = 'vvill-layer' + (layer ? ' d' + (layer.n % 7) : '');
  };
  addEventListener('scroll', inView, { passive: true }); addEventListener('resize', inView); inView();
  // a tap on the bar's loop: to the next loop's header; on its layer: to the
  // next layer's body. the block's first line is set just under the bar so
  // the bar names it; the page's end stands for the blocks that cannot come
  // under the bar on a tall window; past the last, the first again
  const topOf = (b) => el(b).getBoundingClientRect().top + scrollY;
  const go = (bs) => {
    const h = bar.getBoundingClientRect().height, max = document.documentElement.scrollHeight - innerHeight;
    const aim = (b) => Math.min(topOf(b) - h + 1, max);
    const b = bs.find(b => aim(b) > scrollY + 1) || bs[0];
    window.scrollTo({ top: aim(b), behavior: 'smooth' });
  };
  const nextLoop = () => go(doc.loops.map(l => l.head)), nextLayer = () => go(doc.loops.flatMap(l => l.layers).map(y => y.body));
  head.addEventListener('click', nextLoop); sub.addEventListener('click', nextLayer);
  window.genesis = { doc, views, render, say, nextLoop, nextLayer, get view() { return root.dataset.view; }, get loop() { return loop; }, get layer() { return layer; } };
  root.addEventListener('click', (e) => { const blk = e.target.closest('.blk'); if (blk && blk.dataset.i === '0' && !e.target.closest('a')) theme(); });
  // dark mode on or off, pinned in localStorage and read before paint by
  // the frame's head script. a choice that matches the phone's own is
  // unpinned, so the page follows the phone again.
  function theme() {
    const html = document.documentElement, sys = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const now = html.dataset.theme || sys, want = now === 'dark' ? 'light' : 'dark';
    try {
      if (want === sys) { delete html.dataset.theme; localStorage.removeItem('vvill-theme'); }
      else { html.dataset.theme = want; localStorage.setItem('vvill-theme', want); }
    } catch (x) { html.dataset.theme = want; }
    say(want === sys ? want + ', with the phone' : want + ', pinned');
  }
})();`;

module.exports = { read };
