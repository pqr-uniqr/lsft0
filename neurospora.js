// @ts-nocheck neurospora - model mycelium syntax
const log = require('./log.js').init(__filename, '🧠','32', 1)
const cheerio = require('cheerio');
const { dirname } = require('path');
const atmosphere = require('./atmosphere')
const { join } = require('path');
const fs = require('fs');
const EmojiLex = atmosphere.register('emojilex.js')

/*
neurospora is just a funny experimental mycelium substrate syntax. a local
dialect i'a trying to cook up for my own needs. simple, intuitive, casual.

getting a sense of how practical this can be. add primitives for adding page
transformers inline
*/
const syntax = {
  vend: function(pathology) {
    const cpath = pathology.cpath;
    const verb = pathology.spore.method;
    let lex = new EmojiLex(['🗂️','🗄️','📄','💉','🪽','🍒','📮'])
    const polymerizer = {
      _okbound: false,
      consume: (lineage, xface) => {
        return lex.absorb(lineage, (gene) => { // expression regulator
          switch(gene.emoji) {
            case '🍒':
              if (cpath === gene.location) { return true; }
              break;
            case '📄':
              let subgenedec = [];  // subgene declarations
              // Parse subgenes syntax: ctrl.js::md2ctrl(🎨) .*\.md
              const match = gene.body.match(/^(.+?)\(([^)]+)\)\s+(.+)$/);
              if (match) {
                match[2].split(',').map(s => s.trim()).forEach(s => { gene.subgenes[s] = ""; });
                gene.body = `${match[1]} ${match[3]}`; // (edits gene body) "fn regex"
              }
              const [fn, regex] = gene.body.split(' ');
              if (new RegExp(regex).test(cpath.replace(gene.location + '/', ''))) {
                polymerizer._okbound = true;
                return true;
              }
              break;
            case '🗂️':
              if (cpath === gene.location) {
                polymerizer._okbound = true;
                return true;
              }
              break;
            case '🗄️': // recursive: matches at-or-below gene.location, directories only
              {
                if (!xface || !xface.id) break; // not a directory — defer to default file-serve
                const loc = gene.location === '/' ? '' : gene.location;
                if (cpath === gene.location || cpath.startsWith(loc + '/')) {
                  polymerizer._okbound = true;
                  return true;
                }
              }
              break;
            case '📮': // 📮<subpath> <mod::fn> POST handler
              const [postPath, ...postRest] = gene.body.split(' ');
              const fullPostPath = gene.location + postPath;
              gene.body = postRest.join(' ');
              gene._postPath = fullPostPath;
              return verb === 'POST' && cpath === fullPostPath;
            case '🪽':
              return pathology.spore.isLocal()
            case '💉':
              return true;
            default: break;
          }
          return false;
        }); 
      }, 
      assemble: () => {
        const polymer = [];
        lex.forEach((mrna) => {
          switch(mrna.emoji) {
            case '🍒': // 🍒 /<location> redirect to location
              polymer.push((petri) => {
                petri.mutate((x) => ({ status: 307, headers: { 
                  'Location': pathology.spore.isLocal() ? cpath + mrna.body : mrna.body 
                }}))
                return petri;
              }); break;
            case '📄': // 📄 <mod:fn>(subgenes) <regex> interpret interface
              const [fn, regex] = mrna.body.split(' ');
              polymer.push(async (petri) => {
                const args = [petri.xface];
                if (mrna.subgenes) args.push(mrna.subgenes);
                args.push(petri); // hand the handler the full petri (headers, mutate, etc.)
                petri.html = await atmosphere.get(fn)(...args);
                return petri;
              }); break;
            case '🗂️': // 🗂️ <mod::fn> interpret directory contents (location-bound)
              polymer.push(async (petri) => {
                petri.html = await atmosphere.get(mrna.body)(petri.xface, petri);
                return petri;
              }); break;
            case '🗄️': // 🗄️ <mod::fn> interpret directory contents (recursive — at-or-below location)
              polymer.push(async (petri) => {
                petri.html = await atmosphere.get(mrna.body)(petri.xface, petri);
                return petri;
              }); break;
            case '📮': // 📮 <mod::fn> POST handler
              polymer.push(async (petri) => {
                const body = await petri.pathology.spore.body;
                const result = await atmosphere.get(mrna.body)(body, petri);
                if (result) {
                  petri.mutate(() => result);
                }
                return petri;
              }); break;
            case '🪽': // 🪽 <file> inject only if localhost
              if (polymerizer._okbound) {
                polymer.push((petri)=> {
                  petri.angelnames = petri.angelnames ? petri.angelnames : [];
                  petri.angelnames.push(mrna.body);
                  return petri;
                })
              }; break;
            case '💉': // 💉 <file> inject script
              if (polymerizer._okbound) {
                polymer.push(async (petri)=> {
                  petri.scripts = petri.scripts ? petri.scripts : [];
                  const content = await petri.zone.rd8(mrna.body);
                  petri.scripts.push({ name: mrna.body, content });
                  return petri;
                })
              }; break;
            default: break;
          }
        })
        
        if (polymerizer._okbound) {
          polymer.push((petri)=> {
            const $ = cheerio.load(petri.html);
            // Preload wings early (modulepreload allows early fetch and execution order control)
            if (petri.angelnames && petri.angelnames.length) {
              petri.angelnames.forEach(name => {
                $('head').prepend(`<link rel="modulepreload" href="${name}" />`);
              });
              // Also inject blocking scripts at the very top to run ASAP
              petri.angelnames.forEach(name => {
                $('head').prepend(`<script type="module" src="${name}"></script>`);
              });
            }
            if (petri.scripts && petri.scripts.length) {
              petri.scripts.forEach(script => { 
                $('head').append(`<script id="${script.name}">${script.content}</script>`);  
              });
            }
            petri.html = $.html();
            return petri.mutate((x) => ({ 
              status:200, 
              headers:{ "Content-Type": "text/html" }, 
              body: petri.html
            }))
          })
        }
        
        return polymer;
      },
    }
    return polymerizer;
  }
};

module.exports = { syntax };