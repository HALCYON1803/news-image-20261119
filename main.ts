// news-image-20261119 — The World Today: 19 November 2026
// A program that draws one 1024x1024 newspaper front page entirely in code.
// Node 22 standard library only. No network, no Date, no randomness:
// repeated runs produce a byte-identical PNG.

import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const W = 1024;
const H = 1024;

// ---------------------------------------------------------------- canvas
const img = Buffer.alloc(W * H * 4);

type Color = [number, number, number, number];
const PAPER: Color = [247, 242, 231, 255];
const INK: Color = [20, 20, 20, 255];
const NAVY: Color = [11, 37, 69, 255];
const NAVY2: Color = [18, 58, 102, 255];
const RED: Color = [179, 32, 44, 255];
const BLUE: Color = [29, 78, 137, 255];
const TEAL: Color = [14, 116, 110, 255];
const GOLD: Color = [196, 141, 30, 255];
const GREY: Color = [110, 110, 105, 255];
const LIGHT: Color = [232, 226, 212, 255];
const WHITE: Color = [255, 255, 255, 255];
const SKY: Color = [178, 210, 235, 255];
const SEA: Color = [38, 96, 140, 255];
const DARK: Color = [10, 18, 32, 255];

function setPx(x: number, y: number, c: Color): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 4;
  img[i] = c[0];
  img[i + 1] = c[1];
  img[i + 2] = c[2];
  img[i + 3] = c[3];
}

function fillRect(x: number, y: number, w: number, h: number, c: Color): void {
  const x0 = Math.max(0, x);
  const y0 = Math.max(0, y);
  const x1 = Math.min(W, x + w);
  const y1 = Math.min(H, y + h);
  for (let yy = y0; yy < y1; yy++) {
    for (let xx = x0; xx < x1; xx++) {
      const i = (yy * W + xx) * 4;
      img[i] = c[0];
      img[i + 1] = c[1];
      img[i + 2] = c[2];
      img[i + 3] = c[3];
    }
  }
}

function hline(x: number, y: number, w: number, c: Color): void {
  fillRect(x, y, w, 1, c);
}

function vline(x: number, y: number, h: number, c: Color): void {
  fillRect(x, y, 1, h, c);
}

function rect(x: number, y: number, w: number, h: number, c: Color, t = 1): void {
  fillRect(x, y, w, t, c);
  fillRect(x, y + h - t, w, t, c);
  fillRect(x, y, t, h, c);
  fillRect(x + w - t, y, t, h, c);
}

function line(x0: number, y0: number, x1: number, y1: number, c: Color): void {
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let x = x0;
  let y = y0;
  for (;;) {
    setPx(x, y, c);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
}

function circle(cx: number, cy: number, r: number, c: Color): void {
  for (let y = -r; y <= r; y++) {
    const hw = Math.floor(Math.sqrt(r * r - y * y));
    hline(cx - hw, cy + y, hw * 2 + 1, c);
  }
}

// Outline arc. Angles in degrees, 0 = east, 90 = south (y grows down).
function arc(cx: number, cy: number, r: number, a0: number, a1: number, c: Color, thick = 1): void {
  const span = Math.abs(a1 - a0);
  const steps = Math.max(8, Math.floor((span * r) / 6));
  const off = Math.floor(thick / 2);
  for (let i = 0; i <= steps; i++) {
    const a = ((a0 + ((a1 - a0) * i) / steps) * Math.PI) / 180;
    const x = Math.round(cx + r * Math.cos(a));
    const y = Math.round(cy + r * Math.sin(a));
    fillRect(x - off, y - off, thick, thick, c);
  }
}

function fillTriangle(
  x0: number, y0: number,
  x1: number, y1: number,
  x2: number, y2: number,
  c: Color,
): void {
  const pts: Array<[number, number]> = [
    [x0, y0],
    [x1, y1],
    [x2, y2],
  ].sort((a, b) => a[1] - b[1]);
  const [ax, ay] = pts[0];
  const [bx, by] = pts[1];
  const [cx, cy] = pts[2];
  const lerpX = (px: number, py: number, qx: number, qy: number, y: number): number => {
    if (qy === py) return px;
    return px + ((qx - px) * (y - py)) / (qy - py);
  };
  for (let y = ay; y <= cy; y++) {
    let xa: number;
    let xb: number;
    if (y < by) {
      xa = lerpX(ax, ay, bx, by, y);
      xb = lerpX(ax, ay, cx, cy, y);
    } else {
      xa = lerpX(bx, by, cx, cy, y);
      xb = lerpX(ax, ay, cx, cy, y);
    }
    const lo = Math.min(xa, xb);
    const hi = Math.max(xa, xb);
    hline(Math.round(lo), y, Math.round(hi) - Math.round(lo) + 1, c);
  }
}

// ---------------------------------------------------------------- 5x7 font
// Each glyph is 7 rows; each row is a 5-bit mask, bit 4 = leftmost column.
const FONT: Record<string, number[]> = {
  A: [14, 17, 17, 31, 17, 17, 17],
  B: [30, 17, 17, 30, 17, 17, 30],
  C: [14, 17, 16, 16, 16, 17, 14],
  D: [30, 17, 17, 17, 17, 17, 30],
  E: [31, 16, 16, 30, 16, 16, 31],
  F: [31, 16, 16, 30, 16, 16, 16],
  G: [14, 17, 16, 23, 17, 17, 15],
  H: [17, 17, 17, 31, 17, 17, 17],
  I: [14, 4, 4, 4, 4, 4, 14],
  J: [7, 2, 2, 2, 2, 18, 12],
  K: [17, 18, 20, 24, 20, 18, 17],
  L: [16, 16, 16, 16, 16, 16, 31],
  M: [17, 27, 21, 21, 17, 17, 17],
  N: [17, 25, 21, 19, 17, 17, 17],
  O: [14, 17, 17, 17, 17, 17, 14],
  P: [30, 17, 17, 30, 16, 16, 16],
  Q: [14, 17, 17, 17, 21, 18, 13],
  R: [30, 17, 17, 30, 20, 18, 17],
  S: [15, 16, 16, 14, 1, 1, 30],
  T: [31, 4, 4, 4, 4, 4, 4],
  U: [17, 17, 17, 17, 17, 17, 14],
  V: [17, 17, 17, 17, 17, 10, 4],
  W: [17, 17, 17, 21, 21, 27, 17],
  X: [17, 17, 10, 4, 10, 17, 17],
  Y: [17, 17, 10, 4, 4, 4, 4],
  Z: [31, 1, 2, 4, 8, 16, 31],
  "0": [14, 17, 19, 21, 25, 17, 14],
  "1": [4, 12, 4, 4, 4, 4, 14],
  "2": [14, 17, 1, 6, 8, 16, 31],
  "3": [31, 2, 4, 2, 1, 17, 14],
  "4": [2, 6, 10, 18, 31, 2, 2],
  "5": [31, 16, 30, 1, 1, 17, 14],
  "6": [6, 8, 16, 30, 17, 17, 14],
  "7": [31, 1, 2, 4, 8, 8, 8],
  "8": [14, 17, 17, 14, 17, 17, 14],
  "9": [14, 17, 17, 15, 1, 2, 12],
  " ": [0, 0, 0, 0, 0, 0, 0],
  ".": [0, 0, 0, 0, 0, 12, 12],
  ",": [0, 0, 0, 0, 12, 4, 8],
  ":": [0, 12, 12, 0, 12, 12, 0],
  ";": [0, 12, 12, 0, 12, 4, 8],
  "!": [4, 4, 4, 4, 4, 0, 4],
  "?": [14, 17, 1, 2, 4, 0, 4],
  "-": [0, 0, 0, 14, 0, 0, 0],
  "'": [4, 4, 8, 0, 0, 0, 0],
  '"': [10, 10, 10, 0, 0, 0, 0],
  "(": [2, 4, 8, 8, 8, 4, 2],
  ")": [8, 4, 2, 2, 2, 4, 8],
  "/": [1, 1, 2, 4, 8, 16, 16],
  "%": [25, 25, 2, 4, 8, 19, 19],
  $: [4, 15, 20, 14, 5, 30, 4],
  "&": [12, 18, 20, 8, 21, 18, 13],
  "+": [0, 4, 4, 31, 4, 4, 0],
  "=": [0, 0, 31, 0, 31, 0, 0],
  "*": [0, 4, 21, 14, 21, 4, 0],
  "[": [14, 8, 8, 8, 8, 8, 14],
  "]": [14, 2, 2, 2, 2, 2, 14],
  "•": [0, 4, 14, 14, 14, 4, 0],
};

function advance(s: number): number {
  return 6 * s - 1;
}

function textWidth(s: number, str: string): number {
  const t = str.toUpperCase();
  if (t.length === 0) return 0;
  return t.length * advance(s) - (s - 1);
}

function drawChar(ch: string, x: number, y: number, s: number, c: Color): void {
  const g = FONT[ch] ?? FONT[" "];
  for (let r = 0; r < 7; r++) {
    const row = g[r];
    for (let col = 0; col < 5; col++) {
      if (row & (1 << (4 - col))) {
        fillRect(x + col * s, y + r * s, s, s, c);
      }
    }
  }
}

function drawText(str: string, x: number, y: number, s: number, c: Color): void {
  const t = str.toUpperCase();
  let cx = x;
  for (const ch of t) {
    drawChar(ch, cx, y, s, c);
    cx += advance(s);
  }
}

function drawTextCenter(str: string, cx: number, y: number, s: number, c: Color): void {
  drawText(str, cx - Math.floor(textWidth(s, str) / 2), y, s, c);
}

function wrapText(str: string, maxWidth: number, s: number): string[] {
  const words = str.toUpperCase().split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const trial = cur === "" ? w : cur + " " + w;
    if (textWidth(s, trial) <= maxWidth || cur === "") {
      cur = trial;
    } else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur !== "") lines.push(cur);
  return lines;
}

function drawPara(str: string, x: number, y: number, maxWidth: number, s: number, c: Color, pitch: number): void {
  const lines = wrapText(str, maxWidth, s);
  for (let i = 0; i < lines.length; i++) {
    drawText(lines[i], x, y + i * pitch, s, c);
  }
}

// ---------------------------------------------------------------- PNG encoder
const CRC_TABLE: number[] = (() => {
  const table: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  const crcIn = Buffer.concat([Buffer.from(type, "ascii"), data]);
  out.writeUInt32BE(crc32(crcIn), 8 + data.length);
  return out;
}

function encodePNG(): Buffer {
  const raw = Buffer.alloc(H * (1 + W * 4));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 4)] = 0; // filter: none
    img.copy(raw, y * (1 + W * 4) + 1, y * W * 4, (y + 1) * W * 4);
  }
  const idat = deflateSync(raw, { level: 9 });
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", idat),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------- pictograms
function drawGlobe(cx: number, cy: number, r: number): void {
  circle(cx, cy, r, SEA);
  // latitude lines, clipped to the circle by chord half-width
  for (const dy of [-Math.floor(r / 2), 0, Math.floor(r / 2)]) {
    const hw = Math.floor(Math.sqrt(r * r - dy * dy));
    hline(cx - hw, cy + dy, hw * 2 + 1, WHITE);
  }
  // longitude lines, clipped the same way
  for (const dx of [-Math.floor(r / 2), 0, Math.floor(r / 2)]) {
    const hh = Math.floor(Math.sqrt(r * r - dx * dx));
    vline(cx + dx, cy - hh, hh * 2 + 1, WHITE);
  }
  circle(cx - 7, cy - 6, 4, GOLD);
  circle(cx + 8, cy + 7, 4, TEAL);
}

function picFrame(x: number, y: number, w: number, h: number): void {
  rect(x, y, w, h, GREY, 1);
}

// Story 1: globe with three markers over a skyline.
function picSummit(x: number, y: number, w: number, h: number): void {
  fillRect(x, y, w, h, SKY);
  const cx = x + 82;
  const cy = y + 54;
  const r = 46;
  circle(cx, cy, r, SEA);
  for (const dy of [-23, 0, 23]) {
    const hw = Math.floor(Math.sqrt(r * r - dy * dy));
    hline(cx - hw, cy + dy, hw * 2 + 1, WHITE);
  }
  for (const dx of [-23, 0, 23]) {
    const hh = Math.floor(Math.sqrt(r * r - dx * dx));
    vline(cx + dx, cy - hh, hh * 2 + 1, WHITE);
  }
  // three markers on the globe
  circle(cx - 22, cy - 18, 7, RED);
  circle(cx - 22, cy - 18, 3, WHITE);
  circle(cx + 22, cy - 14, 7, GOLD);
  circle(cx + 22, cy - 14, 3, WHITE);
  circle(cx + 2, cy + 18, 7, TEAL);
  circle(cx + 2, cy + 18, 3, WHITE);
  // sun
  circle(x + w - 52, y + 22, 10, GOLD);
  // skyline silhouette along the bottom
  const base = y + h;
  const towers: Array<[number, number, number]> = [
    [170, 42, 34],
    [210, 60, 28],
    [244, 36, 40],
    [290, 52, 26],
    [322, 32, 42],
    [370, 58, 30],
    [406, 38, 36],
    [448, 48, 28],
    [482, 34, 30],
  ];
  for (const [tx, th, tw] of towers) {
    fillRect(x + tx, base - th, tw, th, NAVY);
  }
  // lit windows
  const wins: Array<[number, number]> = [
    [178, 74], [196, 82], [218, 62], [230, 78], [252, 84], [268, 70],
    [298, 74], [310, 88], [330, 80], [352, 62], [378, 70], [392, 84],
    [414, 76], [430, 66], [456, 80], [470, 72], [490, 86], [500, 78],
  ];
  for (const [wx, wy] of wins) {
    fillRect(x + wx, y + wy, 3, 4, GOLD);
  }
  fillRect(x, base - 4, w, 4, INK);
  picFrame(x, y, w, h);
}

// Story 2: night sky, crescent moon, radar, drone, sea, warning triangle.
function picGulf(x: number, y: number, w: number, h: number): void {
  fillRect(x, y, w, h, DARK);
  const stars: Array<[number, number]> = [
    [16, 12], [52, 26], [96, 10], [140, 30], [180, 14], [220, 28],
    [256, 12], [300, 24], [340, 10], [380, 26], [36, 48], [200, 44],
    [320, 48], [150, 58], [260, 56],
  ];
  for (const [sx, sy] of stars) {
    fillRect(x + sx, y + sy, 2, 2, WHITE);
  }
  // crescent moon
  circle(x + 330, y + 34, 16, GOLD);
  circle(x + 338, y + 30, 14, DARK);
  // radar dish, bottom left
  const rx = x + 34;
  const ry = y + h - 26;
  vline(rx, ry - 22, 22, WHITE);
  arc(rx, ry - 22, 18, 200, 340, WHITE, 2);
  line(rx, ry - 22, rx + 14, ry - 34, WHITE);
  circle(rx + 14, ry - 34, 2, RED);
  // drone
  const dx = x + 190;
  const dy = y + 42;
  fillRect(dx - 8, dy - 2, 16, 5, WHITE);
  hline(dx - 16, dy - 8, 32, WHITE);
  hline(dx - 16, dy + 6, 32, WHITE);
  circle(dx, dy + 1, 2, RED);
  // sea band with wave lines
  const seaY = y + h - 26;
  fillRect(x, seaY, w, 26, SEA);
  for (const wy of [seaY + 7, seaY + 14, seaY + 21]) {
    for (let wx = x + 8; wx < x + w - 16; wx += 26) {
      hline(wx, wy, 14, WHITE);
    }
  }
  // gold warning triangle, floating in the sky above the sea
  const tx = x + w - 62;
  const ty = y + h - 70;
  fillTriangle(tx, ty, tx + 24, ty + 28, tx - 24, ty + 28, GOLD);
  drawText("!", tx - 3, ty + 8, 1, INK);
  picFrame(x, y, w, h);
}

// Story 3: courthouse — pediment, dome, flag, columns, steps.
function picCourt(x: number, y: number, w: number, h: number): void {
  fillRect(x, y, w, h, LIGHT);
  const cx = x + Math.floor(w / 2);
  // steps
  fillRect(cx - 100, y + 74, 200, 6, GREY);
  fillRect(cx - 110, y + 80, 220, 6, GREY);
  fillRect(cx - 120, y + 86, 240, 6, GREY);
  // columns
  for (const ox of [-92, -38, 16, 70]) {
    fillRect(cx + ox, y + 46, 16, 28, WHITE);
    rect(cx + ox, y + 46, 16, 28, INK, 1);
  }
  // entablature
  fillRect(cx - 112, y + 36, 224, 10, NAVY);
  // pediment
  fillTriangle(cx - 112, y + 36, cx + 112, y + 36, cx, y + 10, NAVY);
  // dome on the apex
  circle(cx, y + 8, 6, NAVY2);
  // flag pole and flag at the top edge
  vline(cx, y, 8, INK);
  fillRect(cx, y, 13, 7, RED);
  picFrame(x, y, w, h);
}

// Story 4: Crimean Bridge — broken deck, arch, fallen span, burst, smoke.
function picBridge(x: number, y: number, w: number, h: number): void {
  fillRect(x, y, w, h, SKY);
  // sun and clouds
  circle(x + 252, y + 18, 10, GOLD);
  fillRect(x + 30, y + 14, 42, 7, WHITE);
  fillRect(x + 48, y + 22, 30, 6, WHITE);
  // banks
  fillRect(x, y + 46, 66, h - 46, LIGHT);
  fillRect(x + w - 66, y + 46, 66, h - 46, LIGHT);
  // sea
  fillRect(x, y + 54, w, h - 54, SEA);
  for (const wy of [y + 66, y + 78, y + 88]) {
    for (let wx = x + 10; wx < x + w - 18; wx += 30) {
      hline(wx, wy, 16, WHITE);
    }
  }
  // deck in two spans with a gap
  fillRect(x + 18, y + 40, 108, 8, GREY);
  rect(x + 18, y + 40, 108, 8, INK, 1);
  fillRect(x + 162, y + 40, 116, 8, GREY);
  rect(x + 162, y + 40, 116, 8, INK, 1);
  // standing arch on the right span
  arc(x + 220, y + 48, 28, 180, 360, NAVY, 2);
  vline(x + 192, y + 40, 8, NAVY);
  vline(x + 248, y + 40, 8, NAVY);
  // fallen tilted span in the water
  fillTriangle(x + 130, y + 60, x + 136, y + 56, x + 168, y + 82, GREY);
  fillTriangle(x + 130, y + 60, x + 168, y + 82, x + 162, y + 86, GREY);
  // red burst at the gap
  const bx = x + 144;
  const by = y + 44;
  for (const [ex, ey] of [
    [-16, -12], [-4, -18], [10, -14], [18, -4], [14, 10], [0, 16], [-14, 8], [-18, 2],
  ]) {
    line(bx, by, bx + ex, by + ey, RED);
  }
  circle(bx, by, 5, RED);
  // grey smoke above the gap
  circle(x + 138, y + 24, 6, GREY);
  circle(x + 150, y + 16, 8, GREY);
  circle(x + 128, y + 14, 5, GREY);
  picFrame(x, y, w, h);
}

// Story 5: cyclone spiral, rain, sea.
function picCyclone(x: number, y: number, w: number, h: number): void {
  fillRect(x, y, w, h, LIGHT);
  const cx = x + Math.floor(w / 2);
  const cy = y + 42;
  // spiral: concentric arcs with rotating gaps, alternating colours
  arc(cx, cy, 38, 30, 300, TEAL, 2);
  arc(cx, cy, 30, 120, 390, NAVY, 2);
  arc(cx, cy, 22, 210, 480, TEAL, 2);
  arc(cx, cy, 14, 300, 570, NAVY, 2);
  // eye
  circle(cx, cy, 7, RED);
  circle(cx, cy, 3, WHITE);
  // rain lines at the sides
  for (const [rx, ry] of [
    [18, 16], [30, 26], [42, 14], [w - 48, 18], [w - 36, 28], [w - 24, 14],
  ]) {
    line(x + rx, y + ry, x + rx - 6, y + ry + 14, NAVY2);
  }
  // sea band
  const seaY = y + h - 22;
  fillRect(x, seaY, w, 22, SEA);
  for (const wy of [seaY + 7, seaY + 14]) {
    for (let wx = x + 8; wx < x + w - 16; wx += 26) {
      hline(wx, wy, 14, WHITE);
    }
  }
  picFrame(x, y, w, h);
}

// Story 6: GTA VI — neon sunset, sun, skyline, palm trees.
function picGta(x: number, y: number, w: number, h: number): void {
  // sunset bands
  fillRect(x, y, w, 24, DARK);
  fillRect(x, y + 24, w, 26, NAVY2);
  fillRect(x, y + 50, w, 26, RED);
  fillRect(x, y + 76, w, 26, GOLD);
  fillRect(x, y + 102, w, 26, RED);
  fillRect(x, y + 128, w, h - 128, DARK);
  // sun
  circle(x + 75, y + 82, 24, GOLD);
  circle(x + 75, y + 82, 24, GOLD);
  // skyline silhouette
  const base = y + h;
  const towers: Array<[number, number, number]> = [
    [0, 44, 28],
    [32, 58, 24],
    [60, 40, 32],
    [96, 52, 22],
    [122, 36, 28],
  ];
  for (const [tx, th, tw] of towers) {
    fillRect(x + tx, base - th, tw, th, INK);
  }
  const wins: Array<[number, number]> = [
    [8, 152], [18, 162], [38, 142], [48, 156], [68, 158], [80, 146],
    [102, 150], [112, 164], [130, 156], [140, 168],
  ];
  for (const [wx, wy] of wins) {
    fillRect(x + wx, y + wy, 2, 3, GOLD);
  }
  // palm tree 1 (left)
  line(x + 46, base, x + 50, y + 96, INK);
  line(x + 47, base, x + 51, y + 96, INK);
  for (const [ex, ey] of [
    [28, 84], [36, 78], [50, 74], [64, 78], [72, 86],
  ]) {
    line(x + 50, y + 96, x + ex, y + ey, INK);
  }
  // palm tree 2 (right, smaller)
  line(x + 128, base, x + 126, y + 112, INK);
  line(x + 129, base, x + 127, y + 112, INK);
  for (const [ex, ey] of [
    [110, 102], [118, 96], [126, 94], [136, 98], [142, 106],
  ]) {
    line(x + 126, y + 112, x + ex, y + ey, INK);
  }
  picFrame(x, y, w, h);
}

// ---------------------------------------------------------------- page layout
function storyBox(x: number, y: number, w: number, h: number): void {
  fillRect(x, y, w, h, WHITE);
  rect(x, y, w, h, INK, 2);
}

function kicker(text: string, x: number, y: number, c: Color): void {
  drawText(text, x, y, 2, c);
  fillRect(x, y + 17, textWidth(2, text), 3, c);
}

function drawMasthead(): void {
  fillRect(0, 0, W, 118, NAVY);
  fillRect(0, 118, W, 6, RED);
  drawGlobe(64, 56, 24);
  drawGlobe(960, 56, 24);
  drawTextCenter("THE WORLD TODAY", 512, 16, 5, WHITE);
  drawTextCenter("THURSDAY 19 NOVEMBER 2026", 512, 58, 3, GOLD);
  drawTextCenter("ONE DAY • ONE PAGE • THE WORLD IN BRIEF", 512, 92, 2, WHITE);
}

function drawLeadRow(): void {
  // Story 1
  storyBox(16, 130, 544, 300);
  picSummit(28, 142, 520, 108);
  kicker("ASIA-PACIFIC", 28, 258, RED);
  drawText("THREE LEADERS", 28, 286, 4, INK);
  drawText("MEET IN SHENZHEN", 28, 320, 4, INK);
  drawPara(
    "Trump, Xi and Putin hold the first-ever trilateral summit at APEC in Shenzhen; nuclear arms and the Iran war top the agenda.",
    28, 360, 520, 2, INK, 16,
  );
  // Story 2
  storyBox(572, 130, 436, 300);
  picGulf(584, 142, 412, 108);
  kicker("MIDDLE EAST", 584, 258, RED);
  drawText("GULF WAR WIDENS", 584, 286, 4, INK);
  drawText("AS IRAN HITS BACK", 584, 320, 4, INK);
  drawPara(
    "Iran strikes a US base in Kuwait and hits Bahrain again; the US hits a missile site on Qeshm Island.",
    584, 360, 412, 2, INK, 16,
  );
}

function drawMiddleRow(): void {
  // Story 3
  storyBox(16, 442, 320, 272);
  picCourt(28, 454, 296, 96);
  kicker("JUSTICE", 28, 558, TEAL);
  drawText("WORLD COURT", 28, 586, 3, INK);
  drawText("RULES ON MYANMAR", 28, 612, 3, INK);
  drawPara(
    "The ICJ delivers its verdict in the Rohingya genocide case - the first ruling on whether a state committed genocide.",
    28, 638, 296, 2, INK, 15,
  );
  // Story 4
  storyBox(348, 442, 320, 272);
  picBridge(360, 454, 296, 96);
  kicker("UKRAINE", 360, 558, BLUE);
  drawText("CRIMEAN BRIDGE", 360, 586, 3, INK);
  drawText("HIT AGAIN", 360, 612, 3, INK);
  drawPara(
    "The Crimean Bridge is attacked again, Moscow says, as the bridge war escalates.",
    360, 638, 296, 2, INK, 15,
  );
  // Story 5
  storyBox(680, 442, 320, 272);
  picCyclone(692, 454, 296, 96);
  kicker("WEATHER", 692, 558, BLUE);
  drawText("CYCLONE AKVAN", 692, 586, 3, INK);
  drawText("NEARS LAND", 692, 612, 3, INK);
  drawPara(
    "The Bay of Bengal storm is set to cross between Machilipatnam and Puri on India's east coast.",
    692, 638, 296, 2, INK, 15,
  );
}

function drawBottomRow(): void {
  // GTA VI
  storyBox(16, 726, 500, 212);
  picGta(28, 738, 150, 188);
  kicker("CULTURE", 190, 742, RED);
  drawText("GTA VI ARRIVES", 190, 768, 3, INK);
  drawPara(
    "After a 13-year wait, Grand Theft Auto VI begins its global rollout; gamers enter Vice City.",
    190, 802, 314, 2, INK, 15,
  );
  // Also today
  storyBox(528, 726, 480, 212);
  drawText("ALSO TODAY", 542, 738, 2, NAVY);
  fillRect(542, 756, textWidth(2, "ALSO TODAY"), 3, NAVY);
  const items: Array<[string, number]> = [
    ["Democrats nominate Hakeem Jeffries for Speaker - he would be the first Black Speaker.", 772],
    ["Van Gogh sells for a record $190.4M after a row over its Nazi history.", 818],
    ["Voyager 1 nears one light-day from Earth; NASA to confirm on Thursday.", 861],
    ["NVIDIA halts H-chip shipments to China days after founder Jensen Huang resigned.", 904],
  ];
  for (const [text, iy] of items) {
    drawPara(text, 542, iy, 452, 2, INK, 15);
  }
}

function drawFooter(): void {
  fillRect(16, 948, 992, 2, INK);
  drawTextCenter("NEWS AS REPORTED IN THE EARLY HOURS OF THURSDAY 19 NOVEMBER 2026", 512, 962, 2, INK);
  drawTextCenter("DRAWN ENTIRELY IN CODE • NO PHOTOGRAPHS", 512, 986, 2, GREY);
}

function drawPage(): void {
  fillRect(0, 0, W, H, PAPER);
  drawMasthead();
  drawLeadRow();
  drawMiddleRow();
  drawBottomRow();
  drawFooter();
}

function main(): void {
  drawPage();
  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "entry.png"), encodePNG());
}

main();
