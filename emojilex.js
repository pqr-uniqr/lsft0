// @ts-nocheck
const { dirname } = require('path');

// a mycelium substrate "metasyntax". presents a view of the substrate as a 
// list of lines, each line starting with an emoji. all syntax center around
// creating effects tied to having emoji-headed lines of data.
class EmojiLex {
  constructor(lexicon) {
    this.lexicon = lexicon;
  }
  absorb(lineage, expreg /* expression regulator */) {
    this.mrnas = []; // warpped active genes in discovery order
    for (let sect of lineage) {
      if (!sect.chromosome) { continue; }
      sect.chromosome = sect.chromosome.filter(geneStr => {
        const emoji = this.lexicon.find(emoji => geneStr.startsWith(emoji));
        if (emoji) {
          let mrna = { // carries gene data for expression
            location: sect.path.endsWith('/.node') ? 
              dirname(sect.path.substring(2)) : sect.path.substring(2), 
            body: geneStr.substring(emoji.length).trim(), 
            subgenes: {}, emoji,
          }
          if (!expreg || expreg(mrna)) { 
            this.mrnas.push(mrna);
          }
          return false; // filter matched gene
        }
        
        let foundAsSubgene = false;
        for (let mrna of this.mrnas) {
          if (mrna.subgenes) {
            // Check if this geneStr matches any subgene this gene is watching for
            for (let subgeneEmoji in mrna.subgenes) {
              if (geneStr.startsWith(subgeneEmoji)) {
                const value = geneStr.substring(subgeneEmoji.length).trim();
                mrna.subgenes[subgeneEmoji] = value;
                foundAsSubgene = true;
                // Don't break - multiple genes might want this same subgene
              }
            }
          }
        }
        if (foundAsSubgene) { return false; }
        
        return true; // no match, keep gene
      });
    }
    return lineage;
  }

  forEach(fn) {
    this.mrnas.forEach(mrna => {
      fn(mrna, mrna.subgenes);
    });
  }
}

module.exports = EmojiLex