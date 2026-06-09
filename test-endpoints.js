const http = require('http');
const https = require('https');

function testUrl(url, protocol) {
  const start = Date.now();
  let bytes = 0;
  protocol.get(url, (res) => {
    console.log(url, 'Status:', res.statusCode);
    res.on('data', (chunk) => {
      bytes += chunk.length;
      if (Date.now() - start > 5000) res.destroy();
    });
    res.on('close', () => {
      console.log(url, 'Mbps:', ((bytes * 8) / 5 / 1000000).toFixed(2));
    });
  });
}

testUrl('http://speed.hetzner.de/10GB.bin', http);
testUrl('https://proof.ovh.net/files/10Gb.dat', https);
