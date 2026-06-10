const crypto = require('crypto');
try {
  crypto.getDiffieHellman('invalid-group-name');
} catch (err) {
  console.log('Error message:', JSON.stringify(err.message));
  console.log('Error code:', err.code);
}
