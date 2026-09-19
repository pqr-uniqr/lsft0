// @ts-nocheck VvilL.js - mycelium expression of the VvilL tree
// the first piece of the user harness: the Lore, legible anywhere; and the
// base harness: the page at a personality's path, where the user meets it
// over the Web.
//
// four expressions: root (a directory: for a personality, the double
// split pane; otherwise a listing), conscious (.md files), dream (<n>.jsonl,
// a deposited conversation), and the live thread inside root, which opens
// one socket to the paddock keyed by the path and speaks the claude CLI's
// stream-json dialect straight through. style is refined, minimal Internet
// Basic: white bg, black letters, basic font, browser-blue links.
//
// a conscious file is shown as BLOCKS, the paragraphs of the text however
// long, separated by one or more blank lines, with ctrl-flavored syntax per
// line (headers, numbered paragraphs, the sigils). on the LAN the blocks
// are tactile: one tap turns a block red and back; two taps open it in a
// textbox; save posts the block to /vvill/.save (the 📮 gene, below), which
// replaces it only if the file still holds what the page had. the harness
// grows this way: surfaces the personality and the user touch, in place.
//
// the double split pane, the archetype UI of the harness: one pane for the
// single continuous conversation with the personality (its past
// conversations, deposited by number, then the open one, then the one
// textbox); one pane for the STABLES, where its administrative works are
// visualized. for now the stables are the directory: its files are the
// personality's memory and identity, its subdirectories the personalities
// it administers, and the same page waits at each of those paths. the
// stables also hold the RESET: during the Genesis test, once the open
// conversation has said its verdict (READY or NOT READY), a button appears
// that asks the paddock to wipe it into the playwright's attempts.
//
// override semantics: genes absorb root-down the lineage and every
// matching handler RUNS, each overwriting petri.html - deepest wins by
// overwrite, not by masking. so these handlers must stay pure (content
// in, html out, no side effects) or an overridden gene's run will leak.

const log = require('./log.js').init(__filename, '👁️', '32', 1)
const { join, dirname } = require('path');
const { turnsOf } = require('./atmosphere').register('dream.js');

// the paddock's port, so the thread knows where to open its socket
const PADDOCK_PORT = parseInt(process.env.PADDOCK_PORT, 10) || 8881;
const RECENT = 3; // deposited conversations rendered in full; older ones are linked

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const when = (ts) => ts ? new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';

// path segments as links, all but the last
const crumb = (cpath) => {
  const segs = cpath.split('/').filter(Boolean);
  let acc = '';
  const parts = segs.map((s, i) => {
    acc += '/' + s;
    return i === segs.length - 1 ? esc(s) : `<a href="${acc}">${esc(s)}</a>`;
  });
  return `<p class="vvill-crumb">/${parts.join('/')}</p>`;
};

const frame = (content, { title = 'VvilL', styles = {}, wide = false } = {}) => /* html */ `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<style>
  body {
    background: ${styles.bgColor || '#ffffff'};
    color: ${styles.textColor || '#000000'};
    font-family: ${styles.fontFamily || 'serif'};
    margin: 0;
  }
  .vvill-bar { border-bottom: 1px solid #000; padding: 12px 16px; }
  .vvill-bar a { color: inherit; text-decoration: none; font-weight: bold; }
  main { max-width: ${wide ? '64em' : '42em'}; margin: 0 auto; padding: 16px 16px 64px; }
  .vvill-crumb { word-break: break-all; }
  .vvill-ls div { margin: 6px 0; }
  .vvill-conscious {
    white-space: pre-wrap;
    overflow-wrap: break-word;
    font-family: ui-monospace, Menlo, Consolas, monospace;
    /* conscious files are hard-wrapped near 55 columns; size the
       grid to fit the viewport so the wrap survives on a phone */
    font-size: min(1rem, calc((100vw - 32px) / 34));
    line-height: 1.45;
  }
  /* blocks and the ctrl-flavored syntax. colors are ctrl's own
     (dotfiles/ctrl-extension.js), darkened for the white page */
  .vvill-conscious .blk { margin: 0 0 1em; touch-action: manipulation; }
  .vvill-conscious .blk.hot, .vvill-conscious .blk.hot * { color: #e00000; }
  .vvill-conscious .l { display: block; min-height: 1.45em; }
  .vvill-conscious .hdr { font-weight: bold; color: #4a6fa5; }
  .vvill-conscious .hdr1 { font-size: 1.5em; }
  .vvill-conscious .hdr2 { font-size: 1.3em; }
  .vvill-conscious .hdr3 { font-size: 1.15em; }
  .vvill-conscious b[class^="d"] { font-weight: bold; }
  .vvill-conscious .d0 { color: #d00000; } .vvill-conscious .d1 { color: #e07000; }
  .vvill-conscious .d2 { color: #b8a000; } .vvill-conscious .d3 { color: #00a000; }
  .vvill-conscious .d4 { color: #0070d0; } .vvill-conscious .d5 { color: #0000d0; }
  .vvill-conscious .d6 { color: #7000d0; }
  .vvill-conscious .gt { color: #009400; }
  .vvill-conscious .tilde { color: #e00000; font-weight: bold; }
  .vvill-conscious .sep { color: #888; }
  .vvill-conscious .shdr { font-weight: bold; }
  .vvill-conscious .plus { color: #3a8f8f; font-weight: bold; }
  .vvill-conscious .dash { color: #d0409f; font-weight: bold; }
  .vvill-conscious .eq { font-weight: bold; text-decoration: underline; }
  .vvill-conscious .pipe { color: #20b000; font-weight: bold; }
  .vvill-conscious .dot { color: #c000c0; font-weight: bold; }
  .vvill-conscious .comma { color: #555; font-weight: bold; }
  .vvill-conscious .caret { color: #d06f00; font-weight: bold; }
  .vvill-conscious .dollar { color: #b89400; font-weight: bold; }
  .vvill-conscious .at { color: #888; font-weight: bold; }
  .vvill-conscious .slash { font-weight: bold; }
  .vvill-conscious .bslash { background: #eee; font-weight: bold; }
  .vvill-conscious .bang { color: #0090c0; font-weight: bold; }
  .vvill-conscious .topic { color: #808080; font-weight: bold; text-decoration: underline; }
  .vvill-conscious .letter { font-weight: bold; text-decoration: underline; }
  .vvill-conscious .done { color: #999; }
  .vvill-conscious .cp { color: #888; font-size: 0.85em; }
  .vvill-conscious textarea { width: 100%; box-sizing: border-box; font: inherit; font-size: 16px;
    line-height: 1.45; border: 1px solid #000; padding: 6px; resize: none; }
  .vvill-conscious .ctl { display: flex; gap: 8px; margin-top: 6px; }
  .vvill-conscious .ctl button { font: inherit; border: 1px solid #000; background: #fff; padding: 4px 12px; }
  /* the double split pane */
  .vvill-split { display: grid; grid-template-columns: 1fr; gap: 0 32px; padding-bottom: 6em; }
  .vvill-stables { border-bottom: 1px solid #000; padding-bottom: 12px; margin-bottom: 12px; }
  @media (min-width: 720px) {
    .vvill-split { grid-template-columns: 1fr 16em; }
    .vvill-stables { order: 2; border-bottom: 0; border-left: 1px solid #000; padding: 0 0 0 16px; margin: 0; }
  }
  .vvill-status { color: #666; font-size: 0.85em; margin: 4px 0; }
  .vvill-wipe { font: inherit; font-size: 0.85em; border: 1px solid #000; background: #fff; padding: 4px 8px; margin: 8px 0; }
  .convo h3 { font-weight: normal; font-size: 0.85em; color: #666; border-top: 1px solid #ccc; padding-top: 8px; margin: 24px 0 8px; }
  .convo h3 a { color: inherit; }
  .turn { margin: 12px 0; white-space: pre-wrap; overflow-wrap: break-word; line-height: 1.4; }
  .turn.user { margin-left: 3em; padding: 8px 12px; background: #eee; }
  .turn.tool { font-family: monospace; font-size: 0.8em; color: #666; }
  .vvill-say { position: fixed; left: 0; right: 0; bottom: 0; background: #fff;
    border-top: 1px solid #000; padding: 8px 16px; display: flex; gap: 8px; }
  .vvill-say textarea { flex: 1; font: inherit; font-size: 16px; resize: none;
    border: 1px solid #000; padding: 6px; }
  .vvill-say button { font: inherit; border: 1px solid #000; background: #fff; padding: 0 12px; }
</style>
</head>
<body>
<div class="vvill-bar"><a href="/vvill">VvilL</a></div>
<main>
${content}
</main>
</body>
</html>`;

const turnHtml = (t) => `<div class="turn ${t.role}">${esc(t.text)}</div>`;
const convo = (cpath, n, turns, head = '') => `<section class="convo">
<h3><a href="${join(cpath, n + '.jsonl')}">conversation ${n}</a> · ${when(turns[0] && turns[0].ts)}${head}</h3>
${turns.map(turnHtml).join('\n')}
</section>`;

// 🗄️ a directory. a personality's (IDENTITY.md present) is the double split
// pane; any other is a listing.
async function root(xface, petri) {
  const cpath = petri.pathology.cpath;
  const files = (xface.files || []).filter(f => !f.name.startsWith('.')).sort((a, b) => a.name.localeCompare(b.name));
  const nums = files.map(f => f.name.match(/^(\d+)\.jsonl$/)).filter(Boolean).map(m => parseInt(m[1], 10)).sort((a, b) => a - b);
  const numbered = (f) => /^\d+(\.jsonl)?$/.test(f.name); // the dream: listed apart
  const rows = files.filter(f => !numbered(f))
    .map(f => `<div><a href="${join(cpath, f.name)}">${esc(f.isDirectory ? f.name + '/' : f.name)}</a></div>`);
  if (cpath.split('/').filter(Boolean).length > 1) rows.unshift(`<div><a href="${dirname(cpath)}">../</a></div>`);
  const listing = `<div class="vvill-ls">${rows.join('\n')}</div>`;
  const title = cpath.split('/').pop();
  if (!files.some(f => f.name === 'IDENTITY.md')) return frame(crumb(cpath) + listing, { title });

  let past = '';
  for (const n of nums.slice(-RECENT)) past += convo(cpath, n, turnsOf(await petri.zone.rd8(join(cpath, n + '.jsonl'))));
  const dream = nums.length ? `<p class="vvill-status">dream: ${nums.map(n => `<a href="${join(cpath, n + '.jsonl')}">${n}</a>`).join(' ')}</p>` : '';
  return frame(`<div class="vvill-split">
<aside class="vvill-stables">
${crumb(cpath)}
${listing}
${dream}
<p id="state" class="vvill-status"></p>
<button type="button" id="wipe" class="vvill-wipe" hidden></button>
</aside>
<section class="vvill-thread">
${past}
<section class="convo" id="live"><h3 id="livehead"></h3><div id="turns"></div></section>
<p id="status" class="vvill-status"></p>
</section>
</div>
<form id="say" class="vvill-say"><textarea id="text" rows="2" placeholder="…" autofocus></textarea><button type="submit">say</button></form>
<script>${THREAD_JS(cpath)}</script>`, { title, wide: true });
}

// ✍️ a conscious file as BLOCKS: runs of non-blank lines, separated by runs
// of blank lines. the separators are kept verbatim (a lead, then each
// block's trailing sep) so an unchanged file reassembles byte for byte:
// lead + Σ(text + sep). the page and the save handler split by this one
// function and never trust each other's split.
function blocksOf(raw) {
  const parts = raw.split(/(\n(?:[ \t]*\n)+)/);
  let lead = '';
  const blocks = [];
  for (let k = 0; k < parts.length; k += 2) {
    let text = parts[k]; let sep = parts[k + 1] || '';
    if (k === 0) { const m = text.match(/^\n+/); if (m) { lead = m[0]; text = text.slice(m[0].length); } }
    const t = text.match(/\n+$/); if (t) { text = text.slice(0, -t[0].length); sep = t[0] + sep; }
    if (text === '') { if (blocks.length) blocks[blocks.length - 1].sep += sep; else lead += sep; continue; }
    blocks.push({ text, sep });
  }
  return { lead, blocks };
}
const joinBlocks = (f) => f.lead + f.blocks.map(b => b.text + b.sep).join('');

// ctrl-flavored syntax: one class per line by its first characters, first
// match wins, the whole line colored (as ctrl does). a numbered paragraph
// colors its number only, by n mod 7. the line before a rule of dashes is
// a section header. links are markdown's.
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
const NUM = /^(\d+) /;
const LINK = /\[([^\]]+)\]\(([^)\s]+)\)/g;
const inline = (s) => esc(s).replace(LINK, (m, t, h) => `<a href="${h}">${t}</a>`);
const lineHtml = (line, next) => {
  const n = line.match(NUM);
  if (n) return `<span class="l"><b class="d${parseInt(n[1], 10) % 7}">${n[1]}</b>${inline(line.slice(n[1].length))}</span>`;
  let cls = '';
  for (const [re, c] of SYNTAX) { const m = line.match(re); if (m) { cls = typeof c === 'function' ? c(m) : c; break; } }
  if (!cls && next !== undefined && /^-{3,}$/.test(next)) cls = 'shdr';
  return `<span class="l${cls ? ' ' + cls : ''}">${inline(line)}</span>`;
};
const blockHtml = (b, i) => { const ls = b.text.split('\n');
  return `<div class="blk" data-i="${i}">${ls.map((l, k) => lineHtml(l, ls[k + 1])).join('')}</div>`; };
const blocksHtml = (f) => f.blocks.map(blockHtml).join('\n');
const view = (f) => ({ blocks: f.blocks.map(b => b.text), html: blocksHtml(f) });

// 📄 conscious file (.md), 🎨 subgene passes style overrides to the frame.
// on the LAN the blocks are tactile (CONSCIOUS_JS); elsewhere, read only.
function conscious(xface, subgenes, petri) {
  const cpath = petri.pathology.cpath;
  const raw = xface.file.toString('utf8');
  let styles = {};
  try { styles = JSON.parse(subgenes['🎨'] || '{}'); }
  catch (e) { log.line(`🎨 unparseable subgene: ${subgenes['🎨']}`); }
  const f = blocksOf(raw);
  const local = petri.pathology.spore.isLocal();
  return frame(crumb(cpath)
    + `<div class="vvill-conscious" id="conscious" data-path="${esc(cpath)}">${blocksHtml(f)}</div>`
    + `<p id="cstatus" class="vvill-status"></p>`
    + (local ? `<script type="application/json" id="blocks">${JSON.stringify(f.blocks.map(b => b.text)).replace(/</g, '\\u003c')}</script>`
      + `<script>${CONSCIOUS_JS}</script>` : ''),
    { title: cpath.split('/').pop(), styles });
}

// 📮 save: one block of a conscious file under /vvill, replaced only if the
// file still holds what the page had at that index (vim may have moved it;
// then 409, and the page re-renders from the file). an emptied block leaves
// with its separator. answers with the file re-split, so the page can
// re-render in place.
async function save(body, petri) {
  const json = (status, o) => ({ status, headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify(o) });
  if (!petri.pathology.spore.isLocal()) return json(403, { ok: false, reason: 'not local' });
  let q; try { q = JSON.parse(body); } catch (e) { return json(400, { ok: false, reason: 'not json' }); }
  const { path, i, was, now } = q;
  if (typeof path !== 'string' || !/^\/vvill(\/[^/]+)*\.md$/.test(path) || path.split('/').includes('..'))
    return json(400, { ok: false, reason: 'not a conscious file under /vvill' });
  if (!(await petri.zone.if(path))) return json(404, { ok: false, reason: 'no such file' });
  const raw = await petri.zone.rd8(path);
  const f = blocksOf(raw);
  if (!Number.isInteger(i) || i < 0 || i >= f.blocks.length || f.blocks[i].text !== was)
    return json(409, { ok: false, reason: 'the file changed under you; re-read it', ...view(f) });
  if (typeof now !== 'string') return json(400, { ok: false, reason: 'no text' });
  const text = now.replace(/\r\n/g, '\n');
  const removed = text.trim() === '';
  if (removed) f.blocks.splice(i, 1); else f.blocks[i].text = text;
  const next = joinBlocks(f);
  if (next !== raw) await petri.zone.wr(path, next);
  log.line(`✍️ ${path} block ${i} ${removed ? 'removed' : next === raw ? 'unchanged' : 'saved'}`);
  return json(200, { ok: true, ...view(blocksOf(next)) });
}

// ✍️ the tactile blocks: one tap toggles red (held 300ms in case a second
// tap follows); two taps open the block in a textbox; save posts it.
const CONSCIOUS_JS = /* js */ `(() => {
  const root = document.getElementById('conscious'), path = root.dataset.path,
    status = document.getElementById('cstatus');
  let blocks = JSON.parse(document.getElementById('blocks').textContent);
  let timer = null, pending = null;
  const say = (m) => { status.textContent = m; };
  const grow = (ta) => { ta.style.height = 'auto'; ta.style.height = (ta.scrollHeight + 4) + 'px'; };
  root.addEventListener('click', (e) => {
    const blk = e.target.closest('.blk');
    if (!blk || blk.classList.contains('editing') || e.target.closest('a, textarea, button')) return;
    if (timer && pending === blk) { clearTimeout(timer); timer = null; pending = null; edit(blk); return; }
    if (timer) clearTimeout(timer);
    pending = blk; timer = setTimeout(() => { timer = null; pending = null; blk.classList.toggle('hot'); }, 300);
  });
  function edit(blk) {
    const i = +blk.dataset.i, was = blocks[i], html = blk.innerHTML;
    blk.classList.add('editing');
    blk.innerHTML = '<textarea spellcheck="false"></textarea><div class="ctl">'
      + '<button type="button" class="save">save</button><button type="button" class="cancel">cancel</button></div>';
    const ta = blk.querySelector('textarea'); ta.value = was; grow(ta); ta.focus(); ta.oninput = () => grow(ta);
    blk.querySelector('.cancel').onclick = () => { blk.innerHTML = html; blk.classList.remove('editing'); say(''); };
    blk.querySelector('.save').onclick = async () => {
      say('saving…');
      let o; try {
        const r = await fetch('/vvill/.save', { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path, i, was, now: ta.value }) });
        o = await r.json();
      } catch (x) { say('save failed: ' + x.message); return; }
      if (o.html !== undefined) {
        const hot = [...root.querySelectorAll('.blk.hot')].map(b => b.dataset.i);
        root.innerHTML = o.html; blocks = o.blocks;
        for (const h of hot) { const b = root.querySelector('.blk[data-i="' + h + '"]'); if (b) b.classList.add('hot'); }
      }
      say(o.ok ? 'saved' : (o.reason || 'not saved'));
    };
  }
})();`;

// 💤 dream file (<n>.jsonl): one deposited conversation, read raw
function dream(xface, subgenes, petri) {
  const cpath = petri.pathology.cpath;
  const n = parseInt(cpath.split('/').pop(), 10);
  const turns = turnsOf(xface.file.toString('utf8'));
  return frame(crumb(cpath) + convo(dirname(cpath), n, turns, ` · ${turns.length} turns`),
    { title: `${dirname(cpath).split('/').pop()} ${n}` });
}

// 💬 the live thread: one socket to the paddock keyed by the path. the
// paddock's state says which conversation is open; text deltas stream
// into the open conversation; a deposit ends it and the page re-renders
// with that conversation moved into the past.
const THREAD_JS = (cpath) => /* js */ `(() => {
  const path = ${JSON.stringify(cpath)};
  const turns = document.getElementById('turns'), head = document.getElementById('livehead'),
    form = document.getElementById('say'), text = document.getElementById('text'),
    status = document.getElementById('status'), state = document.getElementById('state'),
    wipe = document.getElementById('wipe');
  let ws, cur = null, last = null, backoff = 500, verdict = null, armed = false;
  // the verdict of a Genesis-test wake, READY or NOT READY, said first; once
  // the open conversation has one, the reset shows in the stables
  const judge = (t) => { const m = (t || '').slice(0, 400).match(/\\b(NOT READY|READY)\\b/); return m ? m[1] : null; };
  const show = (v) => { verdict = v; armed = false; wipe.hidden = !v;
    if (v) wipe.textContent = 'reset · deposit this ' + v + ' attempt to the playwright'; };
  const say = (m) => { status.textContent = m; };
  const bottom = () => window.scrollTo(0, document.body.scrollHeight);
  const el = (cls, body) => { const d = document.createElement('div');
    d.className = 'turn ' + cls; d.textContent = body; turns.appendChild(d); bottom(); return d; };
  const brief = (input) => { try { const s = JSON.stringify(input);
    return s.length > 140 ? s.slice(0, 140) + '…' : s; } catch (e) { return ''; } };
  function on(o) {
    switch (o.type) {
      case 'paddock':
        if (o.subtype === 'state') { turns.textContent = ''; cur = null;
          for (const t of o.turns) el(t.role, t.text);
          let v = null; for (const t of o.turns) if (t.role === 'assistant') v = judge(t.text) || v; show(o.open ? v : null);
          head.textContent = 'conversation ' + o.n + (o.open ? '' : ' · begins when you speak');
          state.textContent = (o.live ? 'open' : o.open ? 'interrupted, resumes when you speak' : 'quiet')
            + ' · a silence of ' + Math.round(o.idleMs / 60000) + 'm ends a conversation';
          say(o.live ? 'attached' : ''); }
        if (o.subtype === 'deposit') { say('conversation ' + o.n + ' deposited'); setTimeout(() => location.reload(), 800); }
        if (o.subtype === 'wipe') { say(o.attempts.length ? 'attempt ' + o.attempts.map(a => a.a).join(', ') + ' deposited to the playwright · the void forgets' : 'nothing to wipe'); setTimeout(() => location.reload(), 1200); }
        if (o.subtype === 'exit') say('the process exited (' + (o.code === null ? o.signal : o.code) + ')');
        if (o.subtype === 'stderr') { console.warn(o.text); say(o.text); }
        break;
      case 'system': if (o.subtype === 'init') say('awake · ' + (o.model || '')); break;
      case 'stream_event': { const ev = o.event;
        if (ev.type === 'content_block_start' && ev.content_block && ev.content_block.type === 'text') cur = last = el('assistant', '');
        if (ev.type === 'content_block_delta' && ev.delta && ev.delta.type === 'text_delta') {
          if (!cur) cur = last = el('assistant', ''); cur.textContent += ev.delta.text; bottom(); }
        if (ev.type === 'content_block_stop') cur = null;
        break; }
      case 'assistant':
        for (const p of (o.message && o.message.content) || []) if (p.type === 'tool_use') el('tool', '⚙ ' + p.name + ' ' + brief(p.input));
        break;
      case 'result': say(o.is_error ? 'error: ' + (o.result || o.subtype || '') : 'ready');
        { const v = judge(last && last.textContent); if (v) show(v); } break;
    }
  }
  function connect() {
    ws = new WebSocket('ws://' + location.hostname + ':${PADDOCK_PORT}' + path);
    ws.onopen = () => { backoff = 500; };
    ws.onmessage = (e) => { let o; try { o = JSON.parse(e.data); } catch (x) { return; } on(o); };
    ws.onclose = (e) => {
      if (e.code === 4001) { say('another page took this seat; reload to take it back'); return; }
      if (e.code === 4004) { say(e.reason); return; }
      say('paddock away, retrying…'); setTimeout(connect, backoff = Math.min(backoff * 2, 8000)); };
  }
  form.onsubmit = (e) => { e.preventDefault(); const t = text.value.trim();
    if (!t || !ws || ws.readyState !== 1) return;
    head.textContent = head.textContent.replace(' · begins when you speak', '');
    el('user', t); ws.send(JSON.stringify({ type: 'user', message: { role: 'user', content: t } }));
    text.value = ''; say('…'); };
  text.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); form.requestSubmit(); } };
  // the reset: two clicks, no dialog. the second asks the paddock to wipe.
  wipe.onclick = () => {
    if (!armed) { armed = true; wipe.textContent = 'sure? the void forgets this conversation · click again';
      setTimeout(() => { if (armed) show(verdict); }, 6000); return; }
    if (!ws || ws.readyState !== 1) return;
    ws.send(JSON.stringify({ type: 'paddock', subtype: 'wipe' })); wipe.hidden = true; say('wiping…'); };
  connect();
})();`;

module.exports = { root, conscious, dream, save, blocksOf, joinBlocks };
