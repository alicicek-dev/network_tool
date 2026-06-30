const io = require('socket.io-client');

console.log('Connecting to server...');
const socket = io('http://127.0.0.1:3001', {
  forceNew: true,
  reconnection: false
});

socket.on('connect', () => {
  console.log('Connected to backend server! Starting ping...');
  socket.emit('start-ping', '10.255.255.255');
});

socket.on('terminal-data', (data) => {
  process.stdout.write(data);
});

socket.on('ping-stat', (data) => {
  console.log('Ping Stat:', data);
});

socket.on('disconnect', (reason) => {
  console.log('\r\nDisconnected from backend! Reason:', reason);
  process.exit(1);
});

socket.on('connect_error', (err) => {
  console.error('Connect Error:', err.message);
  process.exit(1);
});

// Run for 30 seconds
setTimeout(() => {
  console.log('\r\nTest finished without crash/disconnect.');
  socket.emit('stop-ping');
  socket.close();
  process.exit(0);
}, 30000);
