// @ts-nocheck genesis.reader.js - the primary expression of GENESIS.txt: the
// mobile reader. the file is parsed into its model (genesis.model.js), the
// model rendered by a view (genesis.views.js), the page framed as the
// harness's (VvilL.js). the first view is the page as it has been, white,
// the sentences black and red. the model and the views are stringified
// into the page, where the reader rebuilds the model from the text and
// keeps it, with the views and a re-render, under window.genesis, the
// ground the page's other modules stand on: the bar (genesis.bar.js) and
// the flash readers (genesis.flash.js), shipped after it and shared with
// the L4 editor (genesis.js), which reads the model live. the loop
// headers stand in the body's style; the harness's bar, VvilL at its left,
// sticks to the top and, once the first loop's header has scrolled under
// it, says at its center the loop the page's center holds, large, bold
// italic, number and name (0: Reincarnation), and under it, bold, the
// layer the center holds (Layer 4), in the number's own color from the
// body; and under the logo, the document's name, GENESIS, as the title
// art names it. before that, at the top, the center says GENESIS in the
// loop's style. the blocks outside the focus, the layer named (with its
// notes), or the loop named, are greyed a little; at the top none are.
// at its right, the flash readers (genesis.flash.js). a tap
// on the loop there scrolls to the next loop, a tap on the layer to the
// next layer, the first again after the last. a tap on
// the title art turns dark mode on or off, as the page has done. reading
// only: the block editor and the reset button stayed with the .md
// expression (VvilL.js); the editor for this file is the L3 (genesis.js).

const log = require('./log.js').init(__filename, '📖', '32', 1);
const V = require('./atmosphere').register('VvilL.js');
const M = require('./atmosphere').register('genesis.model.js');
const W = require('./atmosphere').register('genesis.views.js');
const F = require('./atmosphere').register('genesis.flash.js');
const B = require('./atmosphere').register('genesis.bar.js');

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
    + `<script>const model = (${M.MODEL}), views = (${W.VIEWS})();\n${READER_JS}</script>`
    + `<script>${B.BAR_JS}</script>`
    + `<script>${F.FLASH_JS}</script>`,
    { title: cpath.split('/').pop(), styles, head: `<style>${READER_CSS}${B.BAR_CSS}${F.FLASH_CSS}</style>` });
}

// the gutter numbers in full color, so they read on a phone. the bar's
// own styles come with it (genesis.bar.js), the flash readers' with them
const READER_CSS = /* css */ `
  .vvill-conscious .g { opacity: 1; font-weight: bold; }
`;

// the page's script: the model rebuilt from the text, the reader's API,
// dark mode on a tap of the title art; the bar and the flash readers
// follow, standing on window.genesis
const READER_JS = /* js */ `(() => {
  const root = document.getElementById('conscious'), status = document.getElementById('cstatus');
  const doc = model(JSON.parse(document.getElementById('text').textContent));
  const say = (m) => { status.textContent = m; };
  const render = (name) => { const v = views[name]; if (!v) return false; root.innerHTML = v.html(doc); root.dataset.view = name; root.dispatchEvent(new Event('genesis:render')); return true; };
  window.genesis = { doc, views, render, say, get view() { return root.dataset.view; } };
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
