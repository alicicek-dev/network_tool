const FtpSrv = require('ftp-srv');

const customLogger = {
  info: (data, msg) => {
    console.log('INFO:', msg || data);
  },
  warn: (data, msg) => {
    console.log('WARN:', msg || data);
  },
  error: (data, msg) => {
    console.log('ERROR:', msg || data);
  },
  debug: (data, msg) => {
    console.log('DEBUG:', msg || data);
  },
  trace: (data, msg) => {
    // console.log('TRACE:', msg || data);
  },
  child: () => customLogger
};

const server = new FtpSrv({
  url: 'ftp://127.0.0.1:2121',
  log: customLogger,
  anonymous: true
});

server.listen().then(() => {
  console.log('FTP Server listening...');
  server.close();
});
