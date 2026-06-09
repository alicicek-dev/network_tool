const https = require('https');

https.get('https://speed.cloudflare.com/__down?bytes=25000000', (res) => {
  console.log('Status:', res.statusCode);
  res.on('data', () => {});
}).on('error', console.error);
