const http = require('http');
const start = Date.now();
let bytes = 0;

http.get('http://speedtest.tele2.net/1GB.zip', (res) => {
  console.log('Status:', res.statusCode);
  res.on('data', (chunk) => {
    bytes += chunk.length;
    if (Date.now() - start > 10000) {
      res.destroy();
    }
  });
  res.on('close', () => {
    console.log('Mbps:', ((bytes * 8) / 10 / 1000000).toFixed(2));
  });
});
