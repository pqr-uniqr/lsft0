/** @ts-nocheck
 * STORAGE IS A LADDER
 * 
 * TODO: ls() should return more than filenames from both S3 and FS; type consistency optional, but protocol must be clear.
 */

const fs = require('fs').promises;
const { join } = require('path');
const atmosphere = require('./atmosphere')
const log = atmosphere.register('log.js').init(__filename, '⛰️','32', 0)

class Zone {
  constructor() {
    this.zoneLocal = new ZoneLocal();
  }
  _route(p) {
    if (p.startsWith('s3pre://')) { if (!this.zoneS3Pre) this.zoneS3Pre = new ZoneS3Pre(); return this.zoneS3Pre; }
    if (p.startsWith('s3://')) { if (!this.zoneS3) this.zoneS3 = new ZoneS3(); return this.zoneS3; }
    return this.zoneLocal;
  }
  _strip(p) {
    if (p.startsWith('s3pre://')) return p.substring(8); 
    if (p.startsWith('s3://')) return p.substring(5); 
    if (p.startsWith('file://')) return p.substring(7); 
    return p; 
  }
  sample(id) { return new ZoneSample(this, id); }

  // Direct delegation methods for when you don't need stats tracking
  async rd(p) { return this._route(p).rd(this._strip(p)); }
  async rd8(p) { return this._route(p).rd8(this._strip(p)); }
  async rdb(p) { return this._route(p).rdb(this._strip(p)); }
  async wr(p, d) { return this._route(p).wr(this._strip(p), d); }
  async st(p) { return this._route(p).st(this._strip(p)); }
  async ex(p) { return this._route(p).ex(this._strip(p)); }
  async ls(p, options) { return this._route(p).ls(this._strip(p), options); }
  async if(p) { return this._route(p).if(this._strip(p)); }
  async id(p) { return this._route(p).id(this._strip(p)); }
  async rm(p) { return this._route(p).rm(this._strip(p)); }
  async mk(p) { return this._route(p).mk(this._strip(p)); }
}

// Define zone implementation classes
class ZoneLocal {
    constructor() {}
    
    async _resolvePath(p) {
        const basePath = decodeURIComponent(join(process.cwd(), p));
        return await this._resolveSymlinks(basePath);
    }
    
    async _resolveSymlinks(path) {
        try {
            const stats = await fs.lstat(path);
            if (stats.isSymbolicLink()) {
                const linkTarget = await fs.readlink(path);
                // Handle both absolute and relative symlinks
                const resolvedTarget = require('path').isAbsolute(linkTarget) 
                    ? linkTarget 
                    : require('path').resolve(require('path').dirname(path), linkTarget);
                    
                // Recursively resolve in case of chained symlinks
                return await this._resolveSymlinks(resolvedTarget);
            }
            return path;
        } catch (error) {
            // If lstat fails, return original path (file doesn't exist yet)
            return path;
        }
    }
    
    async rd(p) { return fs.readFile(await this._resolvePath(p)); }
    async rd8(p) { return fs.readFile(await this._resolvePath(p), 'utf8'); }
    async rdb(p) { return fs.readFile(await this._resolvePath(p)); }
    async wr(p, d) { return fs.writeFile(await this._resolvePath(p), d); }
    async rm(p) { return fs.unlink(await this._resolvePath(p)); }
    async mk(p) { return fs.mkdir(await this._resolvePath(p), { recursive: true }); }
    async st(p) {
        const resolvedPath = await this._resolvePath(p);
        const stats = await fs.stat(resolvedPath);
        return {
            isFile: stats.isFile(), isDirectory: stats.isDirectory(), size: stats.size,
            birthtimeMs: stats.birthtimeMs, mtimeMs: stats.mtimeMs, ctimeMs: stats.ctimeMs, atimeMs: stats.atimeMs,
            mode: stats.mode, uid: stats.uid, gid: stats.gid, blksize: stats.blksize, blocks: stats.blocks,
            dev: stats.dev, ino: stats.ino, nlink: stats.nlink, rdev: stats.rdev,
            originalPath: p, resolvedPath: resolvedPath
        };
    }
    async ex(p) {
        try {
            await fs.access(await this._resolvePath(p));
            return true;
        } catch {
            return false;
        }
    }
    async ls(p, options = {}) {
        const resolved = await this._resolvePath(p);
        const dirents = await fs.readdir(resolved, { withFileTypes: true });
        return dirents.map(d => ({
            name: d.name, isFile: d.isFile(), isDirectory: d.isDirectory() 
        }));
    }
    async if(p) {
        try {
            const resolvedPath = await this._resolvePath(p);
            const stat = await fs.stat(resolvedPath);
            return stat.isFile();
        } catch {
            return false;
        }
    }
    async id(p) {
        try {
            const resolvedPath = await this._resolvePath(p);
            const stat = await fs.stat(resolvedPath);
            return stat.isDirectory();
        } catch {
            return false;
        }
    }
}

class ZoneS3 {
    constructor() {
      const { S3Client } = require("@aws-sdk/client-s3");
      this.client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
    }
    _s3() { return require("@aws-sdk/client-s3"); }
    async rd(p) {
      console.log('🍒', p);
      const { GetObjectCommand } = this._s3();
      const { bucket, key } = this._parsePath(p);
      const command = new GetObjectCommand({ Bucket: bucket, Key: key });
      try {
        const res = await this.client.send(command);
        return res.Body ? await this._streamToBuffer(res.Body) : Buffer.from('');
      } catch (error) {
        console.error(`Error reading S3 file ${p}:`, error);
        throw error;
      }
    }
    // Helper method to convert stream to buffer - reused by rd and rdb
    async _streamToBuffer(stream) {
      return new Promise((resolve, reject) => {
        const chunks = [];
        stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        stream.on('error', reject);
        stream.on('end', () => resolve(Buffer.concat(chunks)));
      });
    }
    async rd8(p) {
      const { GetObjectCommand } = this._s3();
      const { bucket, key } = this._parsePath(p);
      const command = new GetObjectCommand({ Bucket: bucket, Key: key });
      try {
        const res = await this.client.send(command);
        return res.Body ? await this._streamToString(res.Body) : '';
      } catch (error) {
        console.error(`Error reading S3 file ${p}:`, error);
        throw error;
      }
    }
    // Helper method to convert stream to string
    async _streamToString(stream) {
      return new Promise((resolve, reject) => {
        const chunks = [];
        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('error', reject);
        stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      });
    }
    async rdb(p) {
      const { GetObjectCommand } = this._s3();
      const { bucket, key } = this._parsePath(p);
      const command = new GetObjectCommand({ Bucket: bucket, Key: key });
      try {
        const res = await this.client.send(command);
        return res.Body ? await this._streamToBuffer(res.Body) : Buffer.from('');
      } catch (error) {
        console.error(`Error reading S3 file as binary ${p}:`, error);
        throw error;
      }
    }
    async wr(p, d) {
      const { PutObjectCommand } = this._s3();
      const { bucket, key } = this._parsePath(p);
      const command = new PutObjectCommand({ Bucket: bucket, Key: key, Body: d });
      try { return await this.client.send(command); }
      catch (error) { console.error(`Error writing to S3 file ${p}:`, error); throw error; }
    }
    async st(p) {
      const { HeadObjectCommand } = this._s3();
      const { bucket, key } = this._parsePath(p);
      const command = new HeadObjectCommand({ Bucket: bucket, Key: key });
      try {
        const data = await this.client.send(command);
        return {
          isFile: true, isDirectory: false, size: data.ContentLength, lastModified: data.LastModified,
          eTag: data.ETag, contentType: data.ContentType, storageClass: data.StorageClass
        };
      } catch (error) {
        console.error(`Error getting S3 file stats ${p}:`, error);
        throw error;
      }
    }
    async ex(p) {
      try {
        const { HeadObjectCommand } = this._s3();
        const { bucket, key } = this._parsePath(p);
        const command = new HeadObjectCommand({ Bucket: bucket, Key: key });
        await this.client.send(command);
        return true;
      } catch {
        return false;
      }
    }
    async ls(p) { throw new Error('ls() not implemented for S3'); }
    async if(p) {
      try { const stat = await this.st(p); return stat.isFile; }
      catch { return false; }
    }
    async id(p) {
      try { const stat = await this.st(p); return stat.isDirectory; }
      catch { return false; }
    }
    async rm(p) {
      const { DeleteObjectCommand } = this._s3();
      const { bucket, key } = this._parsePath(p);
      const command = new DeleteObjectCommand({ Bucket: bucket, Key: key });
      try { return await this.client.send(command); }
      catch (error) { console.error(`Error deleting S3 file ${p}:`, error); throw error; }
    }
    async mk(p) {
      const { PutObjectCommand } = this._s3();
      const { bucket, key } = this._parsePath(p);
      const dirKey = key.endsWith('/') ? key : `${key}/`;
      const command = new PutObjectCommand({ Bucket: bucket, Key: dirKey, Body: '' });
      try { return await this.client.send(command); }
      catch (error) { console.error(`Error creating S3 directory ${p}:`, error); throw error; }
    }
    _parsePath(p) {
      const parts = p.split('/');
      const bucket = parts[0];
      const key = parts.slice(1).join('/');
      return { bucket, key };
    }
}

class ZoneS3Pre {
  constructor() {
    const { S3Client } = require("@aws-sdk/client-s3");
    this.client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
    this.maxCacheEntries = 128;
    this.cacheTtlMs = 3000;
    this.headCache = new Map(); // key: bucket/key, value: { tsMs, lastWriteUnix, order }
    this.orderCounter = 0;
  }

  async rd(p) {
    const { bucket, key } = this._parsePath(p);
    // warm cache asynchronously; do not block rd on HEAD
    // TODO not that useful if the callback hits a different server.
    this._getLastWriteUnix(bucket, key).catch(() => {});
    const url = await this._generatePresignedUrl(bucket, key);
    return Buffer.from(url);
  }

  async rd8(p) { const buf = await this.rd(p); return buf.toString('utf8'); }
  async rdb(p) { return this.rd(p); }
  async wr(p, d) { return Promise.resolve(); }
  async st(p) { const { bucket, key } = this._parsePath(p); const lastWriteUnix = await this._getLastWriteUnix(bucket, key); return { isFile: true, isDirectory: false, size: undefined, lastModified: new Date(lastWriteUnix * 1000) }; }
  async ex(p) { try { const { HeadObjectCommand } = require("@aws-sdk/client-s3"); const { bucket, key } = this._parsePath(p); const command = new HeadObjectCommand({ Bucket: bucket, Key: key }); await this.client.send(command); return true; } catch { return false; } }
  async ls() { throw new Error('ls() not implemented for s3pre'); }
  async if(p) { try { const stat = await this.st(p); return stat.isFile; } catch { return false; } }
  async id() { return false; }
  async rm() { return Promise.resolve(); }
  async mk() { return Promise.resolve(); }

  async _getLastWriteUnix(bucket, key) {
    const cacheKey = `${bucket}/${key}`;
    const now = Date.now();
    const cached = this.headCache.get(cacheKey);
    if (cached && now - cached.tsMs < this.cacheTtlMs) return cached.lastWriteUnix;

    const { HeadObjectCommand } = require("@aws-sdk/client-s3");
    const head = await this.client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    const lastModified = head && head.LastModified ? head.LastModified : undefined;
    const lmMs = lastModified instanceof Date ? lastModified.getTime() : (lastModified ? new Date(lastModified).getTime() : Date.now());
    const lastWriteUnix = Math.floor(lmMs / 1000);

    // FIFO eviction by insertion order; Map keeps insertion order
    this._setCache(cacheKey, { tsMs: now, lastWriteUnix });
    return lastWriteUnix;
  }

  _setCache(key, value) {
    if (!this.headCache.has(key) && this.headCache.size >= this.maxCacheEntries) {
      const oldestKey = this.headCache.keys().next().value;
      if (oldestKey !== undefined) this.headCache.delete(oldestKey);
    }
    this.headCache.set(key, value);
  }

  async _generatePresignedUrl(bucket, key, expiresIn = 3600) {
    const { GetObjectCommand } = require("@aws-sdk/client-s3");
    const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
    const command = new GetObjectCommand({ Bucket: bucket, Key: key });
    return await getSignedUrl(this.client, command, { expiresIn });
  }

  _parsePath(p) {
    const parts = p.split('/');
    const bucket = parts[0];
    const key = parts.slice(1).join('/');
    return { bucket, key };
  }
}

class ZoneSample {
  constructor(zone, sampleId = Math.random().toString(36).substring(2, 8)) {
    this.zone = zone;
    this.sampleId = sampleId;
    this.stats = { rd: 0, rd8: 0, rdb: 0, wr: 0, st: 0, ex: 0, ls: 0, if: 0, id: 0, rm: 0 };
    this.traces = { rd: [], rd8: [], rdb: [], wr: [], st: [], ex: [], ls: [], if: [], id: [], rm: [] };
  }

  _tally(method, path) {
    this.stats[method]++;
    const stack = new Error().stack;
    if (this.traces && this.traces[method]) {
      this.traces[method].push({ timestamp: new Date(), path, stack });
    }
  }

  async rd(p) { this._tally('rd', p); return this.zone.rd(p); }
  async rd8(p) { this._tally('rd8', p); return this.zone.rd8(p); }
  async rdb(p) { this._tally('rdb', p); return this.zone.rdb(p); }
  async wr(p, d) { this._tally('wr', p); return this.zone.wr(p, d); }
  async st(p) { this._tally('st', p); return this.zone.st(p); }
  async ex(p) { this._tally('ex', p); return this.zone.ex(p); }
  async ls(p) { this._tally('ls', p); return this.zone.ls(p); }
  async if(p) { this._tally('if', p); return this.zone.if(p); }
  async id(p) { this._tally('id', p); return this.zone.id(p); }
  async rm(p) { this._tally('rm', p); return this.zone.rm(p); }
  async mk(p) { this._tally('mk', p); return this.zone.mk(p); }

  getStats() { return { sampleId: this.sampleId, ...this.stats, traces: this.traces }; }
  getTotalOps() { return Object.entries(this.stats).filter(([k]) => ['rd', 'rd8', 'rdb', 'wr', 'st', 'ex', 'ls', 'if', 'id', 'rm', 'mk'].includes(k)).reduce((sum, [, v]) => sum + v, 0); }
  getStatsDetail() { return Object.entries(this.stats).filter(([k, v]) => v > 0 && ['rd', 'rd8', 'rdb', 'wr', 'st', 'ex', 'ls', 'if', 'id', 'rm', 'mk'].includes(k)).map(([k, v]) => `${k}:${v}`).join(' '); }
}


// every reload creates/exports a new global instance. 
module.exports = new Zone();
