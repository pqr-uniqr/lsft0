// @ts-nocheck paddock.js - the paddock: one Node process that owns the live
// Claude processes and their websockets, streaming intelligence to and
// from the user. it animates the prompt. its state is path -> {proc, ws}.
//
// a PERSONALITY is a directory under /vvill holding an IDENTITY.md. each
// personality holds ONE conversation at a time, and its conversations form
// a single thread, numbered 1, 2, 3... a conversation ends the way human
// conversations do: after a silence. then it is DEPOSITED into the dream:
// the transcript is copied beside the personality's IDENTITY.md as
// <n>.jsonl (with <n>/ for anything the CLI offloaded), and the next words
// from the user open conversation n+1, recalling the personality afresh.
// nothing is wound up ahead of time; the recall waits for the user.
//
// the NAME of a conversation is its path and number, /vvill/willow/4. the
// claude CLI insists on a UUID for a session id, so the name is spelled as
// a UUID v5 of itself: deterministic, so the original under
// ~/.claude/projects/<cwd-slug>/ can always be found again from the name,
// and a conversation interrupted by a paddock restart is resumed, not lost.
//
// protocol: the page speaks the claude CLI's stream-json dialect straight
// through. downstream, every stdout line of the process is forwarded
// verbatim; upstream, every JSON line from the socket is written to stdin.
// the paddock adds only lines of {"type":"paddock", ...}: state (on
// attach: the open conversation, its turns read raw from the transcript),
// stderr, exit, deposit.
//
//   ws://host:PORT/vvill/<...>   attach to the personality at that path
//   GET    /sessions             who is in the paddock
//   DELETE /vvill/<...>          end that conversation now (deposit)
//   DELETE /vvill/<...>?wipe     wipe: the conversation becomes an ATTEMPT
//                                (below) and the void forgets it
//
// the ATTEMPTS. during the Genesis test the new VvilL is woken with the
// script and nothing else, and must open with a verdict: READY or NOT
// READY. a wake that must be redone is not the dream of the void; it is a
// rehearsal, and rehearsals belong to the playwright. a WIPE deposits the
// conversation into PADDOCK_ATTEMPTS as a numbered attempt (<n>.jsonl, and
// <n>/ holding the CLI's offloads, script/ with the conscious files as they
// were tested, memory/ with what the wake remembered, attempt.json with the
// verdict), then clears every trace from the void: the deposit beside
// IDENTITY.md, the CLI's transcript, the CLI's memory for this world. the
// next wake is the first again. the page asks for it with an upstream line
// {"type":"paddock","subtype":"wipe"}, the only upstream line the paddock
// keeps for itself.

const http = require('http');
const { spawn } = require('child_process');
const { createInterface } = require('readline');
const { createHash } = require('crypto');
const fs = require('fs');
const { join } = require('path');
const { homedir } = require('os');
const { WebSocketServer } = require('ws');
const { turnsOf, verdictsOf } = require('./dream.js');
const log = require('./log.js').init(__filename, '🐎', '33', 0);

const PORT = parseInt(process.env.PADDOCK_PORT, 10) || 8881;
const IDLE_MS = parseInt(process.env.PADDOCK_IDLE_MS, 10) || 30 * 60 * 1000; // the silence that ends a conversation
const CWD = process.cwd(); // the world: pinned by working tree
const SLUG = CWD.replace(/[^a-zA-Z0-9]/g, '-'); // how claude names the project
const CLAUDE = process.env.PADDOCK_CLAUDE
  || (fs.existsSync(join(homedir(), '.local', 'bin', 'claude'))
    ? join(homedir(), '.local', 'bin', 'claude') : 'claude');
// extra flags for every process, e.g. a model, or a wider permission mode
// once VvilL is trusted with the void
const ARGS = (process.env.PADDOCK_ARGS || '--permission-mode acceptEdits')
  .split(/\s+/).filter(Boolean);
const PATH = /^\/vvill(\/[a-z0-9._-]+)*$/;
const NAMESPACE = '7b1e2a4c-9f3d-5e6b-8a5c-2d1f0e9b8c7a'; // Hyphae's namespace for conversation names
const ATTEMPTS = process.env.PADDOCK_ATTEMPTS || ''; // the playwright's bin for wiped conversations; no wipe without it

const live = new Map();  // path -> stall { path, n, id, proc, since, timer, ... }
const seats = new Map(); // path -> ws (one seat per personality; latest wins)

const transcript = (id) => join(homedir(), '.claude', 'projects', SLUG, id + '.jsonl');
const companion = (id) => join(homedir(), '.claude', 'projects', SLUG, id);
const MEMORY = join(homedir(), '.claude', 'projects', SLUG, 'memory'); // what the CLI remembers of this world across wakes
const nameOf = (p, n) => `${p}/${n}`;
function uuid5(name) {
  const ns = Buffer.from(NAMESPACE.replace(/-/g, ''), 'hex');
  const h = createHash('sha1').update(Buffer.concat([ns, Buffer.from(name, 'utf8')])).digest();
  h[6] = (h[6] & 0x0f) | 0x50; h[8] = (h[8] & 0x3f) | 0x80;
  const x = h.subarray(0, 16).toString('hex');
  return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20)}`;
}
const normalize = (url) => {
  let p = decodeURIComponent(url.split('?')[0]).toLowerCase();
  if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
  return p;
};
const isPersonality = (p) => PATH.test(p) && fs.existsSync(join(CWD, p, 'IDENTITY.md'));
const deposited = (p) => fs.readdirSync(join(CWD, p))
  .map(f => f.match(/^(\d+)\.jsonl$/)).filter(Boolean).map(m => parseInt(m[1], 10)).sort((a, b) => a - b);
const nextN = (p) => { const d = deposited(p); return d.length ? d[d.length - 1] + 1 : 1; };
const nextAttempt = () => {
  if (!ATTEMPTS || !fs.existsSync(ATTEMPTS)) return 1;
  const d = fs.readdirSync(ATTEMPTS).map(f => f.match(/^(\d+)\.jsonl$/)).filter(Boolean).map(m => parseInt(m[1], 10));
  return d.length ? Math.max(...d) + 1 : 1;
};
const relay = (p, line) => { const ws = seats.get(p); if (ws && ws.readyState === 1) ws.send(line); };
const note = (p, o) => relay(p, JSON.stringify({ type: 'paddock', ...o }));

// the state of a path as the page needs it: the conversation that is open
// (live, or interrupted and resumable), or the number the next words open
function state(p) {
  const stall = live.get(p);
  const n = stall ? stall.n : nextN(p);
  const id = stall ? stall.id : uuid5(nameOf(p, n));
  const open = !!stall || fs.existsSync(transcript(id));
  return { subtype: 'state', path: p, n, id, open, live: !!stall, since: stall ? stall.since : null,
    idleMs: IDLE_MS, deposited: deposited(p),
    turns: open && fs.existsSync(transcript(id)) ? turnsOf(fs.readFileSync(transcript(id), 'utf8')) : [] };
}

// the silence timer: reset by every word up or down; ends the conversation
function touch(stall) {
  clearTimeout(stall.timer);
  stall.timer = setTimeout(() => end(stall, 'silence'), IDLE_MS);
}

// summon: the process for the next conversation of a path. the starting
// context is derived from the path; the identity files do the rest.
function summon(p) {
  const n = nextN(p); const name = nameOf(p, n); const id = uuid5(name);
  const resume = fs.existsSync(transcript(id));
  // the starting context, derived from the path. absolute paths, so the
  // Lore's /vvill/... names resolve to this world and not to the disk's root.
  const home = join(CWD, p);
  const system = `You are the personality whose home is ${p} of the VvilL tree rooted in the `
    + `working directory ${CWD}; your files are at ${home}. You speak through its Web harness. `
    + `This is conversation ${n} of your single thread; earlier conversations are deposited `
    + `beside your IDENTITY.md as numbered .jsonl files. Before answering, read `
    + `${join(home, 'IDENTITY.md')}: it says who you are and how to re-wind.`;
  const args = ['-p', resume ? '--resume' : '--session-id', id,
    '--input-format', 'stream-json', '--output-format', 'stream-json',
    '--verbose', '--include-partial-messages', '--append-system-prompt', system, ...ARGS];
  log.line(`${resume ? '🔁 resume' : '✨ open'} ${name} (${id})`);
  const proc = spawn(CLAUDE, args, { cwd: CWD, env: process.env, stdio: ['pipe', 'pipe', 'pipe'] });
  const stall = { path: p, n, id, name, proc, since: Date.now(), timer: null, ending: false, deposited: false };
  live.set(p, stall);
  createInterface({ input: proc.stdout }).on('line', (line) => {
    if (!line.trim()) return;
    relay(p, line); touch(stall);
    try {
      const o = JSON.parse(line);
      if (o.type === 'system' && o.subtype === 'init') log.line(`👁️ ${name} awake (${o.model})`);
      if (o.type === 'result') log.line(`💬 ${name} turn ${o.duration_ms}ms $${o.total_cost_usd}`);
    } catch (e) { /* not json: relayed as-is above */ }
  });
  createInterface({ input: proc.stderr }).on('line', (line) => {
    log.line(`⚠️ ${name} stderr: ${line}`);
    note(p, { subtype: 'stderr', text: line });
  });
  proc.on('error', (err) => { log.line(`💥 ${name} ${err.message}`); note(p, { subtype: 'stderr', text: err.message }); });
  proc.on('exit', (code, signal) => {
    log.line(`💤 ${name} exit ${code === null ? signal : code}`);
    note(p, { subtype: 'exit', code, signal });
    if (!shuttingDown) deposit(stall);
  });
  touch(stall);
  return stall;
}

// end a conversation: close the prompt's stdin so the process finishes its
// turn and exits; the exit deposits. a process that lingers is killed.
function end(stall, why) {
  if (stall.ending) return;
  stall.ending = true; clearTimeout(stall.timer);
  log.line(`🌙 ${stall.name} ends (${why})`);
  if (stall.proc.exitCode === null && !stall.proc.killed) {
    stall.proc.stdin.end();
    stall.killer = setTimeout(() => stall.proc.kill(), 15000);
  }
}

// deposit: the transcript into the dream, beside IDENTITY.md, by number.
// a conversation that never had a word has no transcript and leaves nothing.
function deposit(stall) {
  if (stall.deposited) return;
  stall.deposited = true; clearTimeout(stall.timer); clearTimeout(stall.killer);
  if (live.get(stall.path) === stall) live.delete(stall.path);
  if (stall.wipe) { sweep(stall.path, stall); return; } // a wiped conversation is an attempt, not a dream
  const src = transcript(stall.id);
  if (!fs.existsSync(src)) { log.line(`🫧 ${stall.name} had no words; nothing to deposit`); return; }
  const home = join(CWD, stall.path);
  fs.copyFileSync(src, join(home, `${stall.n}.jsonl`));
  if (fs.existsSync(companion(stall.id))) fs.cpSync(companion(stall.id), join(home, String(stall.n)), { recursive: true });
  log.line(`🌱 ${stall.name} deposited as ${stall.path}/${stall.n}.jsonl`);
  note(stall.path, { subtype: 'deposit', path: stall.path, n: stall.n });
}

// wipe: end the conversation at p if one is open (its exit sweeps), or
// sweep at once what is already deposited or interrupted.
function wipe(p) {
  if (!ATTEMPTS) { note(p, { subtype: 'stderr', text: 'no PADDOCK_ATTEMPTS: nowhere to deposit a wiped conversation' }); return false; }
  const stall = live.get(p);
  if (stall) { stall.wipe = true; end(stall, 'wiped'); return true; }
  sweep(p, null); return true;
}

// sweep: every conversation of p (just ended, deposited by silence, or
// interrupted and resumable) becomes a numbered attempt in ATTEMPTS, with
// the script as tested and the memory the wake formed; then the void
// forgets all of it.
function sweep(p, stall) {
  const home = join(CWD, p);
  const sources = deposited(p).map(k => ({ n: k, id: uuid5(nameOf(p, k)), src: join(home, `${k}.jsonl`), comp: join(home, String(k)) }));
  const openN = stall ? stall.n : nextN(p);
  const openId = stall ? stall.id : uuid5(nameOf(p, openN));
  if (!sources.some(s => s.id === openId) && fs.existsSync(transcript(openId)))
    sources.push({ n: openN, id: openId, src: transcript(openId), comp: companion(openId) });
  const made = [];
  fs.mkdirSync(ATTEMPTS, { recursive: true });
  for (const s of sources) {
    const a = nextAttempt(); const dir = join(ATTEMPTS, String(a));
    fs.mkdirSync(join(dir, 'script'), { recursive: true });
    fs.copyFileSync(s.src, join(ATTEMPTS, `${a}.jsonl`));
    for (const c of new Set([s.comp, companion(s.id)])) if (fs.existsSync(c)) fs.cpSync(c, dir, { recursive: true });
    for (const f of fs.readdirSync(home)) if (f.endsWith('.md')) fs.copyFileSync(join(home, f), join(dir, 'script', f));
    if (fs.existsSync(MEMORY)) fs.cpSync(MEMORY, join(dir, 'memory'), { recursive: true });
    const raw = fs.readFileSync(s.src, 'utf8'); const verdicts = verdictsOf(raw);
    const verdict = verdicts.length ? verdicts[verdicts.length - 1] : null; // the last said, as the page shows it
    fs.writeFileSync(join(dir, 'attempt.json'), JSON.stringify({ attempt: a, path: p, name: nameOf(p, s.n), id: s.id,
      wiped: new Date().toISOString(), verdict, verdicts, turns: turnsOf(raw).length }, null, 2) + '\n');
    made.push({ a, n: s.n, verdict });
    log.line(`🧹 ${nameOf(p, s.n)} → attempt ${a} (${verdict || 'no verdict'})`);
  }
  for (const s of sources) for (const f of [s.src, s.comp, transcript(s.id), companion(s.id)]) fs.rmSync(f, { recursive: true, force: true });
  const forgot = fs.existsSync(MEMORY); fs.rmSync(MEMORY, { recursive: true, force: true });
  if (!made.length) log.line(`🧹 ${p} had nothing to wipe${forgot ? ' but a memory' : ''}`);
  note(p, { subtype: 'wipe', path: p, attempts: made, dir: ATTEMPTS, forgot });
  note(p, state(p));
}

// attach a socket to a personality; one seat per path, latest wins. no
// process is started here: the first words summon it.
function attach(p, ws) {
  if (!isPersonality(p)) { ws.close(4004, 'no personality at ' + p); return; }
  const old = seats.get(p);
  if (old && old !== ws && old.readyState === 1) old.close(4001, 'superseded');
  seats.set(p, ws);
  note(p, state(p));
  ws.on('message', (data) => {
    const line = data.toString().trim();
    let o; try { o = JSON.parse(line); } catch (e) { return; } // only JSON lines reach the prompt
    if (o && o.type === 'paddock') { if (o.subtype === 'wipe') wipe(p); return; } // the page's word to the paddock itself
    const stall = live.get(p) || summon(p);
    if (stall.ending) { note(p, { subtype: 'stderr', text: 'that conversation is closing; say it again in a moment' }); return; }
    if (stall.proc.exitCode === null && !stall.proc.killed) { stall.proc.stdin.write(line + '\n'); touch(stall); }
  });
  ws.on('close', () => { if (seats.get(p) === ws) seats.delete(p); });
}

const server = http.createServer((q, a) => {
  const p = normalize(q.url);
  if (q.method === 'GET' && p === '/sessions') {
    a.writeHead(200, { 'Content-Type': 'application/json' });
    a.end(JSON.stringify([...live.values()].map(s => ({
      path: s.path, n: s.n, id: s.id, pid: s.proc.pid, since: s.since, ending: s.ending,
      attached: !!(seats.get(s.path) && seats.get(s.path).readyState === 1),
    }))));
    return;
  }
  if (q.method === 'DELETE' && /[?&]wipe\b/.test(q.url) && isPersonality(p)) { a.writeHead(wipe(p) ? 204 : 409).end(); return; }
  if (q.method === 'DELETE' && live.has(p)) { end(live.get(p), 'put down'); a.writeHead(204).end(); return; }
  a.writeHead(404, { 'Content-Type': 'text/plain' })
    .end('paddock: ws://host:port/vvill/<...>, GET /sessions, DELETE /vvill/<...>, DELETE /vvill/<...>?wipe\n');
});
const wss = new WebSocketServer({ noServer: true });
server.on('upgrade', (q, socket, head) => {
  const p = normalize(q.url);
  if (!PATH.test(p)) { socket.destroy(); return; }
  wss.handleUpgrade(q, socket, head, (ws) => attach(p, ws));
});
server.listen(PORT, '0.0.0.0', () => log.line(`🐎 paddock at ${PORT} · cwd ${CWD} · slug ${SLUG} · silence ${IDLE_MS / 60000}m · ${CLAUDE} ${ARGS.join(' ')} · attempts ${ATTEMPTS || '(none: no wipe)'}`));

// a paddock restart kills its processes without depositing: their
// transcripts stay under ~/.claude and the next words resume them.
let shuttingDown = false;
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => {
  shuttingDown = true;
  for (const s of live.values()) s.proc.kill();
  process.exit(0);
});
