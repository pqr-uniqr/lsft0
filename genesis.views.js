// @ts-nocheck genesis.views.js - the VIEWS of GENESIS.txt: ways to render a
// model (genesis.model.js) as html, each a pure function of the doc. pure
// like the model, so the same views render the page in node and re-render
// it in the browser. the first, primary, is the page as it has been: white
// (dark with the phone), the sentences alternately black and red and
// numbered in the gutter, a layer's number in ctrl's colors by n mod 7,
// the sigil lines in ctrl's colors, links as anchors. its html is the
// kernel's (VvilL.js) to the byte; a test keeps it so.
//
// a view: { name, about, html(doc) }

const views = () => {
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const LINK = /\[([^\]]+)\]\(([^)\s]+)\)/g;
  const inline = (s) => esc(s).replace(LINK, (m, t, h) => `<a href="${h}">${t}</a>`);
  const lineHtml = (ln) => {
    const g = ln.g > 0 ? `<span class="g s${ln.g % 2}">${ln.g}</span>` : '';
    const num = ln.num ? `<b class="d${parseInt(ln.num, 10) % 7}">${ln.num}</b>` : '';
    const body = ln.pieces.map(p => p.si < 0 ? inline(p.t) : `<span class="s${p.si % 2}">${inline(p.t)}</span>`).join('');
    return `<span class="l${ln.cls ? ' ' + ln.cls : ''}">${g}${num}${body}</span>`;
  };
  const blockHtml = (b) => `<div class="blk" data-i="${b.i}">${b.lines.map(lineHtml).join('')}</div>`;
  const primary = { name: 'primary', about: 'the page as it has been: sentences black and red, numbered in the gutter', html: (doc) => doc.blocks.map(blockHtml).join('\n') };
  return { primary };
};

module.exports = { views, VIEWS: views.toString() };
