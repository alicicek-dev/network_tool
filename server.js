const express = require('express');
const { checkIsAdmin, serversManager } = require('./servers-manager');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const ping = require('ping');
const { SerialPort } = require('serialport');
const net = require('net');

// Monkeypatch crypto.getDiffieHellman to support legacy DH groups (modp1, modp2, modp5)
// on platforms where BoringSSL (bundled in Electron) does not support them natively.
const crypto = require('crypto');

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

class BigIntDiffieHellman {
  constructor(primeBuffer, generatorBuffer) {
    this.primeHex = primeBuffer.toString('hex');
    this.prime = BigInt('0x' + this.primeHex);
    this.generator = BigInt(generatorBuffer[0]);
    this.pubKey = null;
    this.privKey = null;
  }

  generateKeys() {
    const byteLength = Buffer.from(this.primeHex, 'hex').length;
    let priv;
    do {
      priv = BigInt('0x' + crypto.randomBytes(byteLength).toString('hex'));
    } while (priv >= this.prime || priv <= 1n);

    this.privKey = priv;
    this.pubKey = this._modPow(this.generator, this.privKey, this.prime);
    return this.getPublicKey();
  }

  getPublicKey() {
    return this._toBuffer(this.pubKey);
  }

  getPrivateKey() {
    return this._toBuffer(this.privKey);
  }

  computeSecret(otherPublicKeyBuffer) {
    const B = BigInt('0x' + otherPublicKeyBuffer.toString('hex'));
    const secret = this._modPow(B, this.privKey, this.prime);
    return this._toBuffer(secret);
  }

  getPrime() {
    return Buffer.from(this.primeHex, 'hex');
  }

  getGenerator() {
    return Buffer.from([Number(this.generator)]);
  }

  _modPow(b, e, m) {
    let result = 1n;
    b = b % m;
    while (e > 0n) {
      if (e & 1n) {
        result = (result * b) % m;
      }
      e = e >> 1n;
      b = (b * b) % m;
    }
    return result;
  }

  _toBuffer(bigint) {
    let hex = bigint.toString(16);
    if (hex.length % 2 !== 0) hex = '0' + hex;
    const targetLen = Buffer.from(this.primeHex, 'hex').length;
    let buf = Buffer.from(hex, 'hex');
    if (buf.length < targetLen) {
      const padded = Buffer.alloc(targetLen);
      buf.copy(padded, targetLen - buf.length);
      return padded;
    }
    return buf;
  }
}

const originalGetDiffieHellman = crypto.getDiffieHellman;
crypto.getDiffieHellman = function(groupName) {
  const primes = {
    modp1: 'ffffffffffffffffc90fdaa22168c234c4c6628b80dc1cd129024e088a67cc74020bbea63b139b22514a08798e3404ddef9519b3cd3a431b302b0a6df25f14374fe1356d6d51c245e485b576625e7ec6f44c42e9a63a3620ffffffffffffffff',
    modp2: 'ffffffffffffffffc90fdaa22168c234c4c6628b80dc1cd129024e088a67cc74020bbea63b139b22514a08798e3404ddef9519b3cd3a431b302b0a6df25f14374fe1356d6d51c245e485b576625e7ec6f44c42e9a637ed6b0bff5cb6f406b7edee386bfb5a899fa5ae9f24117c4b1fe649286651ece65381ffffffffffffffff',
    modp5: 'ffffffffffffffffc90fdaa22168c234c4c6628b80dc1cd129024e088a67cc74020bbea63b139b22514a08798e3404ddef9519b3cd3a431b302b0a6df25f14374fe1356d6d51c245e485b576625e7ec6f44c42e9a637ed6b0bff5cb6f406b7edee386bfb5a899fa5ae9f24117c4b1fe649286651ece45b3dc2007cb8a163bf0598da48361c55d39a69163fa8fd24cf5f83655d23dca3ad961c62f356208552bb9ed529077096966d670c354e4abc9804f1746c08ca237327ffffffffffffffff',
    modp14: 'ffffffffffffffffc90fdaa22168c234c4c6628b80dc1cd129024e088a67cc74020bbea63b139b22514a08798e3404ddef9519b3cd3a431b302b0a6df25f14374fe1356d6d51c245e485b576625e7ec6f44c42e9a637ed6b0bff5cb6f406b7edee386bfb5a899fa5ae9f24117c4b1fe649286651ece45b3dc2007cb8a163bf0598da48361c55d39a69163fa8fd24cf5f83655d23dca3ad961c62f356208552bb9ed529077096966d670c354e4abc9804f1746c08ca18217c32905e462e36ce3be39e772c180e86039b2783a2ec07a28fb5c55df06f4c52c9de2bcbf6955817183995497cea956ae515d2261898fa051015728e5a8aacaa68ffffffffffffffff'
  };
  if (primes[groupName]) {
    return new BigIntDiffieHellman(Buffer.from(primes[groupName], 'hex'), Buffer.from([2]));
  }
  return originalGetDiffieHellman.call(crypto, groupName);
};
crypto.createDiffieHellmanGroup = crypto.getDiffieHellman;

const { Client } = require('ssh2');
const wol = require('wake_on_lan');
const os = require('os');
const { spawn } = require('child_process');
const dns = require('dns');
const whois = require('whois-json');
const https = require('https');

const app = express();
app.use(cors());
app.use(express.json());
const server = http.createServer(app);
server.on('connection', (socket) => {
  socket.setNoDelay(true);
});
const io = new Server(server, {
  cors: { origin: '*' }
});
serversManager.setIo(io);

app.get('/api/interfaces', async (req, res) => {
  const nets = os.networkInterfaces();
  const results = [];
  
  let gateway = "Unknown";
  try {
    if (process.platform === 'win32') {
      const util = require('util');
      const exec = util.promisify(require('child_process').exec);
      const { stdout } = await exec('powershell.exe -Command "(Get-NetRoute -DestinationPrefix 0.0.0.0/0 -ErrorAction SilentlyContinue | Sort-Object RouteMetric | Select-Object -First 1).NextHop"', { encoding: 'utf8' });
      gateway = stdout.trim() || "Unknown";
    }
  } catch (e) {
    // Ignore error
  }

  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        results.push({ name, ip: net.address, mac: net.mac, gateway });
      }
    }
  }
  res.json(results);
});

app.post('/api/wol', (req, res) => {
  const { mac } = req.body;
  if (!mac) return res.status(400).json({ error: 'MAC address is required' });
  
  wol.wake(mac, (error) => {
    if (error) {
      res.status(500).json({ error: error.message });
    } else {
      res.json({ success: true, message: `Magic packet sent to ${mac}` });
    }
  });
});

app.get('/api/mac/:mac', async (req, res) => {
  try {
    const response = await fetch(`https://api.macvendors.com/${req.params.mac}`);
    if (response.ok) {
      const vendor = await response.text();
      res.json({ vendor });
    } else {
      res.status(404).json({ error: 'Not Found' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Query error' });
  }
});

app.get('/api/dns/:domain', (req, res) => {
  dns.resolveAny(req.params.domain, (err, records) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(records);
  });
});

app.get('/api/whois/:domain', async (req, res) => {
  try {
    const results = await whois(req.params.domain);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/arp', (req, res) => {
  try {
    const isWin = process.platform === 'win32';
    const cmd = isWin ? 'arp -a' : 'arp -a';
    require('child_process').exec(cmd, (err, stdout) => {
      if (err) return res.status(500).json({ error: err.message });
      const lines = stdout.split('\n');
      const results = [];
      lines.forEach(line => {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 3 && parts[0].match(/^\d+\.\d+\.\d+\.\d+$/)) {
          results.push({ ip: parts[0], mac: parts[1], type: parts[2] });
        }
      });
      res.json(results);
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

function getMacForIp(ip) {
  return new Promise((resolve) => {
    const isWin = process.platform === 'win32';
    const cmd = isWin ? `arp -a ${ip}` : `arp -n ${ip}`;
    require('child_process').exec(cmd, (err, stdout) => {
      if (err || !stdout) {
        return resolve('N/A');
      }
      const lines = stdout.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        const macMatch = trimmed.match(/([0-9a-fA-F]{2}[:-]){5}([0-9a-fA-F]{2})/);
        if (macMatch) {
          return resolve(macMatch[0]);
        }
      }
      resolve('N/A');
    });
  });
}

app.get('/api/ports', async (req, res) => {
  try {
    const ports = await SerialPort.list();
    res.json(ports);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/is-admin', async (req, res) => {
  try {
    const isAdmin = await checkIsAdmin();
    res.json({ isAdmin });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  let activeTerminal = null;

  // --- QUICK FILE SERVERS FEATURE ---
  // Expose current status immediately
  socket.emit('quick-server-status-all', serversManager.getStatus());

  socket.on('quick-server-start', async ({ type, config }) => {
    try {
      await serversManager.startServer(type, config);
      socket.emit('quick-server-start-success', { type });
    } catch (err) {
      socket.emit('quick-server-start-error', { type, error: err.message });
    }
  });

  socket.on('quick-server-stop', (type) => {
    try {
      serversManager.stopServer(type);
      socket.emit('quick-server-stop-success', { type });
    } catch (err) {
      socket.emit('quick-server-stop-error', { type, error: err.message });
    }
  });

  socket.on('quick-server-get-status', () => {
    socket.emit('quick-server-status-all', serversManager.getStatus());
  });

  // --- PING FEATURE ---
  let pingInterval;
  let pingActive = false;
  socket.on('start-ping', (target) => {
    pingActive = true;
    if (pingInterval) clearTimeout(pingInterval);
    socket.emit('terminal-data', `\r\nStarting ping to ${target}...\r\n`);
    let seq = 0;

    const doPing = async () => {
      if (!pingActive) return;
      seq++;
      const startTime = Date.now();
      try {
        let res = await ping.promise.probe(target, { timeout: 2 });
        if (!pingActive) return;
        if (res.alive) {
          socket.emit('terminal-data', `Reply from ${res.numeric_host}: time=${res.time}ms TTL=${res.ttl || 'N/A'}\r\n`);
          socket.emit('ping-stat', { seq, alive: true, time: res.time, host: res.numeric_host });
        } else {
          socket.emit('terminal-data', `Request timed out.\r\n`);
          socket.emit('ping-stat', { seq, alive: false, time: null });
        }
      } catch (err) {
        if (!pingActive) return;
        socket.emit('terminal-data', `Ping error: ${err.message}\r\n`);
        socket.emit('ping-stat', { seq, alive: false, time: null });
      }

      const elapsed = Date.now() - startTime;
      const delay = Math.max(0, 1000 - elapsed);
      if (pingActive) {
        pingInterval = setTimeout(doPing, delay);
      }
    };

    doPing();
  });

  socket.on('stop-ping', () => {
    pingActive = false;
    if (pingInterval) {
      clearTimeout(pingInterval);
      pingInterval = null;
    }
  });

  // --- MULTI-PING FEATURE ---
  let multiPingInterval = null;
  let multiPingActive = false;
  socket.on('start-multi-ping', (targets) => {
    multiPingActive = true;
    if (multiPingInterval) clearTimeout(multiPingInterval);
    
    let seqs = {};
    targets.forEach(t => seqs[t] = 0);

    const doMultiPing = async () => {
      if (!multiPingActive) return;
      const startTime = Date.now();

      try {
        const promises = targets.map(async (target) => {
          seqs[target]++;
          try {
            let res = await ping.promise.probe(target, { timeout: 2 });
            if (!multiPingActive) return;
            if (res.alive) {
              socket.emit('multi-ping-stat', {
                target,
                seq: seqs[target],
                alive: true,
                time: res.time,
                host: res.numeric_host,
                ttl: res.ttl || 'N/A'
              });
            } else {
              socket.emit('multi-ping-stat', {
                target,
                seq: seqs[target],
                alive: false,
                time: null,
                host: 'N/A',
                ttl: 'N/A'
              });
            }
          } catch (err) {
            if (!multiPingActive) return;
            socket.emit('multi-ping-stat', {
              target,
              seq: seqs[target],
              alive: false,
              time: null,
              host: 'N/A',
              ttl: 'N/A',
              error: err.message
            });
          }
        });

        await Promise.all(promises);
      } catch (err) {
        console.error('Multi-ping execution error:', err);
      }

      const elapsed = Date.now() - startTime;
      const delay = Math.max(0, 2000 - elapsed);
      if (multiPingActive) {
        multiPingInterval = setTimeout(doMultiPing, delay);
      }
    };

    doMultiPing();
  });

  socket.on('stop-multi-ping', () => {
    multiPingActive = false;
    if (multiPingInterval) {
      clearTimeout(multiPingInterval);
      multiPingInterval = null;
    }
  });

  // --- TRACEROUTE FEATURE ---
  let traceProcess = null;
  socket.on('start-trace', (target) => {
    if (traceProcess) traceProcess.kill();
    socket.emit('terminal-data', `\r\nStarting traceroute to ${target}...\r\n`);
    
    const isWin = process.platform === 'win32';
    const cmd = isWin ? 'tracert' : 'traceroute';
    const args = isWin ? ['-d', target] : ['-n', target];
    
    traceProcess = spawn(cmd, args);
    
    traceProcess.stdout.on('data', (data) => {
      let str = data.toString().replace(/\n/g, '\r\n').replace(/\r\r\n/g, '\r\n');
      socket.emit('terminal-data', str);
    });
    traceProcess.stderr.on('data', (data) => {
      socket.emit('terminal-data', data.toString().replace(/\n/g, '\r\n'));
    });
    traceProcess.on('close', (code) => {
      socket.emit('terminal-data', `\r\nTrace complete.\r\n`);
      traceProcess = null;
    });
  });

  socket.on('stop-trace', () => {
    if (traceProcess) traceProcess.kill();
  });

  // --- SERIAL FEATURE ---
  let currentSerialPort = null;
  socket.on('connect-serial', ({ path, baudRate }) => {
    activeTerminal = 'serial';
    if (currentSerialPort) {
      currentSerialPort.removeAllListeners();
      if (currentSerialPort.isOpen) currentSerialPort.close((err) => {});
    }
    socket.emit('terminal-data', `\r\nConnecting to ${path} at ${baudRate} baud...\r\n`);
    
    currentSerialPort = new SerialPort({ path, baudRate: parseInt(baudRate) || 9600 }, (err) => {
      if (err) {
        socket.emit('terminal-data', `\r\nError: ${err.message}\r\n`);
      } else {
        socket.emit('terminal-data', `\r\nConnected to ${path}.\r\n`);
      }
    });

    currentSerialPort.on('data', (data) => {
      socket.emit('terminal-data', data.toString());
    });
    
    currentSerialPort.on('error', (err) => {
      socket.emit('terminal-data', `\r\nSerial Error: ${err.message}\r\n`);
    });

    currentSerialPort.on('close', () => {
      socket.emit('terminal-data', `\r\nSerial connection closed.\r\n`);
      currentSerialPort = null;
    });
  });

  socket.on('disconnect-serial', () => {
    if (currentSerialPort) {
      currentSerialPort.removeAllListeners();
      if (currentSerialPort.isOpen) currentSerialPort.close((err) => {});
      currentSerialPort = null;
      socket.emit('terminal-data', `\r\nDisconnected.\r\n`);
    }
  });

  // --- SSH FEATURE ---
  let sshClient = null;
  let sshStream = null;
  let currentSweepId = 0;
  socket.on('start-sweep', async (subnet) => {
    currentSweepId++;
    const mySweepId = currentSweepId;
    const batchSize = 30;
    const ips = [];
    for (let i = 1; i <= 254; i++) {
      ips.push(`${subnet}.${i}`);
    }

    for (let i = 0; i < ips.length; i += batchSize) {
      if (!socket.connected || mySweepId !== currentSweepId) break;
      const batch = ips.slice(i, i + batchSize);
      await Promise.all(batch.map(ip => {
        return ping.promise.probe(ip, { timeout: 1 })
          .then(async (res) => {
            if (mySweepId !== currentSweepId || !socket.connected) return;
            if (res.alive) {
              const mac = await getMacForIp(res.host);
              if (mySweepId !== currentSweepId || !socket.connected) return;
              socket.emit('sweep-result', { ip: res.host, time: res.time, mac });
            }
          })
          .catch(() => {});
      }));
    }

    if (socket.connected && mySweepId === currentSweepId) {
      socket.emit('sweep-complete');
    }
  });

  socket.on('stop-sweep', () => {
    currentSweepId++;
  });

  // --- PORT SCANNER ---
  let currentPortScanId = 0;
  socket.on('start-port-scan', async ({ host, ports }) => {
    currentPortScanId++;
    const myPortScanId = currentPortScanId;
    const chunkSize = 100;
    for (let i = 0; i < ports.length; i += chunkSize) {
      if (!socket.connected || myPortScanId !== currentPortScanId) break;
      const chunk = ports.slice(i, i + chunkSize);
      await Promise.all(chunk.map(port => {
        return new Promise((resolve) => {
          if (myPortScanId !== currentPortScanId || !socket.connected) {
            resolve();
            return;
          }
          const s = new net.Socket();
          s.setTimeout(2000);
          
          let resolved = false;
          const done = (status) => {
            if (resolved) return;
            resolved = true;
            if (socket.connected && myPortScanId === currentPortScanId) {
              socket.emit('port-scan-result', { port, status });
            }
            s.destroy();
            resolve();
          };

          s.on('connect', () => done('open'));
          s.on('timeout', () => done('filtered'));
          s.on('error', () => done('closed'));
          s.connect(port, host);
        });
      }));
    }
  });

  socket.on('stop-port-scan', () => {
    currentPortScanId++;
  });

  // --- SPEED TEST ---
  socket.on('start-speedtest', async () => {
    try {
      socket.emit('speedtest-update', { phase: 'ping', progress: 0 });
      const startPing = Date.now();
      https.get('https://speed.cloudflare.com/__down?bytes=0', (res) => {
        res.on('data', () => {});
        res.on('end', () => {
          const pingTime = Date.now() - startPing;
          socket.emit('speedtest-update', { phase: 'ping', result: pingTime, progress: 100 });
          
          socket.emit('speedtest-update', { phase: 'download', progress: 0 });
          const dlStart = Date.now();
          let dlBytes = 0;
          let dlLastBytes = 0;
          let dlLastUpdate = dlStart;
          let dlFinalMbps = 0;
          let isDownloading = true;
          let activeDlStreams = 0;
          const dlReqs = [];
          
          function updateDl() {
            const now = Date.now();
            const elapsed = (now - dlStart) / 1000;
            const deltaT = (now - dlLastUpdate) / 1000;
            if (deltaT >= 0.25) {
              const instantMbps = (((dlBytes - dlLastBytes) * 8) / deltaT) / 1000000;
              dlLastBytes = dlBytes;
              dlLastUpdate = now;
              
              if (elapsed > 1) { // Ignore first second for stabilization
                dlFinalMbps = Math.max(dlFinalMbps, instantMbps);
              }
              
              const progress = Math.min(99, (elapsed / 10) * 100);
              // Test sirasinda anlik hizi goster
              socket.emit('speedtest-update', { phase: 'download', result: instantMbps.toFixed(2), progress });
            }
            if (elapsed >= 10 && isDownloading) {
              isDownloading = false;
              dlReqs.forEach(req => req.destroy());
              // Test bitince elde edilen en yuksek hizi gonder
              socket.emit('speedtest-update', { phase: 'download', result: dlFinalMbps.toFixed(2), progress: 100 });
              startUploadTest();
            }
          }

          function spawnDlStream() {
            if (!isDownloading) return;
            activeDlStreams++;
            const req = https.get('https://speed.cloudflare.com/__down?bytes=50000000', {
              headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
            }, (resDl) => {
              resDl.on('data', (chunk) => {
                if (!isDownloading) return;
                dlBytes += chunk.length;
                updateDl();
              });
              resDl.on('end', () => {
                activeDlStreams--;
                if (isDownloading) spawnDlStream();
              });
            });
            req.on('error', () => {
              activeDlStreams--;
              if (isDownloading) spawnDlStream();
            });
            dlReqs.push(req);
          }

          // Spawn 4 parallel download streams to saturate connection
          for(let i=0; i<4; i++) spawnDlStream();
          
          function startUploadTest() {
            socket.emit('speedtest-update', { phase: 'upload', progress: 0 });
            const upStart = Date.now();
            let upBytes = 0;
            let upLastBytes = 0;
            let upLastUpdate = upStart;
            let upFinalMbps = 0;
            
            const reqUp = https.request('https://speed.cloudflare.com/__up', { 
              method: 'POST',
              headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
            }, (resUp) => {
              resUp.on('data', ()=>{});
              resUp.on('end', () => {
                socket.emit('speedtest-update', { phase: 'upload', result: upFinalMbps.toFixed(2), progress: 100 });
                socket.emit('speedtest-complete', { ping: pingTime, download: dlFinalMbps.toFixed(2), upload: upFinalMbps.toFixed(2) });
              });
            });
            
            const chunk = Buffer.alloc(1024 * 1024, '0'); // 1MB chunk
            let isUploading = true;
            function writeChunk() {
              if (!isUploading) return;
              const now = Date.now();
              const elapsed = (now - upStart) / 1000;
              const deltaT = (now - upLastUpdate) / 1000;
              
              if (deltaT >= 0.25) {
                const instantMbps = (((upBytes - upLastBytes) * 8) / deltaT) / 1000000;
                upLastBytes = upBytes;
                upLastUpdate = now;
                
                if (elapsed > 1) { // Ignore first second
                  upFinalMbps = Math.max(upFinalMbps, instantMbps);
                }
                
                const progress = Math.min(99, (elapsed / 10) * 100);
                // Test sirasinda anlik hizi goster
                socket.emit('speedtest-update', { phase: 'upload', result: instantMbps.toFixed(2), progress });
              }
              
              if (elapsed >= 10) {
                isUploading = false;
                reqUp.end();
              } else {
                const canWrite = reqUp.write(chunk);
                upBytes += chunk.length;
                if (canWrite) {
                  setImmediate(writeChunk);
                } else {
                  reqUp.once('drain', writeChunk);
                }
              }
            }
            writeChunk();
          }
        });
      }).on('error', (err) => socket.emit('speedtest-error', { error: err.message }));
    } catch (err) {
      socket.emit('speedtest-error', { error: err.message });
    }
  });

  socket.on('connect-ssh', ({ host, port, username, password, cols, rows }) => {
    activeTerminal = 'ssh';
    if (sshClient) sshClient.end();
    
    socket.emit('terminal-data', `\r\nConnecting to ${username}@${host}:${port}...\r\n`);
    sshClient = new Client();
    
    sshClient.on('ready', () => {
      sshClient.setNoDelay(true);
      socket.emit('terminal-data', `\r\nSSH Connected. Starting shell...\r\n`);
      sshClient.shell({
        term: 'xterm-256color',
        cols: cols || 100,
        rows: rows || 30
      }, (err, stream) => {
        if (err) {
          socket.emit('terminal-data', `\r\nShell error: ${err.message}\r\n`);
          return;
        }
        sshStream = stream;

        stream.on('close', () => {
          socket.emit('terminal-data', `\r\nSSH stream closed.\r\n`);
          sshStream = null;
          if (sshClient) sshClient.end();
        }).on('data', (data) => {
          socket.emit('terminal-data', data.toString('utf-8'));
        });
      });
    }).on('error', (err) => {
      socket.emit('terminal-data', `\r\nSSH Error: ${err.message}\r\n`);
    }).on('keyboard-interactive', (name, instructions, instructionsLang, prompts, finish) => {
      socket.emit('terminal-data', `\r\n[System] Attempting keyboard-interactive authentication...\r\n`);
      const answers = prompts.map(p => {
        const lower = p.prompt.toLowerCase();
        if (lower.includes('username')) {
          return username;
        }
        return password;
      });
      finish(answers);
    });

    try {
      sshClient.connect({
        host,
        port: parseInt(port) || 22,
        username,
        password,
        tryKeyboard: true,
        readyTimeout: 20000,
        algorithms: {
          kex: [
            'curve25519-sha256',
            'curve25519-sha256@libssh.org',
            'ecdh-sha2-nistp256',
            'ecdh-sha2-nistp384',
            'ecdh-sha2-nistp521',
            'diffie-hellman-group-exchange-sha256',
            'diffie-hellman-group-exchange-sha1',
            'diffie-hellman-group16-sha512',
            'diffie-hellman-group18-sha512',
            'diffie-hellman-group14-sha256',
            'diffie-hellman-group14-sha1',
            'diffie-hellman-group15-sha512',
            'diffie-hellman-group17-sha512',
            'diffie-hellman-group1-sha1'
          ],
          cipher: [
            'aes256-gcm@openssh.com',
            'aes128-gcm@openssh.com',
            'aes256-gcm',
            'aes128-gcm',
            'aes128-ctr',
            'aes192-ctr',
            'aes256-ctr',
            'aes256-cbc',
            'aes192-cbc',
            'aes128-cbc',
            '3des-cbc'
          ],
          serverHostKey: [
            'ssh-ed25519',
            'ecdsa-sha2-nistp256',
            'ecdsa-sha2-nistp384',
            'ecdsa-sha2-nistp521',
            'rsa-sha2-256',
            'rsa-sha2-512',
            'ssh-rsa',
            'ssh-dss'
          ],
          hmac: [
            'hmac-sha2-256-etm@openssh.com',
            'hmac-sha2-512-etm@openssh.com',
            'hmac-sha1-etm@openssh.com',
            'hmac-sha2-256',
            'hmac-sha2-512',
            'hmac-sha1',
            'hmac-md5',
            'hmac-sha2-256-96',
            'hmac-sha2-512-96',
            'hmac-ripemd160',
            'hmac-sha1-96',
            'hmac-md5-96'
          ]
        }
      });
    } catch (connectErr) {
      socket.emit('terminal-data', `\r\nSSH Connection Init Error: ${connectErr.message}\r\n`);
    }
  });

  socket.on('disconnect-ssh', () => {
    sshStream = null;
    if (sshClient) {
      sshClient.end();
      sshClient = null;
    }
  });

  socket.on('terminal-resize', ({ cols, rows }) => {
    if (cols > 0 && rows > 0 && sshStream) {
      try {
        sshStream.setWindow(rows, cols, 0, 0);
      } catch (e) {
        console.error('Failed to resize SSH window:', e);
      }
    }
  });

  let telnetSocket = null;

  socket.on('connect-telnet', ({ host, port }) => {
    activeTerminal = 'telnet';
    if (telnetSocket) telnetSocket.destroy();
    
    socket.emit('terminal-data', `\r\nConnecting to Telnet host ${host}:${port}...\r\n`);
    telnetSocket = new net.Socket();
    
    telnetSocket.connect(parseInt(port) || 23, host, () => {
      socket.emit('terminal-data', `\r\nConnected to ${host}:${port}.\r\n`);
    });
    
    telnetSocket.on('data', (data) => {
      // Parse/strip telnet command options
      let buf = [];
      let i = 0;
      while (i < data.length) {
        if (data[i] === 255) { // IAC (255)
          if (i + 1 < data.length) {
            const cmd = data[i+1];
            if (cmd === 251 || cmd === 252 || cmd === 253 || cmd === 254) { // WILL, WONT, DO, DONT
              if (i + 2 < data.length) {
                const opt = data[i+2];
                // Respond WONT to DO, and DONT to WILL to refuse all options
                let respCmd = (cmd === 253) ? 252 : 254; // DO (253) -> WONT (252); WILL (251) -> DONT (254)
                telnetSocket.write(Buffer.from([255, respCmd, opt]));
                i += 3;
              } else {
                break;
              }
            } else if (cmd === 255) {
              buf.push(255);
              i += 2;
            } else {
              i += 2;
            }
          } else {
            break;
          }
        } else {
          buf.push(data[i]);
          i++;
        }
      }
      if (buf.length > 0) {
        socket.emit('terminal-data', Buffer.from(buf).toString('utf-8'));
      }
    });

    telnetSocket.on('close', () => {
      socket.emit('terminal-data', `\r\nTelnet connection closed.\r\n`);
      telnetSocket = null;
    });

    telnetSocket.on('error', (err) => {
      socket.emit('terminal-data', `\r\nTelnet Error: ${err.message}\r\n`);
    });
  });

  socket.on('disconnect-telnet', () => {
    if (telnetSocket) {
      telnetSocket.destroy();
      telnetSocket = null;
    }
  });

  // Universal terminal input router
  socket.on('terminal-input', (data) => {
    if (activeTerminal === 'serial' && currentSerialPort && currentSerialPort.isOpen) {
      currentSerialPort.write(data);
    }
    if (activeTerminal === 'ssh' && sshStream) {
      sshStream.write(data);
    }
    if (activeTerminal === 'telnet' && telnetSocket) {
      telnetSocket.write(data);
    }
  });

  socket.on('disconnect', () => {
    pingActive = false;
    multiPingActive = false;
    if (pingInterval) clearTimeout(pingInterval);
    if (multiPingInterval) clearTimeout(multiPingInterval);
    if (currentSerialPort) {
      currentSerialPort.removeAllListeners();
      if (currentSerialPort.isOpen) currentSerialPort.close((err) => {});
    }
    sshStream = null;
    if (sshClient) sshClient.end();
    if (telnetSocket) telnetSocket.destroy();
    
    // Cleanup trace process and port scan
    if (traceProcess) {
      traceProcess.kill();
      traceProcess = null;
    }
    if (typeof currentPortScanId !== 'undefined') {
      currentPortScanId++; // Aborts any ongoing port scans for this socket
    }
    
    console.log('Client disconnected:', socket.id);
  });
});

// Start backend on a dynamic port
server.listen(0, '127.0.0.1', () => {
  const address = server.address();
  const port = typeof address === 'string' ? 0 : address.port;
  console.log(`Backend server running on http://127.0.0.1:${port}`);
  if (process.send) {
    process.send({ type: 'port', port });
  }
});

process.on('SIGTERM', () => {
  serversManager.stopAll();
  process.exit(0);
});
process.on('SIGINT', () => {
  serversManager.stopAll();
  process.exit(0);
});
