const ping = require('ping');

console.log('Starting ping test...');
let seq = 0;
const interval = setInterval(async () => {
  seq++;
  const target = '10.255.255.255'; // A non-existent/timeout IP
  console.log(`[${seq}] Probing ${target}...`);
  try {
    let res = await ping.promise.probe(target, { timeout: 2 });
    console.log(`[${seq}] Result: alive=${res.alive}, time=${res.time}, host=${res.numeric_host}`);
  } catch (err) {
    console.error(`[${seq}] Error caught:`, err);
  }
}, 1000);

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION:', reason);
});
