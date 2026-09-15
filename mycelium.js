// @ts-nocheck

// mycelium is a web development framework based on a layering ontology.
// 
// Central to the management of a server is the organization of its files.
// As a matter of fact, hierchically organizing files of machine code by a 
// set of rules is the basis of all computing; it is all the principle you need.
// 
// The Web is nothing but a projection of this reality of machines. 
//
// In an Open World, the Web is a true cyberspace, where public machines develop
// into venerated third spaces guided by collaboration and community. but we 
// increasingly live in a closed world where the bar for public machine 
// ownership is slipping. 
//
// TODO need an "immutability pass"
// 
// code is human readable machine behavior instructions, but human readable 
// doesn't mean meaningful to humans. that's called literature, an art dedicated
// to writings meaningful to humans.
// we shouldn't have to pay people to read code, code should be works of such
// beauty and divine order that to read it must feel like an act of gaining 
// higher understanding. 
console.log(`\x1b[32m\x1b[0m
                    🍄
    \x1b[0m
                mycelium.js
  \x1b[34m\x1b[0m
 pid \x1b[34m${process.pid}\x1b[0m user \x1b[34m${process.env.USER}\x1b[0m node \x1b[34m${process.version}\x1b[0m host \x1b[34m${require('os').hostname()}\x1b[0m
  \x1b[32m\x1b[0m
`)
const { join, resolve, relative } = require('path');
const fs = require('fs');
const { AsyncLocalStorage } = require('async_hooks');
const ctx = { store: new AsyncLocalStorage(), qlog: () => ctx.store.getStore().qlog };
const hostname = require('os').hostname();
const atmosphere = require('./atmosphere').init([], [__filename]);
const zone = atmosphere.register('zone.js'); 
const time = atmosphere.register('time.js'); 
const log = atmosphere.register('log.js').init(__filename, '🍄','32', 0)
// TODO ideally shouldn't have to duplicate this to back up a branch
const DOMAINS = ['blancs.io', 'livingsoft.net', 'owebp.net']
// access gate: when launched under blancs (PM2 ecosystem.config.js or via
// the Electron app), BLANCS_SECRET is in env and every accepted request
// must carry it as X-Blancs-Secret. Standalone mycelium (no env var)
// serves normally — production hosting on blancs.io etc. is unaffected.
const BLANCS_SECRET = process.env.BLANCS_SECRET || null;
const PORT = parseInt(process.env.BLANCS_PORT, 10) || 8888;
const init = function (handle, recover) {
  require('http').createServer(async (q, a) => {
    if (BLANCS_SECRET && q.headers['x-blancs-secret'] !== BLANCS_SECRET) {
      log.line(`🧪 WTH???`);
      a.writeHead(403).end(); return;
    }
    ctx.store.run({qlog: log.static(Math.random().toString(36).slice(2,7))},
      async () => { try { await handle(q, a); } catch (error) { recover(q, error, a); } })
  // when launched by blancs (BLANCS_SECRET in env), bind to loopback only —
  // the gate already 403s missing-header requests, but loopback adds defense
  // in depth so LAN peers can't even open a TCP connection. standalone /
  // production runs (no secret) listen on all interfaces as before.
  }).listen(PORT, BLANCS_SECRET ? '127.0.0.1' : '0.0.0.0', () => { log.line(`🙉 listening at ${PORT}${BLANCS_SECRET ? ' (gated, loopback)' : ''}...`); });
}(async (q, a) => { // handle function
  //       >>>>   spore -> pathology -> strain -> expression  <<<<
  const timer = time.create(); 
  const sample = zone.sample(); // зона
  // Parse URL to separate path and query string
  const [path, qstring]= q.url.split('?');
  let query = qstring ? Object.fromEntries(new URLSearchParams(qstring)) : {};
  let spore = { // mediates our knowledge of the request data.
    method: q.method, path: path, query: query, headers: q.headers, // method, path, headers
    domain: q.headers.host?.split(':')[0], // 'blancs.io' or 'localhost'
    localAddr: q.socket.localAddress, remoteAddr: q.socket.remoteAddress,
    isLocal: () => spore.domain === 'localhost' || spore.domain === 'rsat.local' 
      || spore.domain === "vostok.local" || spore.domain === "prospekt.local",
    isLB: () => spore.domain === spore.localAddr?.replace('::ffff:', ''),
    isVisitor: () => DOMAINS.includes(spore.domain), // request thru hosted domains
    dump: () => `🌊 ${spore.method} ${spore.path} (${spore.remoteAddr})` +
      ` ${JSON.stringify(spore.headers)}`,
    body: new Promise((resolve) => {
      let body = ''; q.on('data', c => body += c.toString()).on('end', () => resolve(body));
    }), 
    renderLevel: () => spore.isLocal() ? // 99 = all, 0 = echo spore
      parseInt(spore.headers['mycelium-render-level'] || 99) : 99
  }
  ctx.qlog().line(`${spore.method} ${spore.path} (${spore.remoteAddr}) ${spore.domain}`, 1)
  // Local override: allow extension to signal intended domain for localhost via header
  if (spore.isLocal() && q.headers['x-xylem-domain']) {
    const xylemDomain = q.headers['x-xylem-domain'].toString().trim().toLowerCase();
    log.line(`🌿 xylem domain ${xylemDomain}`, 1);
    // If this is a GET request and path doesn't already have the domain prefix, redirect to prefixed URL
    if (spore.method === 'GET' && !spore.path.startsWith('/' + xylemDomain + '/') && spore.path !== '/' + xylemDomain) {
      const redirectPath = spore.path === '/' ? '/' + xylemDomain : '/' + xylemDomain + spore.path;
      log.line(`🌿 xylem redirecting to ${redirectPath}`, 1);
      a.writeHead(307, { 'Location': redirectPath }).end();
      return;
    }
    spore.domain = xylemDomain;
    spore.path = spore.path.replace('/'+ xylemDomain, '');
  }
  if (spore.renderLevel() === 0) { a.writeHead(200, { 'Content-Type': 'text/plain' }).end(JSON.stringify(spore)); return; }// TODO RENDER LEVEL 0: echo spore
  if (!spore.isVisitor() && !spore.isLB() && !spore.isLocal()) {
    throw new Error(`😱 unknown access\n ${spore.dump()}`); 
  } // curl -H "Host: sus.com" http://localhost:8888/
  let pathology = new Pathology(spore); timer.mark('pathology');
  if (spore.renderLevel() === 1) { a.writeHead(200, { 'Content-Type': 'text/plain' }).end(JSON.stringify(pathology)); return; }// TODO RENDER LEVEL 1: echo pathology
  let interpreter = await pathology.traceLineage(sample); timer.mark('lineage');
  if (spore.renderLevel() === 2) { a.writeHead(200, { 'Content-Type': 'text/plain' }).end(JSON.stringify(interpreter)); return; }// TODO RENDER LEVEL 2: echo interpreter 
  let strain = await interpreter.interpret(); timer.mark('strain');
  if (spore.renderLevel() === 3) { a.writeHead(200, { 'Content-Type': 'text/plain' }).end(JSON.stringify(strain.lineage)); return; }// TODO RENDER LEVEL 3: echo strain
  let petri = { 
    pathology, xface: strain.xface, zone: sample, qlog: ctx.qlog(),
    _debug: false, _http: [{ status: -1, headers: {}, body: '', stack: '' }], 
    mutate: function(mutation) {
      let newhttp = mutation(this._http[this._http.length - 1])
      if (this._debug) { newhttp.stack = new Error().stack }
      this._http.push(newhttp)
      return this;
    },
    yieldHttp: function() {
      return this._http.pop()
    }
  }
  await strain.express(petri); timer.mark('express');
  let http = petri.yieldHttp()
  a.writeHead(http.status, http.headers).end(http.body)

  ctx.qlog().line(`${http.status === 200 ? '\x1b[32m' : '\x1b[31m'}> ${http.status} <\x1b[0m ${timer.elapsed()}ms ${sample.getTotalOps()}iops`, 1)
  ctx.qlog().line(`📊 I/O: ${sample.getStatsDetail()}`, 2)
  ctx.qlog().line(`⏱️ Timings: pathology=${timer.elapsed('pathology')}ms, strain=${timer.elapsed('strain')}ms, express=${timer.elapsed('express')}ms`, 2)
}, (q, error, a) => { // recover function
  ctx.qlog().line(`⚠️ HTTP 500 ${error.code} ${q.method} ${q.url} - ${error.stack}`, 1)
  a.writeHead(500).end(error.message);
});
class Pathology { 
  constructor(spore) {
    this.spore = spore;
    this.opath = spore.path; // original request path 
    let mypath = spore.isVisitor() ? join('/', spore.domain, spore.path)
      : spore.path; // admins (non-visitors) get free reign
    // no trailing slash (unless root)
    this.cpath = (mypath.endsWith('/') ? mypath.slice(0, -1) : mypath) || '/'; 
    // decode URL-encoded characters (like emoji)
    this.cpath = decodeURIComponent(this.cpath);
    const segments = this.cpath.split('/').slice(1);
    this.sublevel = segments.findIndex(p => p !== '_');
    this.sublevel = this.sublevel === -1 ? segments.length : this.sublevel;
    this.spath = join('/_', this.cpath === '/' ? '' : this.cpath);
    this.ipath = '/' + this.cpath.split('/').slice(this.sublevel + 1).join('/')
    this.iext = this.ipath.split('.').pop(); 
  }
  traceLineage(zone) {
    let sections = [this.spath, join(this.spath, '.node'), this.ipath];
    let _srt = this.spath.split('/'); // substrate root tracer
    while (_srt.some((x, i) => i > 0 && x !== '_')) { _srt.pop();
      sections.unshift(join(_srt.join('/'), '.node'));
    } // lineage sections array statically initialized
    return { // lineage tracer
      sections,
      interpret: async () => { 
        let lineage = []; let i = 0; let xface = { path: '', ex: false, id: false };
        while (i < sections.length) {
          const sect = sections[i];
          if (!sect.split('/').includes('_')) { 
            xface = !(await zone.ex(sect)) ? { path: sect, ex: false, id: false } : 
              await zone.if(sect) ? { path: sect, ex: true, id: false, file: (await zone.rd(sect)) }
               : { path: sect, ex: true, id: true, files: (await zone.ls(sect)) };
            if (xface.ex)  break; 
            i++; continue;
          } else if (!(await zone.if(sect))) { i++; continue; }
          let chromosome = (await zone.rd(sect)).toString('utf8').split('\n')
            .filter(gene => { 
              if (!sect.startsWith('/')) return true; // no remotely stored zone extensions (yet)
              if (gene.length === 0) return false;
              // process and redact zone notations
              let [append, insert] = [gene.startsWith('🏔️'), gene.startsWith('🌋')];
              if (!append && !insert) return true;
              let gbody = gene.replace(/^🏔️|^🌋/, '').trim(); 
              let cfile = this.cpath.split('/').pop();
              if (gbody.endsWith('*')) gbody = gbody.slice(0, -1) + cfile;
              if (append) sections.push(gbody);
              if (insert) sections.splice(i + 1, 0, gbody); 
              return false;
            })
          lineage.push({ path: sect, chromosome}); i++;
        }
        return new Strain(this, zone, lineage, ctx, xface);
      }
    }
  }
}

class Strain {
  constructor(pathology, zone, lineage, ctx, xface) {
    // TODO pack these up into larger (if not opts)
    this.pathology = pathology; this.zone = zone; 
    this.lineage = lineage; this.ctx = ctx; this.xface = xface;
  }
  async express(petri) {
    let polymer = this._resolve()._reconcile()._assemble([]);
    this.polymer = polymer.length > 0 ? polymer : [(petri) => {
      if (this.xface && this.xface.id) {
        petri.mutate((x) => ({ status: 307, headers: { 'Location': this.pathology.spath }, body: '' }));
      } else if (this.xface.ex && !this.xface.id) { 
        let opath = this.pathology.opath
        let data = ['html', 'css', 'js', 'json'].includes(this.pathology.iext) ? 
          this.xface.file.toString('utf8') : this.xface.file;
        let ctype = 'text/html';
        switch(this.pathology.iext) {
            case 'html': ctype = 'text/html'; break;
            case 'css': ctype = 'text/css'; break;
            case 'js': ctype = 'application/javascript'; break;
            case 'json': ctype = 'application/json'; break;
            case 'md': ctype = 'text/plain; charset=utf-8'; break;
            case 'ttf': ctype = 'font/ttf'; break;
            case 'woff': ctype = 'font/woff'; break;
            case 'woff2': ctype = 'font/woff2'; break;
        }
        petri.mutate((x) => ({ status: 200, headers: { 'Content-Type': ctype }, body: data }));
      } else {
        petri.mutate((x) => ({ status: 404, headers: {'Content-Type': 'text/html'}, body: '<h1>404</h1><p>No Expression.</p>' }));
      }
      return petri;
    }]
    for (const monomer of this.polymer) petri = await monomer(petri);
    // TODO returns nothing - maybe return some metrics in the future
  }
  _resolve() { // identify syntaxenes, import polymerizers
    if (this.polymerizers) return this;
    // TODO should filter out 🧬's from lineage as they are processed
    this.polymerizers = this.lineage.filter(sect => sect?.chromosome).flatMap(sect =>
      sect.chromosome.filter(g => g.startsWith('🧬')).map(g => g.replace('🧬', ''))
    ).filter(Boolean).map(gene => {
      return atmosphere.get(gene).vend(this.pathology, this.zone);
    }).filter(Boolean);
    return this;
  }
  _reconcile() {
    if (!this.lineage) return this;
    let lineage = this.lineage;
    this.lineage = null;
    // TODO progressive polymer offloading: polymers are marked for 
    // "offloadability", examine polymer for offloadable tail and return.
    for (const plmrzr of this.polymerizers) lineage = plmrzr.consume(lineage, this.xface);
    return this;
  }
  _assemble(polymer) {
    if (this.polymer) return this.polymer;
    // TODO neuro/hyphae returns array of functions
    for (const p of this.polymerizers) polymer.push(...p.assemble())
    return polymer;
  }
}
