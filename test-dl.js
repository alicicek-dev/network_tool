const https = require('https');

const options = {
  hostname: 'speed.cloudflare.com',
  path: '/__down?bytes=500000000',
  method: 'GET',
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': '*/*'
  }
};

https.get(options, (res) => {
  console.log('Status Code:', res.statusCode);
  let bytes = 0;
  res.on('data', (c) => bytes += c.length);
  res.on('end', () => console.log('Total bytes:', bytes));
}).on('error', console.error);
