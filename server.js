const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const ping = require('ping');
const { SerialPort } = require('serialport');

// Monkeypatch crypto.getDiffieHellman to support legacy DH groups (modp1, modp2, modp5)
// on platforms where BoringSSL (bundled in Electron) does not support them natively.
const crypto = require('crypto');

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
const io = new Server(server, {
  cors: { origin: '*' }
});

app.get('/api/interfaces', (req, res) => {
  const nets = os.networkInterfaces();
  const results = [];
  
  let gateway = "Unknown";
  try {
    if (process.platform === 'win32') {
      const out = require('child_process').execSync('powershell.exe -Command "(Get-NetRoute -DestinationPrefix 0.0.0.0/0 -ErrorAction SilentlyContinue | Sort-Object RouteMetric | Select-Object -First 1).NextHop"', {encoding: 'utf8'});
      gateway = out.trim() || "Unknown";
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
      res.status(404).json({ error: 'Bulunamadı' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Sorgu hatası' });
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

app.get('/api/ports', async (req, res) => {
  try {
    const ports = await SerialPort.list();
    res.json(ports);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // --- PING FEATURE ---
  let pingInterval;
  socket.on('start-ping', (target) => {
    if (pingInterval) clearInterval(pingInterval);
    socket.emit('terminal-data', `\r\nStarting ping to ${target}...\r\n`);
    let seq = 0;
    pingInterval = setInterval(async () => {
      seq++;
      try {
        let res = await ping.promise.probe(target, { timeout: 2 });
        if (res.alive) {
          socket.emit('terminal-data', `Reply from ${res.numeric_host}: time=${res.time}ms TTL=${res.ttl || 'N/A'}\r\n`);
          socket.emit('ping-stat', { seq, alive: true, time: res.time, host: res.numeric_host });
        } else {
          socket.emit('terminal-data', `Request timed out.\r\n`);
          socket.emit('ping-stat', { seq, alive: false, time: null });
        }
      } catch (err) {
        socket.emit('terminal-data', `Ping error: ${err.message}\r\n`);
        socket.emit('ping-stat', { seq, alive: false, time: null });
      }
    }, 1000);
  });

  socket.on('stop-ping', () => {
    if (pingInterval) clearInterval(pingInterval);
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
    if (currentSerialPort) currentSerialPort.close();
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
  });

  socket.on('disconnect-serial', () => {
    if (currentSerialPort) {
      currentSerialPort.close();
      currentSerialPort = null;
      socket.emit('terminal-data', `\r\nDisconnected.\r\n`);
    }
  });

  // --- SSH FEATURE ---
  let sshClient = null;
  socket.on('start-sweep', (subnet) => {
    for (let i = 1; i <= 254; i++) {
      const ip = `${subnet}.${i}`;
      ping.promise.probe(ip, { timeout: 1 }).then(res => {
        if (res.alive) {
          socket.emit('sweep-result', { ip: res.host, time: res.time });
        }
      }).catch(() => {});
    }
  });

  // --- PORT SCANNER ---
  socket.on('start-port-scan', ({ host, ports }) => {
    ports.forEach(port => {
      const s = new net.Socket();
      s.setTimeout(2000);
      s.on('connect', () => {
        socket.emit('port-scan-result', { port, status: 'open' });
        s.destroy();
      });
      s.on('timeout', () => {
        socket.emit('port-scan-result', { port, status: 'filtered' });
        s.destroy();
      });
      s.on('error', (e) => {
        socket.emit('port-scan-result', { port, status: 'closed' });
        s.destroy();
      });
      s.connect(port, host);
    });
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
            const req = https.get('https://speed.cloudflare.com/__down?bytes=100000000', {
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

  socket.on('connect-ssh', ({ host, port, username, password }) => {
    if (sshClient) sshClient.end();
    
    socket.emit('terminal-data', `\r\nConnecting to ${username}@${host}:${port}...\r\n`);
    sshClient = new Client();
    
    sshClient.on('ready', () => {
      socket.emit('terminal-data', `\r\nSSH Connected. Starting shell...\r\n`);
      sshClient.shell((err, stream) => {
        if (err) {
          socket.emit('terminal-data', `\r\nShell error: ${err.message}\r\n`);
          return;
        }
        
        socket.on('terminal-input', (data) => {
          stream.write(data);
        });

        stream.on('close', () => {
          socket.emit('terminal-data', `\r\nSSH stream closed.\r\n`);
          if (sshClient) sshClient.end();
        }).on('data', (data) => {
          socket.emit('terminal-data', data.toString('utf-8'));
        });
      });
    }).on('error', (err) => {
      socket.emit('terminal-data', `\r\nSSH Error: ${err.message}\r\n`);
    }).connect({
      host,
      port: parseInt(port) || 22,
      username,
      password,
      readyTimeout: 10000,
      algorithms: {
        kex: [
          'curve25519-sha256',
          'curve25519-sha256@libssh.org',
          'ecdh-sha2-nistp256',
          'ecdh-sha2-nistp384',
          'ecdh-sha2-nistp521',
          'diffie-hellman-group14-sha256',
          'diffie-hellman-group14-sha1',
          'diffie-hellman-group5-sha1',
          'diffie-hellman-group1-sha1'
        ],
        cipher: [
          'aes128-ctr',
          'aes192-ctr',
          'aes256-ctr',
          'aes128-gcm',
          'aes128-gcm@openssh.com',
          'aes256-gcm',
          'aes256-gcm@openssh.com',
          'aes256-cbc',
          'aes192-cbc',
          'aes128-cbc',
          '3des-cbc'
        ],
        serverHostKey: [
          'ssh-rsa',
          'ssh-dss',
          'ecdsa-sha2-nistp256',
          'ecdsa-sha2-nistp384',
          'ecdsa-sha2-nistp521',
          'ssh-ed25519'
        ],
        hmac: [
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
  });

  socket.on('disconnect-ssh', () => {
    if (sshClient) {
      sshClient.end();
      sshClient = null;
    }
  });

  // Universal terminal input router
  socket.on('terminal-input', (data) => {
    if (currentSerialPort && currentSerialPort.isOpen) {
      currentSerialPort.write(data);
    }
    // ssh input is handled inside the ssh ready callback because of scope, 
    // but we can route it here if we want. Currently it's attached inside sshClient.shell
  });

  socket.on('disconnect', () => {
    if (pingInterval) clearInterval(pingInterval);
    if (currentSerialPort) currentSerialPort.close();
    if (sshClient) sshClient.end();
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
