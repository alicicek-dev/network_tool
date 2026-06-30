const Packet = require('tftp2/packet');

// Helper to create a request buffer with options
function createRequestWithOptions(opcode, filename, mode, options) {
  const parts = [
    Buffer.from([0, opcode]),
    Buffer.from(filename + '\0', 'ascii'),
    Buffer.from(mode + '\0', 'ascii')
  ];
  for (const [k, v] of Object.entries(options)) {
    parts.push(Buffer.from(k + '\0', 'ascii'));
    parts.push(Buffer.from(v + '\0', 'ascii'));
  }
  return Buffer.concat(parts);
}

// Monkeypatch
const originalParse = Packet.parse;
Packet.parse = msg => {
  const packet = originalParse(msg);
  if (packet.opcode === Packet.OPCODE.RRQ || packet.opcode === Packet.OPCODE.WRQ) {
    packet.options = {};
    try {
      // 2 bytes opcode + filename length + 1 null byte + mode length + 1 null byte
      let offset = 2 + Buffer.byteLength(packet.filename, 'ascii') + 1 + Buffer.byteLength(packet.mode, 'ascii') + 1;
      
      // Since Packet.createReader is internal, we can just read from msg
      while (offset < msg.length) {
        // Read option name
        let start = offset;
        while (offset < msg.length && msg[offset] !== 0) {
          offset++;
        }
        const optName = msg.toString('ascii', start, offset).toLowerCase();
        offset++; // skip null byte

        if (!optName) break;

        // Read option value
        start = offset;
        while (offset < msg.length && msg[offset] !== 0) {
          offset++;
        }
        const optVal = msg.toString('ascii', start, offset);
        offset++; // skip null byte

        packet.options[optName] = optVal;
      }
    } catch (e) {
      console.error('Option parse error:', e);
    }
  }
  return packet;
};

// Test
const sampleMsg = createRequestWithOptions(2, 'test.bin', 'octet', { tsize: '1048576', blksize: '1468' });
console.log('Sample raw message:', sampleMsg);

const parsed = Packet.parse(sampleMsg);
console.log('Parsed Packet:', {
  opcode: parsed.opcode,
  filename: parsed.filename,
  mode: parsed.mode,
  options: parsed.options
});
