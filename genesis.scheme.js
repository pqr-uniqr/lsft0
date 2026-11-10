// @ts-nocheck genesis.scheme.js - the SCHEMES of GENESIS.txt's pages: the
// looks the reader (genesis.reader.js, the primary) and the L4 editor (genesis.js)
// share, of which a page wears one, kept on the phone (localStorage
// vvill-scheme) and worn before the first paint. two are the harness's
// own, light and dark: the pin the frame (VvilL.js) keeps as vvill-theme,
// data-theme on <html>, where a choice that matches the device's own is
// unpinned, so the page follows the device again. two more are
// GENESIS's: ctrl, the L3 editor's dress, Pete's editor's (the Ctrl
// Custom theme's purple page and orange ink, the other sentence blue,
// ctrl's syntax in its own colors, the Ac437 Nix8810 M16 font at the
// page's size, 16px on a desktop (13px is the L3's own), his 0.82
// leading and his tracking, the pane 56 columns and centered, nothing
// bold); and navy, a dark blue page with the sentences alternating red
// and yellow, the rest a pale blue-white, in the same font, leading
// and tracking. both stand on
// the frame's dark rules: data-theme is set dark on the page alone (the
// stored pin is left as it is, so the other pages keep theirs) and
// data-scheme names the scheme; their rules come last in the head and
// outrank the dark ones by order. the fonts are served from /_fonts. a
// tap cycles them, light, dark, ctrl, navy: on the reader, the title
// art; on the L4, the bar's loop or layer. window.genesis.scheme: names,
// now, set(name), next(); a change is told on the page's status line
// (genesis.say) and to the page as a resize, so an editor measures again.

const FONT = `'Ac437 Nix8810 M16', 'Courier New', monospace`;
const FACES = `@font-face { font-family: 'Ac437 Nix8810 M16'; src: url('/_fonts/Ac437_Nix8810_M16.ttf') format('truetype'); }`;
const NAMES = ['light', 'dark', 'ctrl', 'navy'];

// ctrl: the L3's dress (genesis.js wears these there, in either device
// mode): the page and ink, the font, and ctrl's syntax in its own colors
// (the other sentence blue, the > lines ctrl's green), the cursor,
// selection and match colors of Pete's settings. the text is the page's
// size, 1rem, or a phone's fit at 56 columns (these fonts advance 0.6em
// a column like the frame's monospace, ctrl's tracking on top, in em so
// it scales), and scales by --vz where a page sizes
const DRESS = { bgColor: '#2d0549', textColor: '#ef4811', fontFamily: FONT };
const INK = { s1: '#6796e6', hdr: '#ffddfa', sep: '#ffddfa', shdr: '#ffddfa', gt: '#009400', tilde: '#ff0000',
  d0: '#ff0000', d1: '#ff8000', d2: '#ffff00', d3: '#00ff00', d4: '#0080ff', d5: '#0000ff', d6: '#8000ff',
  plus: '#5fafaf', dash: '#ff87d7', eq: '#fffff0', pipe: '#39ff14', dot: '#ff00ff', comma: '#fff', caret: '#ff8700',
  dollar: '#ffd700', at: '#888', slash: '#fff', bang: '#00bfff', topic: '#808080', done: '#777', cp: '#5fd7ff' };
const CTRL = { bg: '#2d0549', ink: '#ef4811', link: '#d9baff', rule: '#5a2a7a', band: '#241530', sel: '#ff0000', match: '#ffff00', caret: '#ff0000',
  stat: '#ebebeb', pos: '#747478', font: FONT, size: '13px', fit: 'min(1rem, (100vw - 32px) / 36)', lead: '0.82', track: '0.5px', em: '0.04em' };
// navy: the dark blue page, the sentences red and yellow in turn, the
// rest a pale blue-white, the blues of ctrl's numbers lifted off the
// page; ctrl's font, leading and tracking
const NAVY = { bg: '#0a1a40', ink: '#d8e0ff', s0: '#ff1a1a', s1: '#ffff55', link: '#8ab4ff', rule: '#3b5fc0', band: '#142a5c', sel: '#703030', match: '#ffffff', caret: '#ffffff',
  pos: '#8a9bc8', d5: '#6f8fff', d6: '#a070ff', font: FONT, size: CTRL.size, fit: CTRL.fit, lead: CTRL.lead, track: CTRL.track, em: CTRL.em };

// a scheme's rules under its attribute, each selector of a list prefixed
const under = (name, rules) => rules.map(([s, d]) => s.split(', ').map(x => `:root[data-scheme="${name}"] ${x}`).join(', ') + ` { ${d} }`).join('\n  ');
const CTRL_RULES = [
  ['body', `background: ${CTRL.bg}; color: ${CTRL.ink}; font-family: ${FONT};`],
  ['a', `color: ${CTRL.link};`],
  ['.vvill-bar', `border-color: ${CTRL.rule}; letter-spacing: ${CTRL.em};`],
  ['.vvill-bar *', 'font-weight: normal;'],
  ['main', `font-family: inherit; font-size: calc(${CTRL.fit} * var(--vz, 1)); letter-spacing: ${CTRL.em}; max-width: calc(56ch + 56 * ${CTRL.em});`],
  ['.vvill-crumb', 'font-family: inherit; font-size: inherit;'],
  ['#conscious', `font-family: inherit; font-size: inherit; line-height: ${CTRL.lead}; letter-spacing: inherit;`],
  ['#conscious, #conscious *', 'font-weight: normal;'],
  ['#conscious .l', `min-height: ${CTRL.lead}em;`],
  ['#conscious .g', 'font-size: 1em; line-height: inherit;'],
  ['#conscious .hdr1, #conscious .hdr2, #conscious .hdr3, #conscious .cp', 'font-size: 1em;'],
  ['#conscious .bslash', 'color: #000; background: rgba(255, 255, 255, 0.28);'],
  ...Object.entries(INK).map(([c, v]) => [`#conscious .${c}`, `color: ${v};`]),
  ['.vvill-status', `color: ${CTRL.pos};`],
  ['.flash-go button, .flash-modal button', `background: ${CTRL.bg}; color: ${CTRL.ink}; border-color: ${CTRL.ink};`],
  ['.flash-modal', `background: ${CTRL.bg}; color: ${CTRL.ink}; font-family: inherit;`],
];
const NAVY_RULES = [
  ['body', `background: ${NAVY.bg}; color: ${NAVY.ink}; font-family: ${NAVY.font};`],
  ['a', `color: ${NAVY.link};`],
  ['.vvill-bar', `border-color: ${NAVY.rule}; letter-spacing: ${NAVY.em};`],
  ['.vvill-bar *', 'font-weight: normal;'],
  ['.vvill-bar .d5', `color: ${NAVY.d5};`], ['.vvill-bar .d6', `color: ${NAVY.d6};`],
  ['main', `font-family: inherit; font-size: calc(${NAVY.fit} * var(--vz, 1)); letter-spacing: ${NAVY.em}; max-width: calc(56ch + 56 * ${NAVY.em});`],
  ['.vvill-crumb', 'font-family: inherit; font-size: inherit;'],
  ['#conscious', `font-family: inherit; font-size: inherit; line-height: ${NAVY.lead}; letter-spacing: inherit;`],
  ['#conscious, #conscious *', 'font-weight: normal;'],
  ['#conscious .l', `min-height: ${NAVY.lead}em;`],
  ['#conscious .g', 'font-size: 1em; line-height: inherit;'],
  ['#conscious .hdr1, #conscious .hdr2, #conscious .hdr3, #conscious .cp', 'font-size: 1em;'],
  ['#conscious .s0', `color: ${NAVY.s0};`], ['#conscious .s1', `color: ${NAVY.s1};`],
  ['#conscious .hdr, #conscious .sep, #conscious .shdr', 'color: #fff;'],
  ['#conscious .d5', `color: ${NAVY.d5};`], ['#conscious .d6', `color: ${NAVY.d6};`],
  ['.vvill-status', `color: ${NAVY.pos};`],
  ['.flash-go button, .flash-modal button', `background: ${NAVY.bg}; color: ${NAVY.ink}; border-color: ${NAVY.ink};`],
  ['.flash-modal', `background: ${NAVY.bg}; color: ${NAVY.ink}; font-family: inherit;`],
];
const SCHEME_CSS = /* css */ `
  ${FACES}
  ${under('ctrl', CTRL_RULES)}
  ${under('navy', NAVY_RULES)}
`;

// worn before the first paint: the scheme kept, and the dark base under it
const SCHEME_HEAD = `<script>try { var s = localStorage.getItem('vvill-scheme'); if (s) { document.documentElement.dataset.scheme = s; document.documentElement.dataset.theme = 'dark'; } } catch (e) {}</script>`;

// the page's script, standing on window.genesis: the scheme worn now
// (the one named, else the theme pinned, else the device's), set by name
// or cycled; light and dark keep the frame's pin as the reader has (a
// choice that matches the device unpins); ctrl and navy are kept as the
// scheme, the theme set dark on the page alone
const SCHEME_JS = /* js */ `(() => {
  const g = window.genesis, html = document.documentElement, NAMES = ${JSON.stringify(NAMES)};
  const sys = () => matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  const now = () => html.dataset.scheme || html.dataset.theme || sys();
  const keep = (k, v) => { try { if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); } catch (e) {} };
  const tell = (m) => { if (g.say) g.say(m); dispatchEvent(new Event('resize')); };
  const set = (name) => {
    if (!NAMES.includes(name)) return false;
    if (name !== 'light' && name !== 'dark') { html.dataset.scheme = name; html.dataset.theme = 'dark'; keep('vvill-scheme', name); tell(name); return true; }
    const pin = name === sys() ? null : name;
    delete html.dataset.scheme; keep('vvill-scheme', null);
    if (pin) html.dataset.theme = pin; else delete html.dataset.theme; keep('vvill-theme', pin);
    tell(pin ? name + ', pinned' : name + ', with the phone'); return true;
  };
  const next = (d) => set(NAMES[(NAMES.indexOf(now()) + (d || 1) + NAMES.length) % NAMES.length]);
  g.scheme = { names: NAMES, get now() { return now(); }, set, next };
})();`;

module.exports = { SCHEME_CSS, SCHEME_HEAD, SCHEME_JS, NAMES, FACES, FONT, DRESS, INK, CTRL, NAVY };
