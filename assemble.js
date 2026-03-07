const fs = require('fs');
const zlib = require('zlib');
const dir = 'C:\\Users\\woo\\option-project\\tmp_b64';
const out = 'C:\\Users\\woo\\option-project\\public\\index.html';
const files = fs.readdirSync(dir).filter(f=>f.startsWith('chunk_')).sort();
let b64 = '';
files.forEach(f => { b64 += fs.readFileSync(dir + '\\' + f, 'utf8').trim(); });
const gz = Buffer.from(b64, 'base64');
const html = zlib.gunzipSync(gz);
fs.writeFileSync(out, html);
console.log('Done: ' + html.length + ' bytes -> ' + out);
// Cleanup
files.forEach(f => fs.unlinkSync(dir + '\\' + f));
