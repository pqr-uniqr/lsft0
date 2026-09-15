const { join } = require('path');
const chokidar = require('chokidar');
const log = require('./log.js').init(__filename, '📚','36', 0)
const fs = require('fs');

/*
 Automatic Modules, AutoMods, AuToMOdS, ATMOS, Atmosphere. 

 inserts a custom management layer between program and nodejs module system.
 mainly to provide hot-load functionalities. keep elements available and fresh,
 that's atmosphere.

 basis for a dynamic dependency analysihs system in the future, that helps 
 analyze branches of mycelium for dependency and related IO burdens.

 every module system presents itself like some sane code management system that 
 tames the chaos, when in practice every one ends up a soup of criss-crossing
 elements floating in the air for your business logic to grab for relief in the
 moment. let's acknowledge that reality, and thrive, gladly don the complexity
 like glorious living texture.

 - Zone and Atmosphere are the two main dependencies of Mycelium
 - Hyphae recognizes Atmosphere syntax to provide seamless context switch.
 */
const atmosphere = {
  _modules: {},
  _paths: new Set(),
  _templates: {},
  _templatePaths: new Set(),
  _watcher: chokidar.watch([], { persistent: true, ignoreInitial: true }),
  
  init: function (mods, fatals = [__filename]) {
    chokidar.watch([__filename, ...fatals], { persistent: true, ignoreInitial: true }
    ).on('change', (path) => { 
      log.line(`💥 Fatal change at ${path.split('/').pop()}`); 
      process.exit(0); 
    });

    for (const mod of mods) this.register(mod);
    this._watcher.on('change', (mpath) => {
      if (this._templatePaths.has(mpath)) {
        this.reloadTemplate(mpath);
        log.line(`🔄 Reloaded template \x1b[32m${mpath.split('/').pop()}\x1b[0m`);
      } else {
        delete require.cache[require.resolve(mpath)];
        this._modules[mpath] = require(mpath);
        log.line(`🔄 Reloaded module \x1b[32m${mpath.split('/').pop()}\x1b[0m`);
      }
    });
    return this;
  },
  /*
   * Registers a module for hot reloading and returns its exports.
   * 
   * For proper hot reloading, modules should export their main functionality directly
   * rather than wrapping in an object. For example:
   * - Good: module.exports = MyClass
   * - Bad: module.exports = { MyClass }
   * 
   * This is because the reloading mechanism clears the require cache and re-requires
   * the module, and direct exports ensure the new version of the class/function is
   * properly loaded.
   * 
   * TODO wtf? i don't think that's what it was
   */
  register: function (m) { 
    let mpath = join(__dirname, m);
    if (!this._modules[mpath]) {
      log.line(`🎁 Registering new module \x1b[35m${m}\x1b[0m`);
      this._paths.add(mpath);
      this._modules[mpath] = require(mpath);
      this._watcher.add(mpath);
    }
    return this._createProxy(mpath);
  },
  
  _createProxy: function(mpath) {
    const atmosphere = this;
    
    // If module exports a constructor function/class
    if (typeof this._modules[mpath] === 'function') {
      return new Proxy(this._modules[mpath], {
        construct(target, args) {
          // Always use the latest version from cache
          const LatestModule = atmosphere._modules[mpath];
          return new LatestModule(...args);
        },
        apply(target, thisArg, args) {
          // For function calls, delegate to latest version
          const LatestModule = atmosphere._modules[mpath];
          return LatestModule.apply(thisArg, args);
        },
        get(target, prop) {
          // For static properties/methods, delegate to latest version
          const LatestModule = atmosphere._modules[mpath];
          return LatestModule[prop];
        }
      });
    }
    
    // If module exports an object
    if (typeof this._modules[mpath] === 'object' && this._modules[mpath] !== null) {
      return new Proxy(this._modules[mpath], {
        get(target, prop) {
          const LatestModule = atmosphere._modules[mpath];
          const value = LatestModule[prop];
          
          // If it's a function, bind it to the latest module
          if (typeof value === 'function') {
            return value.bind(LatestModule);
          }
          return value;
        },
        set(target, prop, value) {
          const LatestModule = atmosphere._modules[mpath];
          LatestModule[prop] = value;
          return true;
        }
      });
    }
    
    // For primitives or other types, return directly
    return this._modules[mpath];
  },
  get: function (code) {
    let [mod, name] = code.split('::');
    return this.register(mod)[name];
  },
  // Template management functions
  registerTemplate: function(templatePath) {
    const fullPath = join(__dirname, templatePath);
    this._templatePaths.add(fullPath);
    this._watcher.add(fullPath);
    return this.reloadTemplate(fullPath);
  },
  reloadTemplate: function(fullPath) {
    try {
      const content = fs.readFileSync(fullPath, 'utf8');
      this._templates[fullPath] = content;
      return content;
    } catch (err) {
      log.line(`❌ Failed to load template ${fullPath}: ${err.message}`);
      return null;
    }
  },
  getTemplate: function(templatePath) {
    const fullPath = join(__dirname, templatePath);
    if (!this._templates[fullPath]) {
      return this.registerTemplate(templatePath);
    }
    return this._templates[fullPath];
  }
};

module.exports = atmosphere; 