// lsft0 under pm2: the medium and the paddock, side by side.
// mycelium renders; the paddock thinks. a renderer edit restarts mycelium
// (atmosphere's fatal watcher) and never touches a warm agent.
//
// ports are chosen not to collide with the old incarnation (lsft's
// mycelium at 8888), and names likewise (mycelium, local).
//   pm2 start ecosystem.config.js
//   http://vostok.local:8880/vvill   the doctor: its thread and its stables
//   ws://vostok.local:8881/vvill      the paddock, keyed by personality path
// PADDOCK_IDLE_MS (default 30 minutes of silence) ends a conversation and
// deposits it; PADDOCK_ARGS adds flags to every claude process.
// PADDOCK_ATTEMPTS is the playwright's bin: a conversation wiped during the
// Genesis test is deposited there as a numbered attempt (see paddock.js).
const { join } = require('path');
const { homedir } = require('os');
const PADDOCK_PORT = 8881;
const PADDOCK_ATTEMPTS = join(homedir(), 'lsft', 'vvill', 'willow', 'abby', 'attempts');

module.exports = {
  apps: [
    {
      name: 'mycelium0',
      script: 'mycelium.js',
      cwd: __dirname,
      watch: false,
      autorestart: true,
      env: { BLANCS_PORT: 8880, PADDOCK_PORT },
    },
    {
      name: 'paddock0',
      script: 'paddock.js',
      cwd: __dirname,
      watch: false,
      autorestart: true,
      env: { PADDOCK_PORT, PADDOCK_ATTEMPTS },
    },
  ],
};
