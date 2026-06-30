const tftp = require('tftp2');
const Packet = require('tftp2/packet');
const Connection = require('tftp2/connection');

console.log('Original Packet.createAck:', Packet.createAck);

// Monkeypatching
const originalCreateAck = Packet.createAck;
Packet.createAck = (blockNumber) => {
  return originalCreateAck(blockNumber % 65536);
};

const originalCreateData = Packet.createData;
Packet.createData = (blockNumber, data) => {
  return originalCreateData(blockNumber % 65536, data);
};

Connection.prototype.waitAck = function(block) {
  return this.wait(message =>
    message.opcode === Packet.OPCODE.ACK && message.block === (block % 65536));
};

Connection.prototype.waitBlock = function(block) {
  return this.wait(message =>
    message.opcode === Packet.OPCODE.DATA && message.block === (block % 65536));
};

console.log('Testing createAck with 65536 (should wrap to 0 and not throw):');
try {
  const buf = Packet.createAck(65536);
  console.log('Success! Buffer:', buf);
  console.log('Opcode (should be 4):', buf.readUInt16BE(0));
  console.log('Block Number (should be 0):', buf.readUInt16BE(2));
} catch (e) {
  console.error('Failed:', e);
}

console.log('\nTesting createData with 65537 (should wrap to 1 and not throw):');
try {
  const buf = Packet.createData(65537, Buffer.alloc(10));
  console.log('Success! Buffer:', buf);
  console.log('Opcode (should be 3):', buf.readUInt16BE(0));
  console.log('Block Number (should be 1):', buf.readUInt16BE(2));
} catch (e) {
  console.error('Failed:', e);
}
