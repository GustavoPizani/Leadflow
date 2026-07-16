// Gera os ícones PNG do PWA (gradiente violeta->fúcsia + "L") sem depender de next/og —
// o caminho deste projeto tem acentos e a lib next/og (via @vercel/og) quebra ao montar uma
// URL de arquivo com caracteres não-ASCII. PNG puro via zlib evita esse problema.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

const hex = (h) => [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
// Paleta da marca (setin.com.br): azul #004a8f -> ciano #21b5ea.
const COLOR_A = hex('004a8f');
const COLOR_B = hex('21b5ea');

// Fonte 5x7 bitmap só com o "L" (o único glifo que usamos nos ícones).
const GLYPH_L = ['10000', '10000', '10000', '10000', '10000', '10000', '11111'];

function buildPixels(size) {
  const raw = Buffer.alloc(size * (1 + size * 4));
  const glyphScale = Math.max(1, Math.floor((size * 0.5) / 5));
  const glyphW = 5 * glyphScale;
  const glyphH = 7 * glyphScale;
  const offsetX = Math.floor((size - glyphW) / 2);
  const offsetY = Math.floor((size - glyphH) / 2);

  for (let y = 0; y < size; y++) {
    const rowStart = y * (1 + size * 4);
    raw[rowStart] = 0; // filter: none
    const t = (x) => (x + y) / (2 * (size - 1));
    for (let x = 0; x < size; x++) {
      const tt = t(x);
      let r = Math.round(COLOR_A[0] + (COLOR_B[0] - COLOR_A[0]) * tt);
      let g = Math.round(COLOR_A[1] + (COLOR_B[1] - COLOR_A[1]) * tt);
      let b = Math.round(COLOR_A[2] + (COLOR_B[2] - COLOR_A[2]) * tt);

      const gx = x - offsetX;
      const gy = y - offsetY;
      if (gx >= 0 && gx < glyphW && gy >= 0 && gy < glyphH) {
        const col = Math.floor(gx / glyphScale);
        const row = Math.floor(gy / glyphScale);
        if (GLYPH_L[row][col] === '1') {
          r = 255;
          g = 255;
          b = 255;
        }
      }

      const px = rowStart + 1 + x * 4;
      raw[px] = r;
      raw[px + 1] = g;
      raw[px + 2] = b;
      raw[px + 3] = 255;
    }
  }
  return raw;
}

function generatePng(size) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const raw = buildPixels(size);
  const idat = zlib.deflateSync(raw);

  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const targets = [
  { size: 32, out: 'app/icon.png' },
  { size: 180, out: 'app/apple-icon.png' },
  { size: 192, out: 'public/icons/icon-192.png' },
  { size: 512, out: 'public/icons/icon-512.png' },
];

for (const { size, out } of targets) {
  const dest = path.join(__dirname, '..', out);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, generatePng(size));
  console.log(`gerado: ${out} (${size}x${size})`);
}
