const http2 = require('http2');
const fs = require('fs');

const client = http2.connect('https://speed.cloudflare.com');

client.on('error', (err) => console.error(err));

let bytes = 0;
const start = Date.now();
let active = 0;

function spawn() {
  if (Date.now() - start > 10000) return;
  active++;
  const req = client.request({
    ':path': '/__down?bytes=25000000',
    ':method': 'GET',
    'user-agent': 'Mozilla/5.0'
  });

  req.on('response', (headers) => {
    // console.log('Status:', headers[':status']);
  });

  req.on('data', (chunk) => {
    bytes += chunk.length;
  });

  req.on('end', () => {
    active--;
    if (Date.now() - start <= 10000) spawn();
  });
  req.end();
}

for(let i=0; i<4; i++) spawn();

const timer = setInterval(() => {
  const elapsed = (Date.now() - start) / 1000;
  console.log('Mbps:', ((bytes * 8) / elapsed / 1000000).toFixed(2));
  if (elapsed > 10) {
    clearInterval(timer);
    client.close();
  }
}, 1000);
