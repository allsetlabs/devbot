/**
 * Icon generation for Electron tray and dock.
 *
 * Creates simple PNG icons at runtime using raw pixel manipulation
 * and manual PNG encoding — no external deps (canvas, sharp, etc.).
 */

import { nativeImage, type NativeImage } from 'electron';
import { deflateSync } from 'node:zlib';

// ──────────────────────────── CRC32 ─────────────────────────────────────────

const crc32Table = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crc32Table[n] = c;
}

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crc32Table[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// ──────────────────────────── PNG encoding ───────────────────────────────────

function pngChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);

  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);

  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function rgbaToPng(pixels: Buffer, width: number, height: number): Buffer {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // bit depth
  ihdr.writeUInt8(6, 9); // color type RGBA
  ihdr.writeUInt8(0, 10); // compression
  ihdr.writeUInt8(0, 11); // filter
  ihdr.writeUInt8(0, 12); // interlace

  // IDAT — add filter byte (0 = None) before each scanline
  const rowBytes = width * 4;
  const raw = Buffer.alloc(height * (1 + rowBytes));
  for (let y = 0; y < height; y++) {
    raw[y * (1 + rowBytes)] = 0; // filter = None
    pixels.copy(raw, y * (1 + rowBytes) + 1, y * rowBytes, (y + 1) * rowBytes);
  }

  return Buffer.concat([
    signature,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ──────────────────────────── Icon shapes ────────────────────────────────────

/** Draw a filled circle with a "D" cutout (template-friendly). */
function drawBotIcon(size: number): Buffer {
  const pixels = Buffer.alloc(size * size * 4);
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - 1;
  const innerR = outerR * 0.55;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx + 0.5;
      const dy = y - cy + 0.5;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const idx = (y * size + x) * 4;

      let alpha = 0;

      if (dist <= outerR) {
        // Inside outer circle — check if we're in the "D" letter area
        const isLeftBar = x >= size * 0.28 && x <= size * 0.42;
        const isArc =
          dist <= innerR + size * 0.12 &&
          dist >= innerR - size * 0.12 &&
          dx > 0;
        const isInD = isLeftBar || isArc;

        // Anti-alias the outer edge
        const edgeDist = outerR - dist;
        alpha = edgeDist < 1 ? Math.round(edgeDist * 255) : 255;

        // Cut out the "D" interior (transparent) or keep filled (opaque)
        if (!isInD && dist < outerR - 1) {
          // Inside the circle but not part of the "D" — make it visible
          alpha = 0;
        }
        // If part of the "D" letter, keep alpha as computed
        if (isInD) {
          alpha = edgeDist < 1 ? Math.round(edgeDist * 255) : 255;
        }
      }

      // Template images on macOS: black pixels with varying alpha
      pixels[idx] = 0; // R
      pixels[idx + 1] = 0; // G
      pixels[idx + 2] = 0; // B
      pixels[idx + 3] = alpha;
    }
  }

  return pixels;
}

/** Simple filled circle for badge overlay. */
function drawCircle(size: number, r: number, g: number, b: number): Buffer {
  const pixels = Buffer.alloc(size * size * 4);
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 0.5;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx + 0.5;
      const dy = y - cy + 0.5;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const idx = (y * size + x) * 4;

      if (dist <= radius) {
        const edgeDist = radius - dist;
        const alpha = edgeDist < 1 ? Math.round(edgeDist * 255) : 255;
        pixels[idx] = r;
        pixels[idx + 1] = g;
        pixels[idx + 2] = b;
        pixels[idx + 3] = alpha;
      }
    }
  }

  return pixels;
}

// ──────────────────────────── Public API ─────────────────────────────────────

/**
 * Create a tray template image (macOS — automatic dark/light mode support).
 * Returns a 32x32 icon (16x16 @2x for Retina).
 */
export function createTrayIcon(): NativeImage {
  const size = 32; // @2x for Retina
  const pixels = drawBotIcon(size);
  const png = rgbaToPng(pixels, size, size);
  const image = nativeImage.createFromBuffer(png, {
    width: 16,
    height: 16,
    scaleFactor: 2.0,
  });
  image.setTemplateImage(true);
  return image;
}

/**
 * Create the app icon for the dock / window frame.
 * Returns a 128x128 colored icon.
 */
export function createAppIcon(): NativeImage {
  const size = 128;
  const pixels = Buffer.alloc(size * size * 4);
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - 4;

  // Draw a rounded background
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx + 0.5;
      const dy = y - cy + 0.5;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const idx = (y * size + x) * 4;

      if (dist <= outerR) {
        const edgeDist = outerR - dist;
        const alpha = edgeDist < 1.5 ? Math.round((edgeDist / 1.5) * 255) : 255;
        // Dark blue-gray background
        pixels[idx] = 30;
        pixels[idx + 1] = 35;
        pixels[idx + 2] = 50;
        pixels[idx + 3] = alpha;
      }
    }
  }

  // Overlay a white "D" letter
  const letterPixels = drawBotIcon(Math.round(size * 0.6));
  const letterSize = Math.round(size * 0.6);
  const offsetX = Math.round((size - letterSize) / 2);
  const offsetY = Math.round((size - letterSize) / 2);

  for (let y = 0; y < letterSize; y++) {
    for (let x = 0; x < letterSize; x++) {
      const srcIdx = (y * letterSize + x) * 4;
      const dstIdx = ((y + offsetY) * size + (x + offsetX)) * 4;
      const alpha = letterPixels[srcIdx + 3];
      if (alpha > 0) {
        // White letter with the computed alpha
        const bgA = pixels[dstIdx + 3] / 255;
        const fgA = alpha / 255;
        const outA = fgA + bgA * (1 - fgA);
        if (outA > 0) {
          pixels[dstIdx] = Math.round((255 * fgA + pixels[dstIdx] * bgA * (1 - fgA)) / outA);
          pixels[dstIdx + 1] = Math.round(
            (255 * fgA + pixels[dstIdx + 1] * bgA * (1 - fgA)) / outA
          );
          pixels[dstIdx + 2] = Math.round(
            (255 * fgA + pixels[dstIdx + 2] * bgA * (1 - fgA)) / outA
          );
          pixels[dstIdx + 3] = Math.round(outA * 255);
        }
      }
    }
  }

  const png = rgbaToPng(pixels, size, size);
  return nativeImage.createFromBuffer(png);
}

/**
 * Create a notification badge dot image (red circle).
 * Used for tray icon overlay on non-macOS or custom badge rendering.
 */
export function createBadgeDot(): NativeImage {
  const size = 16;
  const pixels = drawCircle(size, 255, 59, 48); // Red
  const png = rgbaToPng(pixels, size, size);
  return nativeImage.createFromBuffer(png);
}
