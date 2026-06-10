const fs = require('fs');
const path = require('path');

function search(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const full = path.join(dir, file);
    if (fs.statSync(full).isDirectory()) {
      search(full);
    } else if (file.endsWith('.js')) {
      const content = fs.readFileSync(full, 'utf8');
      if (content.includes('createDiffieHellman')) {
        console.log('Found createDiffieHellman in:', full);
        const lines = content.split('\n');
        lines.forEach((l, i) => {
          if (l.includes('createDiffieHellman')) {
            console.log(`  ${i+1}: ${l}`);
          }
        });
      }
    }
  }
}

search(path.join(__dirname, 'node_modules', 'ssh2'));
