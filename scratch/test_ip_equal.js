const ip = require('ip');

const clientAddress = '::ffff:10.3.1.202';
const portHost = '10.3.1.202';

console.log('clientAddress:', clientAddress);
console.log('portHost:', portHost);
console.log('ip.isEqual:', ip.isEqual(clientAddress, portHost));
