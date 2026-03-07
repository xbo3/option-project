const fs = require('fs');
const path = 'C:\\Users\\woo\\option-project\\public\\index.html';
const tmpDir = 'C:\\Users\\woo\\option-project\\tmp_b64';
if(!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);
// Combine all b64 chunks and decode
const files = fs.readdirSync(tmpDir).sort();
let b64 = '';
files.forEach(f => { b64 += fs.readFileSync(path.join? tmpDir + '\\' + f : tmpDir + '\\' + f, 'utf8'); });
const html = Buffer.from(b64, 'base64').toString('utf8');
fs.writeFileSync(path, html);
console.log('Decoded ' + html.length + ' bytes to ' + path);
