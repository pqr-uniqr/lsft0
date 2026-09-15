/**
 * time.js - Simple timing utility for measuring durations
 * 
 * This module provides a simple Timer class for measuring elapsed time with
 * high precision using process.hrtime().
 */

const log = require('./log.js').init(__filename, '⏱️','35', 0);

class Timer {
  constructor(id) {
    this.id = id;
    this.startTime = null;
    this.markers = {};
  }

  start() {
    this.startTime = process.hrtime();
    return this;
  }

  mark(label) {
    if (!this.startTime) {
      log.line(`Warning: Marking time before starting the timer`);
      return this;
    }
    this.markers[label] = process.hrtime(this.startTime);
    return this;
  }

  elapsed(label) {
    if (!this.startTime) {
      return 0;
    }
    
    const hrtime = label && this.markers[label] 
      ? this.markers[label] 
      : process.hrtime(this.startTime);
      
    return (hrtime[0] * 1000 + hrtime[1] / 1000000).toFixed(2);
  }

  log(label, customMessage) {
    const elapsedMs = this.elapsed(label);
    const markerText = label ? ` [${label}]` : '';
    const message = customMessage || `Time elapsed${markerText}`;
    log.line(`${message}: ${elapsedMs}ms`);
    return this;
  }
}

module.exports = {
  create: (id) => new Timer(id).start()
}; 