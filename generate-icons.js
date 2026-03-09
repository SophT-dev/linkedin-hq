// Run with: node generate-icons.js
const fs = require('fs');
const zlib = require('zlib');

function crc32(buf) {
  const table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    table[n] = c;
  }
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const t = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4); crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crcBuf]);
}

function makePNG(size) {
  const sig = Buffer.from([137,80,78,71,13,10,26,10]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0); ihdrData.writeUInt32BE(size, 4);
  ihdrData[8] = 8; ihdrData[9] = 2; // bit depth 8, RGB
  const ihdr = chunk('IHDR', ihdrData);

  // Maskable icon: full solid maroon square (no transparent edges)
  // works on both light and dark home screens
  // "HQ" suggested by a bold light cross/mark in the center
  const rows = [];
  const cx = size / 2, cy = size / 2;
  const pad = size * 0.2; // safe zone padding for maskable

  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 3);
    row[0] = 0;
    for (let x = 0; x < size; x++) {
      // "HQ" lettermark — two vertical bars + crossbar (H) + circle+tail (Q simplified as circle)
      const inSafeZone = x > pad && x < size - pad && y > pad && y < size - pad;
      const scx = cx, scy = cy;
      const unit = size * 0.06; // stroke width

      // H shape: left bar, right bar, crossbar
      const hLeft  = inSafeZone && x > scx - unit * 3.5 && x < scx - unit * 1.5 && y > scy - unit * 4 && y < scy + unit * 4;
      const hRight = inSafeZone && x > scx + unit * 1.5 && x < scx + unit * 3.5 && y > scy - unit * 4 && y < scy + unit * 4;
      const hBar   = inSafeZone && x > scx - unit * 3.5 && x < scx + unit * 3.5 && y > scy - unit && y < scy + unit;

      const isLettermark = hLeft || hRight || hBar;

      if (isLettermark) {
        // Light pink/rose foreground — readable on maroon in both themes
        row[1 + x*3] = 255; row[1 + x*3+1] = 200; row[1 + x*3+2] = 200;
      } else {
        // Solid deep maroon background — looks great on light and dark home screens
        row[1 + x*3] = 100; row[1 + x*3+1] = 18; row[1 + x*3+2] = 18;
      }
    }
    rows.push(row);
  }

  const compressed = zlib.deflateSync(Buffer.concat(rows));
  const idat = chunk('IDAT', compressed);
  const iend = chunk('IEND', Buffer.alloc(0));
  return Buffer.concat([sig, ihdr, idat, iend]);
}

fs.writeFileSync('public/icon-192.png', makePNG(192));
fs.writeFileSync('public/icon-512.png', makePNG(512));
console.log('Generated public/icon-192.png and public/icon-512.png');
