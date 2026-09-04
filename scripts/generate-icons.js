// Script to generate valid PNG icon files from canvas / raw png format
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createPng(width, height, isMaskable = false) {
  // A minimal pure Node.js PNG generator with RGBA buffer
  const buffer = Buffer.alloc(width * height * 4);
  const cx = width / 2;
  const cy = height / 2;
  const r = width * (isMaskable ? 0.38 : 0.44);

  // Background: slate-950 #0f172a
  const bgR = 15, bgG = 23, bgB = 42;
  // Accent Amber: #f59e0b
  const ambR = 245, ambG = 158, ambB = 11;
  // Accent Emerald: #10b981
  const emR = 16, emG = 185, emB = 129;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Default background
      buffer[idx] = bgR;
      buffer[idx + 1] = bgG;
      buffer[idx + 2] = bgB;
      buffer[idx + 3] = 255;

      // Outer glowing ring
      if (dist >= r - (width * 0.04) && dist <= r) {
        const ringProgress = (Math.atan2(dy, dx) + Math.PI) / (2 * Math.PI);
        const red = Math.round(ambR * (1 - ringProgress) + emR * ringProgress);
        const green = Math.round(ambG * (1 - ringProgress) + emG * ringProgress);
        const blue = Math.round(ambB * (1 - ringProgress) + emB * ringProgress);
        buffer[idx] = red;
        buffer[idx + 1] = green;
        buffer[idx + 2] = blue;
        buffer[idx + 3] = 255;
      }

      // Center Flame / Drop silhouette
      // Shape formula: drop
      const dropScale = width * 0.28;
      const ndx = dx / dropScale;
      const ndy = (dy + (width * 0.04)) / dropScale;
      
      // Heart/drop approx
      const inDrop = (ndx * ndx + (ndy - Math.cbrt(Math.abs(ndx))) * (ndy - Math.cbrt(Math.abs(ndx)))) < 1.0;
      const inCircle = (dx * dx + (dy - (width * 0.05)) * (dy - (width * 0.05))) < (width * 0.18) * (width * 0.18);
      const inTopPeak = dy < -(width * 0.05) && dy > -(width * 0.25) && Math.abs(dx) < ((dy + width * 0.25) * 0.6);

      if (inCircle || inTopPeak) {
        // Gradient from amber to emerald
        const gradY = (y - (cy - width * 0.25)) / (width * 0.5);
        buffer[idx] = Math.round(245 * (1 - gradY * 0.5));
        buffer[idx + 1] = Math.round(158 + (185 - 158) * gradY);
        buffer[idx + 2] = Math.round(11 + (129 - 11) * gradY);
        buffer[idx + 3] = 255;
      }
    }
  }

  // Encode uncompressed/deflated raw RGBA to PNG
  return buildPng(width, height, buffer);
}

function buildPng(width, height, rgbaBuffer) {
  // Add filter byte 0 (None) to each scanline
  const scanlineLength = width * 4 + 1;
  const rawData = Buffer.alloc(scanlineLength * height);

  for (let y = 0; y < height; y++) {
    rawData[y * scanlineLength] = 0; // Filter: None
    rgbaBuffer.copy(rawData, y * scanlineLength + 1, y * width * 4, (y + 1) * width * 4);
  }

  const compressedData = zlib.deflateSync(rawData);

  // PNG Header
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // Bit depth: 8
  ihdrData[9] = 6; // Color type: RGBA
  ihdrData[10] = 0; // Compression method: deflate
  ihdrData[11] = 0; // Filter method: standard
  ihdrData[12] = 0; // Interlace method: none
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  // IDAT chunk
  const idatChunk = makeChunk('IDAT', compressedData);

  // IEND chunk
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function makeChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const typeBuffer = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuffer, data]);

  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(calculateCrc(body), 0);

  return Buffer.concat([length, body, crc]);
}

// CRC32 implementation for PNG chunks
const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    if (c & 1) {
      c = 0xedb88320 ^ (c >>> 1);
    } else {
      c = c >>> 1;
    }
  }
  crcTable[n] = c;
}

function calculateCrc(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// Generate all target icon files
const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

console.log('Generating PWA and Apple icons...');
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), createPng(192, 192, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), createPng(512, 512, false));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), createPng(512, 512, true));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), createPng(180, 180, false));
console.log('All icons generated successfully!');
