// @ts-nocheck dream.js - the dream, read raw.
// a conversation transcript (the claude CLI's JSONL) reduced to what a
// person reads back: the user's words, the personality's words, and one
// grey line per tool the personality reached for. shared by the paddock
// (replaying an open conversation on attach) and by VvilL.js (rendering
// deposited conversations as the thread's past).

const brief = (input) => {
  try { const s = JSON.stringify(input); return s.length > 140 ? s.slice(0, 140) + '…' : s; }
  catch (e) { return ''; }
};

// turns of a transcript, in order: {role: user|assistant|tool, text, ts}
function turnsOf(raw) {
  const turns = [];
  for (const line of raw.split('\n')) {
    let o; try { o = JSON.parse(line); } catch (e) { continue; }
    if (o.type !== 'user' && o.type !== 'assistant') continue;
    const c = o.message && o.message.content;
    if (typeof c === 'string') { if (c.trim()) turns.push({ role: o.type, text: c, ts: o.timestamp }); continue; }
    if (!Array.isArray(c)) continue;
    let text = '';
    const flush = () => { if (text.trim()) turns.push({ role: o.type, text, ts: o.timestamp }); text = ''; };
    for (const p of c) {
      if (p.type === 'text') text += (text ? '\n' : '') + p.text;
      else if (p.type === 'tool_use') { flush(); turns.push({ role: 'tool', text: '⚙ ' + p.name + ' ' + brief(p.input), ts: o.timestamp }); }
    }
    flush();
  }
  return turns;
}

module.exports = { turnsOf, brief };
