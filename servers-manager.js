const { exec } = require('child_process');
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const express = require('express');
const FtpSrv = require('ftp-srv');
const tftp = require('tftp2');
// TFTP2 Block Rollover Monkeypatches for Large Files (>32MB)
// TFTP protocol uses a 16-bit block counter (0-65535). In node-tftp2,
// it does not handle wrap-around, leading to UInt16 out-of-range errors
// (65536 is written into a UInt16 buffer). We monkeypatch the Packet
// and Connection modules to wrap block numbers using modulo 65536.
try {
  const Packet = require('tftp2/packet');
  const Connection = require('tftp2/connection');
  const TFTPServer = require('tftp2/server');

  // 1. Parse TFTP options (like tsize) from request packets
  const originalParse = Packet.parse;
  Packet.parse = msg => {
    const packet = originalParse(msg);
    if (packet.opcode === Packet.OPCODE.RRQ || packet.opcode === Packet.OPCODE.WRQ) {
      packet.options = {};
      try {
        let offset = 2 + Buffer.byteLength(packet.filename, 'ascii') + 1 + Buffer.byteLength(packet.mode, 'ascii') + 1;
        while (offset < msg.length) {
          let start = offset;
          while (offset < msg.length && msg[offset] !== 0) {
            offset++;
          }
          const optName = msg.toString('ascii', start, offset).toLowerCase();
          offset++;
          if (!optName) break;

          start = offset;
          while (offset < msg.length && msg[offset] !== 0) {
            offset++;
          }
          const optVal = msg.toString('ascii', start, offset);
          offset++;

          packet.options[optName] = optVal;
        }
      } catch (e) {
        // Ignore option parsing errors
      }
    }
    return packet;
  };

  // 2. Attach options to the connection/client context
  TFTPServer.prototype.handleMessage = function(message, rinfo) {
    const packet = Packet.parse(message);
    const client = new Connection(rinfo);
    this.emit('client', client);
    client.mode = packet.mode;
    client.filename = packet.filename;
    client.options = packet.options;
    switch (packet.opcode) {
      case Packet.OPCODE.RRQ: {
        this.handleReadRequest(client, packet);
        break;
      }
      case Packet.OPCODE.WRQ: {
        this.handleWriteRequest(client, packet);
        break;
      }
    }
    return this;
  };

  // 3. Modulo 65536 block number wrap-around (large files support)
  const originalCreateAck = Packet.createAck;
  Packet.createAck = (blockNumber) => {
    return originalCreateAck(blockNumber % 65536);
  };

  const originalCreateData = Packet.createData;
  Packet.createData = (blockNumber, data) => {
    return originalCreateData(blockNumber % 65536, data);
  };

  Connection.prototype.waitAck = function(block) {
    return this.wait(message =>
      message.opcode === Packet.OPCODE.ACK && message.block === (block % 65536));
  };

  Connection.prototype.waitBlock = function(block) {
    return this.wait(message =>
      message.opcode === Packet.OPCODE.DATA && message.block === (block % 65536));
  };

  // 4. Track sent block progress for reads
  const originalSendBlock = Connection.prototype.sendBlock;
  Connection.prototype.sendBlock = function(block, data) {
    if (this.totalBytes && this.transferType === 'read') {
      this.sentBytes += data.length;
      const percent = Math.floor((this.sentBytes / this.totalBytes) * 100);
      if (block === 1 || percent >= this.lastLoggedPercent + 10 || this.sentBytes === this.totalBytes) {
        this.lastLoggedPercent = percent;
        if (typeof this.onProgress === 'function') {
          this.onProgress(this.sentBytes, this.totalBytes);
        }
      }
    }
    return originalSendBlock.call(this, block, data);
  };
} catch (e) {
  console.error('Failed to apply TFTP2 enhancement monkeypatches:', e);
}
const selfsigned = require('selfsigned');
const os = require('os');

function getLocalIpForClient(clientIp) {
  if (!clientIp) return '127.0.0.1';
  
  // Handle IPv6 mapped IPv4 address
  const cleanClientIp = clientIp.includes('::ffff:') ? clientIp.replace('::ffff:', '') : clientIp;
  const clientParts = cleanClientIp.split('.');
  
  const nets = os.networkInterfaces();
  let bestMatch = null;
  let firstIp = null;
  
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        if (!firstIp) firstIp = net.address;
        
        const localParts = net.address.split('.');
        if (localParts[0] === clientParts[0] && 
            localParts[1] === clientParts[1] && 
            localParts[2] === clientParts[2]) {
          return net.address;
        }
        
        if (localParts[0] === clientParts[0] && 
            localParts[1] === clientParts[1]) {
          bestMatch = net.address;
        }
      }
    }
  }
  
  return bestMatch || firstIp || '127.0.0.1';
}

function checkIsAdmin() {
  return new Promise((resolve) => {
    exec('net session', (err) => {
      resolve(!err);
    });
  });
}

const { FileSystem } = FtpSrv;

class ProgressFileSystem extends FileSystem {
  constructor(connection, options, logFn) {
    super(connection, options);
    this.connection = connection;
    this.logFn = logFn;
  }

  write(fileName, options) {
    const result = super.write(fileName, options);
    const { stream, clientPath } = result;
    const log = this.logFn;
    const baseName = path.basename(fileName);
    let bytesWritten = 0;
    
    const originalWrite = stream.write;
    stream.write = function(chunk, encoding, cb) {
      bytesWritten += chunk.length;
      const formattedRecv = (bytesWritten / (1024 * 1024)).toFixed(2);
      // Log progress on start and every 1MB
      if (bytesWritten === chunk.length || bytesWritten % (1024 * 1024) === 0) {
        log(`Receiving '${baseName}': ${formattedRecv}MB received`);
      }
      return originalWrite.call(stream, chunk, encoding, cb);
    };

    const originalEnd = stream.end;
    stream.end = function(chunk, encoding, cb) {
      if (chunk) {
        bytesWritten += chunk.length;
      }
      const formattedRecv = (bytesWritten / (1024 * 1024)).toFixed(2);
      log(`Successfully saved file: ${baseName} (${formattedRecv}MB)`);
      return originalEnd.call(stream, chunk, encoding, cb);
    };

    return result;
  }

  read(fileName, options) {
    const log = this.logFn;
    const baseName = path.basename(fileName);
    
    return super.read(fileName, options)
    .then((result) => {
      const { stream, clientPath } = result;

      let totalBytes = 0;
      try {
        const absolutePath = this._resolvePath(fileName).fsPath;
        totalBytes = fs.statSync(absolutePath).size;
      } catch (e) {
        // Ignored
      }

      const { PassThrough } = require('stream');
      const passThrough = new PassThrough();

      let bytesRead = 0;
      let lastLoggedPercent = -10;

      passThrough.on('data', (chunk) => {
        bytesRead += chunk.length;
        if (totalBytes > 0) {
          const percent = Math.floor((bytesRead / totalBytes) * 100);
          if (percent >= lastLoggedPercent + 10 || bytesRead === totalBytes) {
            lastLoggedPercent = percent;
            const formattedTotal = (totalBytes / (1024 * 1024)).toFixed(2);
            const formattedSent = (bytesRead / (1024 * 1024)).toFixed(2);
            log(`Sending '${baseName}': ${percent}% (${formattedSent}MB / ${formattedTotal}MB)`);
          }
        } else {
          const formattedSent = (bytesRead / (1024 * 1024)).toFixed(2);
          log(`Sending '${baseName}': ${formattedSent}MB sent`);
        }
      });

      passThrough.on('end', () => {
        log(`Successfully sent file: ${baseName}`);
      });

      stream.on('error', (err) => passThrough.emit('error', err));
      stream.pipe(passThrough);

      return {
        stream: passThrough,
        clientPath
      };
    });
  }
}

class ServersManager {
  constructor() {
    this.instances = {
      http: null,
      https: null,
      ftp: null,
      tftp: null
    };
    this.configs = {
      http: null,
      https: null,
      ftp: null,
      tftp: null
    };
    this.io = null;
  }

  setIo(io) {
    this.io = io;
  }

  log(type, message) {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[QuickServer - ${type.toUpperCase()}] [${timestamp}] ${message}`);
    if (this.io) {
      this.io.emit('quick-server-log', { type, message, timestamp });
    }
  }

  emitStatus(type) {
    if (this.io) {
      const isRunning = !!this.instances[type];
      const port = this.configs[type] ? this.configs[type].port : null;
      this.io.emit('quick-server-status-update', {
        type,
        running: isRunning,
        port
      });
    }
  }

  getStatus() {
    const status = {};
    for (const type of ['http', 'https', 'ftp', 'tftp']) {
      status[type] = {
        running: !!this.instances[type],
        port: this.configs[type] ? this.configs[type].port : null,
        rootDir: this.configs[type] ? this.configs[type].rootDir : null
      };
    }
    return status;
  }

  async startServer(type, config) {
    if (this.instances[type]) {
      throw new Error(`${type.toUpperCase()} server is already running.`);
    }

    const port = parseInt(config.port, 10);
    const rootDir = config.rootDir;

    if (!rootDir || !fs.existsSync(rootDir)) {
      throw new Error(`Invalid root directory: ${rootDir || 'Not specified'}`);
    }

    this.configs[type] = { port, rootDir };
    this.log(type, `Starting server on port ${port} with root directory: ${rootDir}`);

    try {
      if (type === 'http') {
        await this._startHttp(port, rootDir);
      } else if (type === 'https') {
        await this._startHttps(port, rootDir, config);
      } else if (type === 'ftp') {
        await this._startFtp(port, rootDir, config);
      } else if (type === 'tftp') {
        await this._startTftp(port, rootDir);
      }

      this.log(type, `${type.toUpperCase()} server successfully started on port ${port}.`);
      this.emitStatus(type);
    } catch (err) {
      this.configs[type] = null;
      this.instances[type] = null;
      this.log(type, `Failed to start server: ${err.message}`);
      this.emitStatus(type);
      throw err;
    }
  }

  stopServer(type) {
    const server = this.instances[type];
    if (!server) {
      this.log(type, `Server is not running.`);
      return;
    }

    this.log(type, `Stopping server...`);
    try {
      if (type === 'http' || type === 'https') {
        server.close(() => {
          this.log(type, `Server stopped.`);
        });
      } else if (type === 'ftp') {
        server.close().then(() => {
          this.log(type, `Server stopped.`);
        });
      } else if (type === 'tftp') {
        server.close();
        this.log(type, `Server stopped.`);
      }
    } catch (err) {
      this.log(type, `Error during shutdown: ${err.message}`);
    }

    this.instances[type] = null;
    this.configs[type] = null;
    this.emitStatus(type);
  }

  _startHttp(port, rootDir) {
    return new Promise((resolve, reject) => {
      try {
        const app = express();

        // Simple request logger middleware
        app.use((req, res, next) => {
          this.log('http', `Request: ${req.method} ${req.url} from ${req.ip}`);
          next();
        });

        app.use(express.static(rootDir));

        const server = http.createServer(app);
        
        server.on('error', (err) => {
          reject(err);
        });

        server.listen(port, '0.0.0.0', () => {
          this.instances.http = server;
          resolve();
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  _startHttps(port, rootDir, config) {
    return new Promise(async (resolve, reject) => {
      try {
        let options = {};

        if (config.useSelfSigned) {
          this.log('https', 'Generating dynamic self-signed certificate...');
          const pems = await selfsigned.generate([
            { name: 'commonName', value: 'localhost' }
          ], {
            days: 365,
            keySize: 2048,
            algorithm: 'sha256',
            extensions: [{
              name: 'subjectAltName',
              altNames: [
                { type: 2, value: 'localhost' },
                { type: 7, ip: '127.0.0.1' }
              ]
            }]
          });
          options = {
            key: pems.private,
            cert: pems.cert
          };
          this.log('https', 'Self-signed certificate generated successfully.');
        } else {
          if (!config.keyPath || !config.certPath) {
            return reject(new Error('SSL Private Key and Certificate paths are required when not using self-signed certificate.'));
          }
          if (!fs.existsSync(config.keyPath) || !fs.existsSync(config.certPath)) {
            return reject(new Error('Specified SSL Key or Certificate file path does not exist.'));
          }
          options = {
            key: fs.readFileSync(config.keyPath),
            cert: fs.readFileSync(config.certPath)
          };
        }

        const app = express();
        app.use((req, res, next) => {
          this.log('https', `Secure Request: ${req.method} ${req.url} from ${req.ip}`);
          next();
        });

        app.use(express.static(rootDir));

        const server = https.createServer(options, app);
        
        server.on('error', (err) => {
          reject(err);
        });

        server.listen(port, '0.0.0.0', () => {
          this.instances.https = server;
          resolve();
        });
      } catch (err) {
        reject(err);
      }
    });
  }
  _startFtp(port, rootDir, config) {
    return new Promise((resolve, reject) => {
      try {
        const customLogger = {
          info: (data, msg) => {
            const text = msg || (typeof data === 'string' ? data : data.message);
            if (text && !text.includes('connection') && !text.includes('PASV')) {
              this.log('ftp', `[Info] ${text}`);
            }
          },
          warn: (data, msg) => {
            const text = msg || (typeof data === 'string' ? data : data.message);
            this.log('ftp', `[Warn] ${text}`);
          },
          error: (data, msg) => {
            const text = msg || (typeof data === 'string' ? data : data.message || (data.err && data.err.message));
            this.log('ftp', `[Error] ${text}`);
          },
          debug: (data, msg) => {
            if (data && data.command) {
              this.log('ftp', `<- ${data.command} ${data.params || ''}`);
            } else if (data && data.status) {
              this.log('ftp', `-> ${data.status} ${data.message || ''}`);
            } else {
              const text = msg || (typeof data === 'string' ? data : data.message);
              if (text && (text.includes('command') || text.includes('response') || text.includes('FTP'))) {
                this.log('ftp', `[Debug] ${text}`);
              }
            }
          },
          trace: () => {},
          child: () => customLogger
        };

        const ftpServer = new FtpSrv({
          url: `ftp://0.0.0.0:${port}`,
          log: customLogger,
          pasv_url: (remoteAddr) => {
            const resolved = getLocalIpForClient(remoteAddr);
            console.log(`[FTP] PASV requested by ${remoteAddr}. Resolved pasv_url to: ${resolved}`);
            return resolved;
          },
          pasv_min: 10000,
          pasv_max: 10005,
          anonymous: !config.username
        });

        ftpServer.on('login', ({ connection, username, password }, resolveLogin, rejectLogin) => {
          if (!config.username) {
            this.log('ftp', `Anonymous login from ${connection.ip}`);
            resolveLogin({ 
              root: rootDir,
              fs: new ProgressFileSystem(connection, { root: rootDir }, (msg) => this.log('ftp', msg))
            });
          } else if (username === config.username && password === config.password) {
            this.log('ftp', `User '${username}' logged in successfully from ${connection.ip}`);
            resolveLogin({ 
              root: rootDir,
              fs: new ProgressFileSystem(connection, { root: rootDir }, (msg) => this.log('ftp', msg))
            });
          } else {
            this.log('ftp', `Failed login attempt for user '${username}' from ${connection.ip}`);
            rejectLogin(new Error('Invalid username or password'));
          }
        });

        ftpServer.on('client-error', ({ connection, context, error }) => {
          this.log('ftp', `Client error from ${connection ? connection.ip : 'unknown'}: ${error.message} (Context: ${context})`);
        });

        ftpServer.listen()
          .then(() => {
            this.instances.ftp = ftpServer;
            resolve();
          })
          .catch((err) => {
            reject(err);
          });
      } catch (err) {
        reject(err);
      }
    });
  }

  _startTftp(port, rootDir) {
    return new Promise((resolve, reject) => {
      try {
        const server = tftp.createServer();

        server.on('get', async (req, send) => {
          const relativePath = req.filename.replace(/^\/+/, '');
          const filename = path.join(rootDir, relativePath);
          this.log('tftp', `Read request (RRQ) for file: ${req.filename}`);
          
          try {
            if (!fs.existsSync(filename)) {
              this.log('tftp', `Error: File not found: ${req.filename}`);
              req.error(1, 'File not found');
              return;
            }
            const data = fs.readFileSync(filename);

            // Set up progress tracking on the connection object
            req.transferType = 'read';
            req.totalBytes = data.length;
            req.sentBytes = 0;
            req.lastLoggedPercent = -10;
            req.onProgress = (sentBytes, totalBytes) => {
              const percent = Math.floor((sentBytes / totalBytes) * 100);
              const formattedTotal = (totalBytes / (1024 * 1024)).toFixed(2);
              const formattedSent = (sentBytes / (1024 * 1024)).toFixed(2);
              this.log('tftp', `Sending '${req.filename}': ${percent}% (${formattedSent}MB / ${formattedTotal}MB)`);
            };

            await send(data);
            this.log('tftp', `Successfully sent file: ${req.filename}`);
          } catch (err) {
            this.log('tftp', `Error transferring file '${req.filename}': ${err.message}`);
            req.error(0, err.message);
          }
        });

        server.on('put', async (req, readStream) => {
          const relativePath = req.filename.replace(/^\/+/, '');
          const filename = path.join(rootDir, relativePath);
          this.log('tftp', `Write request (WRQ) for file: ${req.filename}`);

          try {
            const buffer = [];
            let receivedBytes = 0;
            let lastLoggedPercent = -10;
            
            // Extract tsize option if present
            const totalBytes = req.options && req.options.tsize ? parseInt(req.options.tsize, 10) : 0;
            if (totalBytes > 0) {
              const formattedTotal = (totalBytes / (1024 * 1024)).toFixed(2);
              this.log('tftp', `File size negotiated via tsize: ${formattedTotal}MB`);
            }

            readStream(
              (chunk) => {
                buffer.push(chunk);
                receivedBytes += chunk.length;
                
                if (totalBytes > 0) {
                  const percent = Math.floor((receivedBytes / totalBytes) * 100);
                  if (percent >= lastLoggedPercent + 10 || receivedBytes === totalBytes) {
                    lastLoggedPercent = percent;
                    const formattedTotal = (totalBytes / (1024 * 1024)).toFixed(2);
                    const formattedRecv = (receivedBytes / (1024 * 1024)).toFixed(2);
                    this.log('tftp', `Receiving '${req.filename}': ${percent}% (${formattedRecv}MB / ${formattedTotal}MB)`);
                  }
                } else {
                  // If size is unknown, log every 1000 blocks (approx 500KB)
                  if (buffer.length === 1 || buffer.length % 1000 === 0) {
                    const formattedRecv = (receivedBytes / (1024 * 1024)).toFixed(2);
                    this.log('tftp', `Receiving '${req.filename}': ${formattedRecv}MB received`);
                  }
                }
              },
              () => {
                try {
                  fs.mkdirSync(path.dirname(filename), { recursive: true });
                  fs.writeFileSync(filename, Buffer.concat(buffer));
                  this.log('tftp', `Successfully saved file: ${req.filename}`);
                } catch (err) {
                  this.log('tftp', `Error saving file '${req.filename}': ${err.message}`);
                  req.error(0, err.message);
                }
              }
            );
          } catch (err) {
            this.log('tftp', `Error receiving file '${req.filename}': ${err.message}`);
            req.error(0, err.message);
          }
        });

        server.on('error', (err) => {
          this.log('tftp', `Server error: ${err.message}`);
        });

        server.listen(port);
        this.instances.tftp = server;
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  }

  stopAll() {
    for (const type of ['http', 'https', 'ftp', 'tftp']) {
      if (this.instances[type]) {
        this.stopServer(type);
      }
    }
  }
}

module.exports = {
  checkIsAdmin,
  serversManager: new ServersManager()
};
