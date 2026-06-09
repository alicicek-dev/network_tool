const https = require('https');
const start = Date.now();
let bytes = 0;

https.get('https://fsn1-speed.hetzner.com/1GB.bin', (res) => {
  console.log('Status:', res.statusCode);
  res.on('data', (chunk) => {
    bytes += chunk.length;
    if (Date.now() - start > 10000) res.destroy();
  });
  res.on('close', () => {
    console.log('Mbps:', ((bytes * 8) / 10 / 1000000).toFixed(2));
  });
}).on('error', console.error);
