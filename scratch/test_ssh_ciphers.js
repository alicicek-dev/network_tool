const { Client } = require('ssh2');

const kexToTest = [
  'curve25519-sha256',
  'curve25519-sha256@libssh.org',
  'ecdh-sha2-nistp256',
  'ecdh-sha2-nistp384',
  'ecdh-sha2-nistp521',
  'diffie-hellman-group-exchange-sha256',
  'diffie-hellman-group-exchange-sha1',
  'diffie-hellman-group16-sha512',
  'diffie-hellman-group18-sha512',
  'diffie-hellman-group14-sha256',
  'diffie-hellman-group14-sha1',
  'diffie-hellman-group15-sha512',
  'diffie-hellman-group17-sha512',
  'diffie-hellman-group1-sha1'
];

const hostKeysToTest = [
  'ssh-ed25519',
  'ecdsa-sha2-nistp256',
  'ecdsa-sha2-nistp384',
  'ecdsa-sha2-nistp521',
  'rsa-sha2-256',
  'rsa-sha2-512',
  'ssh-rsa',
  'ssh-dss'
];

const hmacToTest = [
  'hmac-sha2-256-etm@openssh.com',
  'hmac-sha2-512-etm@openssh.com',
  'hmac-sha1-etm@openssh.com',
  'hmac-sha2-256',
  'hmac-sha2-512',
  'hmac-sha1',
  'hmac-md5',
  'hmac-sha2-256-96',
  'hmac-sha2-512-96',
  'hmac-ripemd160',
  'hmac-sha1-96',
  'hmac-md5-96'
];

console.log('--- Testing KEX ---');
for (const kex of kexToTest) {
  try {
    const client = new Client();
    client.connect({
      host: '127.0.0.1',
      port: 2222,
      username: 'test',
      password: 'test',
      algorithms: { kex: [kex] }
    });
    client.end();
  } catch (err) {
    if (err.message.includes('Unsupported')) {
      console.log(`KEX '${kex}' failed: ${err.message}`);
    }
  }
}

console.log('--- Testing Host Keys ---');
for (const hk of hostKeysToTest) {
  try {
    const client = new Client();
    client.connect({
      host: '127.0.0.1',
      port: 2222,
      username: 'test',
      password: 'test',
      algorithms: { serverHostKey: [hk] }
    });
    client.end();
  } catch (err) {
    if (err.message.includes('Unsupported')) {
      console.log(`Host Key '${hk}' failed: ${err.message}`);
    }
  }
}

console.log('--- Testing HMAC ---');
for (const hmac of hmacToTest) {
  try {
    const client = new Client();
    client.connect({
      host: '127.0.0.1',
      port: 2222,
      username: 'test',
      password: 'test',
      algorithms: { hmac: [hmac] }
    });
    client.end();
  } catch (err) {
    if (err.message.includes('Unsupported')) {
      console.log(`HMAC '${hmac}' failed: ${err.message}`);
    }
  }
}

console.log('Testing done.');
process.exit(0);
