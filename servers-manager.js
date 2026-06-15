const { exec } = require('child_process');
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const express = require('express');
const FtpSrv = require('ftp-srv');
const tftp = require('tftp2');
const selfsigned = require('selfsigned');

function checkIsAdmin() {
  return new Promise((resolve) => {
    exec('net session', (err) => {
      resolve(!err);
    });
  });
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
    this.socket = null;
  }

  setSocket(socket) {
    this.socket = socket;
  }

  log(type, message) {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[QuickServer - ${type.toUpperCase()}] [${timestamp}] ${message}`);
    if (this.socket) {
      this.socket.emit('quick-server-log', { type, message, timestamp });
    }
  }

  emitStatus(type) {
    if (this.socket) {
      const isRunning = !!this.instances[type];
      const port = this.configs[type] ? this.configs[type].port : null;
      this.socket.emit('quick-server-status-update', {
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
    return new Promise((resolve, reject) => {
      try {
        let options = {};

        if (config.useSelfSigned) {
          this.log('https', 'Generating dynamic self-signed certificate...');
          const pems = selfsigned.generate([{ name: 'commonName', value: '127.0.0.1' }], { days: 365 });
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
        const ftpServer = new FtpSrv({
          url: `ftp://0.0.0.0:${port}`,
          pasv_url: '127.0.0.1',
          pasv_min: 10000,
          pasv_max: 10005,
          anonymous: !config.username
        });

        ftpServer.on('login', ({ connection, username, password }, resolveLogin, rejectLogin) => {
          if (!config.username) {
            this.log('ftp', `Anonymous login from ${connection.ip}`);
            resolveLogin({ root: rootDir });
          } else if (username === config.username && password === config.password) {
            this.log('ftp', `User '${username}' logged in successfully from ${connection.ip}`);
            resolveLogin({ root: rootDir });
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
            readStream(
              (chunk) => buffer.push(chunk),
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
