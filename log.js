const pcut = 1;  // 0 = none, 1 = critical, 2 = nominal, 3 = debug

console.log(`🛰️ logging pcut ${pcut} (0=none, 1=criticals, 2=nominals, 3=debugs)`);

// Function to generate a deterministic color code from request ID
function getColorFromRequestId(requestId) {
  // Simple hash function to generate a number from the request ID
  let hash = 0;
  for (let i = 0; i < requestId.length; i++) {
    hash = ((hash << 5) - hash) + requestId.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Map hash to one of these ANSI color codes (31-37, 91-97)
  const colorCodes = [31, 32, 33, 34, 35, 36, 37, 91, 92, 93, 94, 95, 96, 97];
  const colorIndex = Math.abs(hash) % colorCodes.length;
  return colorCodes[colorIndex];
}

// Create module export
module.exports = {
  init: function(filename, emojid, color, priority) {
    const logger = {
      filename: filename.split('/').pop(),
      emojid: emojid,
      color: color,
      priority: priority,
      
      // Instance line method
      line: function(line, priority) {
        if (this.priority > pcut || (priority && priority > pcut)) return;
        console.log(`${this.emojid} \x1b[${this.color}m${Date.now()}\x1b[0m ${line}`);
      },
      
      // Static method for request-specific logging
      static: function(requestId) {
        const parent = this;
        const requestIdColor = getColorFromRequestId(requestId);
        return {
          line: (line, priority) => {
            if (parent.priority > pcut || (priority && priority > pcut)) return;
            console.log(`${parent.emojid} \x1b[${parent.color}m${Date.now()}\x1b[0m \x1b[${requestIdColor}m${requestId}\x1b[0m ${line}`);
          }
        };
      }
    };
    
    // Log initialization message
    if (logger.priority > pcut) {
      console.log(`${logger.emojid} \x1b[${logger.color}m${Date.now()}\x1b[0m Oops! Not Logging \x1b[31m${logger.filename}\x1b[0m (p${logger.priority})`);
    } else {
      console.log(`${logger.emojid} \x1b[${logger.color}m${Date.now()}\x1b[0m Hola! Logging \x1b[32m${logger.filename}\x1b[0m (p${logger.priority})`);
    }
    
    return logger;
  }
}; 