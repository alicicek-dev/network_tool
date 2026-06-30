const FtpSrv = require('ftp-srv');
console.log('FtpSrv exports:', Object.keys(FtpSrv));
console.log('FtpSrv prototype keys:', Object.getOwnPropertyNames(FtpSrv.prototype));
try {
  const FileSystem = require('ftp-srv/src/file-system');
  console.log('Successfully required ftp-srv/src/file-system directly. Keys:', Object.keys(FileSystem));
} catch (e) {
  console.error('Failed direct require:', e.message);
}
