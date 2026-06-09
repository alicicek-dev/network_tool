const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const ping = require('ping');
const { SerialPort } = require('serialport');
const { Client } = require('ssh2');
const wol = require('wake_on_lan');
const os = require('os');
const { spawn } = require('child_process');

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
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        results.push({ name, ip: net.address, mac: net.mac });
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
    pingInterval = setInterval(async () => {
      try {
        let res = await ping.promise.probe(target, { timeout: 2 });
        if (res.alive) {
          socket.emit('terminal-data', `Reply from ${res.numeric_host}: time=${res.time}ms TTL=${res.ttl || 'N/A'}\r\n`);
        } else {
          socket.emit('terminal-data', `Request timed out.\r\n`);
        }
      } catch (err) {
        socket.emit('terminal-data', `Ping error: ${err.message}\r\n`);
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
          'diffie-hellman-group1-sha1',
          'diffie-hellman-group14-sha1',
          'diffie-hellman-group-exchange-sha1',
          'diffie-hellman-group-exchange-sha256',
          'ecdh-sha2-nistp256',
          'ecdh-sha2-nistp384',
          'ecdh-sha2-nistp521',
          'curve25519-sha256',
          'curve25519-sha256@libssh.org'
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
