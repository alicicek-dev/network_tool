const tftp = require('tftp2');
const Packet = require('tftp2/packet');
const Connection = require('tftp2/connection');
const TFTPServer = require('tftp2/server');

// 1. Packet parse monkeypatch (with options support)
const originalParse = Packet.parse;
Packet.parse = msg => {
  const packet = originalParse(msg);
  if (packet.opcode === Packet.OPCODE.RRQ || packet.opcode === Packet.OPCODE.WRQ) {
    packet.options = {};
    try {
      let offset = 2 + Buffer.byteLength(packet.filename, 'ascii') + 1 + Buffer.byteLength(packet.mode, 'ascii') + 1;
      while (offset < msg.length) {
        let start = offset;
        while (offset < msg.length && msg[offset] !== 0) {
          offset++;
        }
        const optName = msg.toString('ascii', start, offset).toLowerCase();
        offset++;
        if (!optName) break;

        start = offset;
        while (offset < msg.length && msg[offset] !== 0) {
          offset++;
        }
        const optVal = msg.toString('ascii', start, offset);
        offset++;

        packet.options[optName] = optVal;
      }
    } catch (e) {
      // Ignore option parsing errors
    }
  }
  return packet;
};

// 2. TFTPServer.handleMessage monkeypatch (attaching options to connection)
TFTPServer.prototype.handleMessage = function(message, rinfo) {
  const packet = Packet.parse(message);
  const client = new Connection(rinfo);
  this.emit('client', client);
  client.mode = packet.mode;
  client.filename = packet.filename;
  client.options = packet.options; // Attach options
  switch (packet.opcode) {
    case Packet.OPCODE.RRQ: {
      this.handleReadRequest(client, packet);
      break;
    }
    case Packet.OPCODE.WRQ: {
      this.handleWriteRequest(client, packet);
      break;
    }
  }
  return this;
};

// 3. Packet wrap-around monkeypatch (modulo 65536)
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

// 4. Connection progress reporting monkeypatch
const originalSendBlock = Connection.prototype.sendBlock;
Connection.prototype.sendBlock = function(block, data) {
  if (this.totalBytes && this.transferType === 'read') {
    this.sentBytes += data.length;
    const percent = Math.floor((this.sentBytes / this.totalBytes) * 100);
    if (block === 1 || percent >= this.lastLoggedPercent + 10 || this.sentBytes === this.totalBytes) {
      this.lastLoggedPercent = percent;
      if (typeof this.onProgress === 'function') {
        this.onProgress(this.sentBytes, this.totalBytes);
      }
    }
  }
  return originalSendBlock.call(this, block, data);
};

console.log('TFTP Progress and Options monkeypatch test initialized successfully!');
