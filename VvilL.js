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
    /* conscious files are hard-wrapped near 55 columns; size the
       grid to fit the viewport so the wrap survives on a phone */
    font-size: min(1rem, calc((100vw - 32px) / 34));
    line-height: 1.45;
  }
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

// 📄 conscious file (.md), 🎨 subgene passes style overrides to the frame
function conscious(xface, subgenes, petri) {
  const cpath = petri.pathology.cpath;
  const raw = xface.file.toString('utf8');
  let styles = {};
  try { styles = JSON.parse(subgenes['🎨'] || '{}'); }
  catch (e) { log.line(`🎨 unparseable subgene: ${subgenes['🎨']}`); }
  return frame(crumb(cpath) + `<pre class="vvill-conscious">${esc(raw)}</pre>`,
    { title: cpath.split('/').pop(), styles });
}

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

module.exports = { root, conscious, dream };
