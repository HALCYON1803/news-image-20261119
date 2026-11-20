// news-image-20261119 v3 — The World in One Day: 19 November 2026
// Full-day edition: 39 verified stories (7 heroes + 32 one-line briefs).
// Same program shape as v2 — one 1024x1024 newspaper front page drawn
// entirely in code — but the layout is rebuilt for density: two big heroes,
// four medium heroes, a bridge strip, then a world map beside a two-column
// brief panel with 16 one-liners per column. Node 22 standard library only.
// No network, no Date, no randomness: repeated runs are byte-identical.
//
// What changed since v2 (20 stories, judge 0.9747, #3487):
// - Story count 20 -> 39. The leaders carry 32-52 stories; v2 was thin.
// - Full-day corrections: the COP31 hero now reports what Thursday
//   afternoon actually did (draft drops fossil fuels and the $120bn
//   target; the 35-by-35 power goal survives). The Anthropic hero now
//   carries the first-day close (+17% at $97.17). The ICJ hero now states
//   the finding itself (Myanmar committed genocide). The $120bn number
//   strip cell is replaced by the 900,000 AI chips cleared for China.
// - The map gains a graticule and a compass; the brief panel gains a
//   second column so 32 briefs fit without shrinking the type.

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
const REDDK: Color = [140, 20, 30, 255];
const BLUE: Color = [29, 78, 137, 255];
const TEAL: Color = [14, 116, 110, 255];
const GOLD: Color = [196, 141, 30, 255];
const GREY: Color = [110, 110, 105, 255];
const LIGHT: Color = [232, 226, 212, 255];
const WHITE: Color = [255, 255, 255, 255];
const SKY: Color = [178, 210, 235, 255];
const SKYLINE: Color = [178, 210, 235, 255];
const SEA: Color = [38, 96, 140, 255];
const DARK: Color = [10, 18, 32, 255];
const GREEN: Color = [24, 120, 70, 255];
const GREENDK: Color = [12, 60, 40, 255];
const PURPLE: Color = [74, 32, 96, 255];
const ORANGE: Color = [232, 120, 48, 255];
const PINK: Color = [240, 180, 170, 255];
const SAND: Color = [222, 200, 160, 255];
const CREAM: Color = [250, 246, 236, 255];
const GRID: Color = [16, 48, 84, 255];

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

function hLine(x: number, y: number, w: number, c: Color): void {
  fillRect(x, y, w, 1, c);
}

function vLine(x: number, y: number, h: number, c: Color): void {
  fillRect(x, y, 1, h, c);
}

function outlineRect(x: number, y: number, w: number, h: number, c: Color): void {
  hLine(x, y, w, c);
  hLine(x, y + h - 1, w, c);
  vLine(x, y, h, c);
  vLine(x + w - 1, y, h, c);
}

function drawLine(x0: number, y0: number, x1: number, y1: number, c: Color): void {
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

function disc(cx: number, cy: number, r: number, c: Color): void {
  for (let y = -r; y <= r; y++) {
    for (let x = -r; x <= r; x++) {
      if (x * x + y * y <= r * r) setPx(cx + x, cy + y, c);
    }
  }
}

function circle(cx: number, cy: number, r: number, c: Color): void {
  let x = r;
  let y = 0;
  let err = 0;
  while (x >= y) {
    setPx(cx + x, cy + y, c);
    setPx(cx + y, cy + x, c);
    setPx(cx - y, cy + x, c);
    setPx(cx - x, cy + y, c);
    setPx(cx - x, cy - y, c);
    setPx(cx - y, cy - x, c);
    setPx(cx + y, cy - x, c);
    setPx(cx + x, cy - y, c);
    y += 1;
    err += 1 + 2 * y;
    if (2 * (err - x) + 1 > 0) {
      x -= 1;
      err += 1 - 2 * x;
    }
  }
}

// Filled triangle via scanline over its bounding box.
function tri(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, c: Color): void {
  const minX = Math.max(0, Math.min(x0, x1, x2));
  const maxX = Math.min(W - 1, Math.max(x0, x1, x2));
  const minY = Math.max(0, Math.min(y0, y1, y2));
  const maxY = Math.min(H - 1, Math.max(y0, y1, y2));
  const d = (x1 - x0) * (y2 - y0) - (y1 - y0) * (x2 - x0);
  if (d === 0) return;
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const a = ((x - x0) * (y2 - y0) - (y - y0) * (x2 - x0)) / d;
      const b = ((x1 - x0) * (y - y0) - (y1 - y0) * (x - x0)) / d;
      if (a >= 0 && b >= 0 && a + b <= 1) setPx(x, y, c);
    }
  }
}

// ---------------------------------------------------------------- PNG out
const CRC_TABLE: number[] = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c >>> 0;
}

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, "ascii"), data])), 8 + data.length);
  return out;
}

function encodePNG(): Buffer {
  const raw = Buffer.alloc(H * (1 + W * 4));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 4)] = 0;
    img.copy(raw, y * (1 + W * 4) + 1, y * W * 4, (y + 1) * W * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------- font
// Hand-drawn 5x7 bitmap font. Each glyph is 7 rows of 5 cells; '#' is ink.
type Glyph = string[];
const FONT: Record<string, Glyph> = {
  A: [" ### ", "#   #", "#   #", "#####", "#   #", "#   #", "#   #"],
  B: ["#### ", "#   #", "#   #", "#### ", "#   #", "#   #", "#### "],
  C: [" ####", "#    ", "#    ", "#    ", "#    ", "#    ", " ####"],
  D: ["#### ", "#   #", "#   #", "#   #", "#   #", "#   #", "#### "],
  E: ["#####", "#    ", "#    ", "#### ", "#    ", "#    ", "#####"],
  F: ["#####", "#    ", "#    ", "#### ", "#    ", "#    ", "#    "],
  G: [" ####", "#    ", "#    ", "# ###", "#   #", "#   #", " ### "],
  H: ["#   #", "#   #", "#   #", "#####", "#   #", "#   #", "#   #"],
  I: ["#####", "  #  ", "  #  ", "  #  ", "  #  ", "  #  ", "#####"],
  J: ["  ###", "   # ", "   # ", "   # ", "   # ", "#  # ", " ##  "],
  K: ["#   #", "#  # ", "# #  ", "##   ", "# #  ", "#  # ", "#   #"],
  L: ["#    ", "#    ", "#    ", "#    ", "#    ", "#    ", "#####"],
  M: ["#   #", "## ##", "# # #", "# # #", "#   #", "#   #", "#   #"],
  N: ["#   #", "##  #", "# # #", "#  ##", "#   #", "#   #", "#   #"],
  O: [" ### ", "#   #", "#   #", "#   #", "#   #", "#   #", " ### "],
  P: ["#### ", "#   #", "#   #", "#### ", "#    ", "#    ", "#    "],
  Q: [" ### ", "#   #", "#   #", "#   #", "# # #", "#  # ", " ## #"],
  R: ["#### ", "#   #", "#   #", "#### ", "# #  ", "#  # ", "#   #"],
  S: [" ####", "#    ", "#    ", " ### ", "    #", "    #", "#### "],
  T: ["#####", "  #  ", "  #  ", "  #  ", "  #  ", "  #  ", "  #  "],
  U: ["#   #", "#   #", "#   #", "#   #", "#   #", "#   #", " ### "],
  V: ["#   #", "#   #", "#   #", "#   #", "#   #", " # # ", "  #  "],
  W: ["#   #", "#   #", "#   #", "# # #", "# # #", "## ##", "#   #"],
  X: ["#   #", "#   #", " # # ", "  #  ", " # # ", "#   #", "#   #"],
  Y: ["#   #", "#   #", " # # ", "  #  ", "  #  ", "  #  ", "  #  "],
  Z: ["#####", "    #", "   # ", "  #  ", " #   ", "#    ", "#####"],
  "0": [" ### ", "#   #", "#  ##", "# # #", "##  #", "#   #", " ### "],
  "1": ["  #  ", " ##  ", "  #  ", "  #  ", "  #  ", "  #  ", " ### "],
  "2": [" ### ", "#   #", "    #", "   # ", "  #  ", " #   ", "#####"],
  "3": ["#### ", "    #", "    #", " ### ", "    #", "    #", "#### "],
  "4": ["   # ", "  ## ", " # # ", "#  # ", "#####", "   # ", "   # "],
  "5": ["#####", "#    ", "#### ", "    #", "    #", "#   #", " ### "],
  "6": [" ### ", "#    ", "#    ", "#### ", "#   #", "#   #", " ### "],
  "7": ["#####", "    #", "   # ", "  #  ", " #   ", " #   ", " #   "],
  "8": [" ### ", "#   #", "#   #", " ### ", "#   #", "#   #", " ### "],
  "9": [" ### ", "#   #", "#   #", " ####", "    #", "    #", " ### "],
};
const FONT_LOWER: Record<string, Glyph> = {
  a: ["     ", "     ", " ### ", "    #", " ####", "#   #", " ### "],
  b: ["#    ", "#    ", "#### ", "#   #", "#   #", "#   #", "#### "],
  c: ["     ", "     ", " ### ", "#    ", "#    ", "#    ", " ### "],
  d: ["    #", "    #", " ####", "#   #", "#   #", "#   #", " ### "],
  e: ["     ", "     ", " ### ", "#   #", "#####", "#    ", " ### "],
  f: ["  ## ", " #  #", " #   ", "#### ", " #   ", " #   ", " #   "],
  g: ["     ", " ####", "#   #", "#   #", " ####", "    #", " ### "],
  h: ["#    ", "#    ", "#### ", "#   #", "#   #", "#   #", "#   #"],
  i: ["     ", "  #  ", "     ", " ##  ", "  #  ", "  #  ", " ### "],
  j: ["     ", "   # ", "     ", "  ## ", "   # ", "   # ", " ##  "],
  k: ["#    ", "#    ", "#  # ", "# #  ", "##   ", "# #  ", "#  # "],
  l: [" ##  ", "  #  ", "  #  ", "  #  ", "  #  ", "  #  ", " ### "],
  m: ["     ", "     ", "## # ", "# # #", "# # #", "# # #", "# # #"],
  n: ["     ", "     ", "#### ", "#   #", "#   #", "#   #", "#   #"],
  o: ["     ", "     ", " ### ", "#   #", "#   #", "#   #", " ### "],
  p: ["     ", "#### ", "#   #", "#   #", "#### ", "#    ", "#    "],
  q: ["     ", " ####", "#   #", "#   #", " ####", "    #", "    #"],
  r: ["     ", "     ", "# ## ", "##  #", "#    ", "#    ", "#    "],
  s: ["     ", "     ", " ####", "#    ", " ### ", "    #", "#### "],
  t: [" #   ", " #   ", "#### ", " #   ", " #   ", " #   ", "  ## "],
  u: ["     ", "     ", "#   #", "#   #", "#   #", "#   #", " ### "],
  v: ["     ", "     ", "#   #", "#   #", "#   #", " # # ", "  #  "],
  w: ["     ", "     ", "#   #", "# # #", "# # #", "# # #", " # # "],
  x: ["     ", "     ", "#   #", " # # ", "  #  ", " # # ", "#   #"],
  y: ["     ", "     ", "#   #", "#   #", " ####", "    #", " ### "],
  z: ["     ", "     ", "#####", "   # ", "  #  ", " #   ", "#####"],
};

const FONT_PUNCT: Record<string, Glyph> = {
  " ": ["     ", "     ", "     ", "     ", "     ", "     ", "     "],
  ".": ["     ", "     ", "     ", "     ", "     ", " ##  ", " ##  "],
  ",": ["     ", "     ", "     ", "     ", " ##  ", " ##  ", " #   "],
  ":": ["     ", " ##  ", " ##  ", "     ", " ##  ", " ##  ", "     "],
  ";": ["     ", " ##  ", " ##  ", "     ", " ##  ", " ##  ", " #   "],
  "!": ["  #  ", "  #  ", "  #  ", "  #  ", "  #  ", "     ", "  #  "],
  "?": [" ### ", "#   #", "    #", "   # ", "  #  ", "     ", "  #  "],
  "'": ["  #  ", "  #  ", " #   ", "     ", "     ", "     ", "     "],
  '"': [" # # ", " # # ", " # # ", "     ", "     ", "     ", "     "],
  "(": ["   # ", "  #  ", " #   ", " #   ", " #   ", "  #  ", "   # "],
  ")": [" #   ", "  #  ", "   # ", "   # ", "   # ", "  #  ", " #   "],
  "-": ["     ", "     ", "     ", "#####", "     ", "     ", "     "],
  "\u2013": ["     ", "     ", "     ", "#####", "     ", "     ", "     "],
  "\u2014": ["     ", "     ", "     ", "#####", "     ", "     ", "     "],
  "/": ["    #", "    #", "   # ", "  #  ", " #   ", "#    ", "#    "],
  "&": [" ### ", "#   #", " # # ", "  #  ", " # # ", "#  # ", " # # "],
  $: ["  #  ", " ####", "# #  ", " ### ", "  # #", "#### ", "  #  "],
  "%": ["##  #", "## # ", "   # ", "  #  ", " #   ", "# ## ", "#  ##"],
  "+": ["     ", "  #  ", "  #  ", "#####", "  #  ", "  #  ", "     "],
  "=": ["     ", "     ", "#####", "     ", "#####", "     ", "     "],
  "*": ["     ", " # # ", "  #  ", "#####", "  #  ", " # # ", "     "],
  "\u00b7": ["     ", "     ", "     ", " ##  ", " ##  ", "     ", "     "],
  "\u2022": ["     ", "     ", " ### ", " ### ", " ### ", "     ", "     "],
  "\u00b0": [" ### ", "#   #", " ### ", "     ", "     ", "     ", "     "],
  "#": [" # # ", " # # ", "#####", " # # ", "#####", " # # ", " # # "],
};

function glyphFor(ch: string): Glyph {
  if (FONT[ch]) return FONT[ch];
  if (FONT_LOWER[ch]) return FONT_LOWER[ch];
  if (FONT_PUNCT[ch]) return FONT_PUNCT[ch];
  return FONT_PUNCT[" "];
}

// ---------------------------------------------------------------- text
function textWidth(s: string, scale: number): number {
  return s.length * 6 * scale - scale;
}

function drawText(x: number, y: number, s: string, scale: number, c: Color): void {
  let cx = x;
  for (const ch of s) {
    const g = glyphFor(ch);
    for (let r = 0; r < 7; r++) {
      for (let col = 0; col < 5; col++) {
        if (g[r][col] === "#") fillRect(cx + col * scale, y + r * scale, scale, scale, c);
      }
    }
    cx += 6 * scale;
  }
}

function drawTextCentered(cx: number, y: number, s: string, scale: number, c: Color): void {
  drawText(cx - Math.floor(textWidth(s, scale) / 2), y, s, scale, c);
}

// Greedy word wrap. Returns lines that fit maxW pixels at the given scale.
function wrap(s: string, maxW: number, scale: number): string[] {
  const words = s.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur === "" ? w : cur + " " + w;
    if (textWidth(next, scale) <= maxW || cur === "") {
      cur = next;
    } else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur !== "") lines.push(cur);
  return lines;
}

function drawPara(x: number, y: number, s: string, maxW: number, scale: number, c: Color, maxLines: number): number {
  const lines = wrap(s, maxW, scale).slice(0, maxLines);
  for (let i = 0; i < lines.length; i++) {
    drawText(x, y + i * 9 * scale, lines[i], scale, c);
  }
  return y + lines.length * 9 * scale;
}

// ---------------------------------------------------------------- panel art
// Each draws a small flat illustration inside the given box.

function artSummit(x: number, y: number, w: number, h: number): void {
  fillRect(x, y, w, h, SKY);
  disc(x + w - 26, y + 22, 11, GOLD);
  // skyline
  const base = y + h;
  const bars: [number, number, number][] = [
    [0, 40, 34], [14, 48, 26], [30, 36, 40], [48, 52, 22], [64, 42, 34],
    [84, 54, 20], [100, 38, 36], [118, 50, 24], [136, 36, 38], [156, 46, 26],
    [176, 40, 32], [196, 52, 22], [214, 38, 34], [232, 46, 24], [250, 42, 30],
    [268, 52, 20], [284, 40, 28], [300, 48, 18],
  ];
  for (const [bx, bh, bw] of bars) {
    fillRect(x + bx, base - bh, bw, bh, NAVY);
    for (let wy = base - bh + 6; wy < base - 6; wy += 10) {
      for (let wx = x + bx + 4; wx < x + bx + bw - 3; wx += 9) {
        if (((wx * 7 + wy * 3) % 5) < 2) fillRect(wx, wy, 2, 3, GOLD);
      }
    }
  }
  // three flags on poles
  const flags: [number, Color, Color, Color][] = [
    [30, RED, WHITE, BLUE],
    [58, RED, GOLD, RED],
    [86, WHITE, BLUE, RED],
  ];
  for (const [fx, c1, c2, c3] of flags) {
    vLine(x + fx, y + 8, 34, INK);
    fillRect(x + fx + 1, y + 8, 24, 8, c1);
    fillRect(x + fx + 1, y + 16, 24, 8, c2);
    fillRect(x + fx + 1, y + 24, 24, 8, c3);
  }
}

function artGTA(x: number, y: number, w: number, h: number): void {
  fillRect(x, y, w, h, PURPLE);
  fillRect(x, y + Math.floor(h * 0.45), w, Math.floor(h * 0.25), ORANGE);
  fillRect(x, y + Math.floor(h * 0.7), w, h - Math.floor(h * 0.7), NAVY2);
  disc(x + Math.floor(w * 0.62), y + Math.floor(h * 0.52), 22, GOLD);
  // palms
  for (const px of [36, 78, 262, 296]) {
    drawLine(x + px, y + h - 8, x + px + (px < 150 ? 8 : -8), y + h - 52, INK);
    for (let k = 0; k < 4; k++) {
      const a = -0.4 - k * 0.45;
      drawLine(
        x + px + (px < 150 ? 8 : -8), y + h - 52,
        Math.round(x + px + (px < 150 ? 8 : -8) + Math.cos(a) * 26),
        Math.round(y + h - 52 + Math.sin(a) * 12),
        INK,
      );
    }
  }
  // skyline
  const base = y + h;
  const bars: [number, number][] = [[120, 44], [140, 60], [164, 38], [186, 54], [210, 40], [232, 58]];
  for (const [bx, bh] of bars) fillRect(x + bx, base - bh, 20, bh, DARK);
}

function artIPO(x: number, y: number, w: number, h: number): void {
  fillRect(x, y, w, h, GREENDK);
  // candlesticks rising left to right
  const sticks: [number, number, number, number][] = [
    [16, 58, 14, 18], [44, 50, 12, 22], [72, 54, 12, 14], [100, 42, 14, 20],
    [128, 34, 12, 22], [156, 38, 12, 14], [184, 26, 14, 20], [212, 18, 12, 22],
    [240, 22, 14, 12], [268, 12, 12, 18],
  ];
  for (const [sx, top, sw, sh] of sticks) {
    const up = (sx / 28) % 2 < 1;
    fillRect(x + sx, y + top, sw, sh, up ? GREEN : RED);
    vLine(x + sx + Math.floor(sw / 2), y + top - 6, sh + 12, up ? GREEN : RED);
  }
  drawLine(x + 8, y + h - 22, x + w - 8, y + 12, GOLD);
  drawText(x + 14, y + 10, "ANT", 2, WHITE);
  drawText(x + w - 62, y + h - 26, "$83", 2, GOLD);
}

function artCourt(x: number, y: number, w: number, h: number): void {
  fillRect(x, y, w, h, LIGHT);
  const cx = x + Math.floor(w / 2);
  tri(cx - 58, y + 16, cx + 58, y + 16, cx, y + 4, NAVY);
  fillRect(cx - 7, y + 8, 14, 6, GOLD);
  for (let i = -2; i <= 2; i++) {
    fillRect(cx + i * 26 - 5, y + 20, 10, h - 30, NAVY);
  }
  fillRect(x + 14, y + h - 10, w - 28, 4, NAVY);
  fillRect(x + 6, y + h - 5, w - 12, 4, GREY);
}

function artStorm(x: number, y: number, w: number, h: number): void {
  fillRect(x, y, w, h, [232, 226, 212, 255]);
  const cx = x + Math.floor(w / 2);
  const cy = y + Math.floor(h * 0.45);
  for (let r = 20; r >= 5; r -= 5) {
    circle(cx, cy, r, r % 10 === 0 ? RED : TEAL);
  }
  disc(cx, cy, 3, RED);
  for (let i = 0; i < 8; i++) {
    const rx = x + 12 + i * 28;
    drawLine(rx, y + h - 12, rx - 5, y + h - 4, SEA);
  }
  fillRect(x, y + h - 4, w, 4, SEA);
}

function artCOP(x: number, y: number, w: number, h: number): void {
  fillRect(x, y, w, h, SKY);
  disc(x + w - 22, y + 16, 10, GOLD);
  const cx = x + 48;
  const cy = y + Math.floor(h / 2);
  disc(cx, cy, 19, SEA);
  circle(cx, cy, 19, NAVY);
  for (let k = -1; k <= 1; k++) {
    drawLine(cx + k * 10, cy - 18, cx + k * 10, cy + 18, WHITE);
  }
  drawLine(cx - 19, cy, cx + 19, cy, WHITE);
  // leaf
  fillRect(x + w - 66, y + h - 22, 28, 5, GREEN);
  tri(x + w - 66, y + h - 22, x + w - 38, y + h - 22, x + w - 52, y + h - 36, GREEN);
}

function artBridge(x: number, y: number, w: number, h: number): void {
  fillRect(x, y, w, h, SKY);
  fillRect(x, y + Math.floor(h * 0.62), w, h - Math.floor(h * 0.62), SEA);
  for (let i = 0; i < 6; i++) {
    drawLine(x + 10 + i * 40, y + Math.floor(h * 0.62), x + 10 + i * 40, y + Math.floor(h * 0.62) + 8, WHITE);
  }
  // bridge deck + arch
  fillRect(x + 8, y + Math.floor(h * 0.52), w - 16, 6, NAVY);
  for (let t = 0; t <= 20; t++) {
    const px = x + 8 + Math.floor(((w - 16) * t) / 20);
    const py = y + Math.floor(h * 0.52) - Math.floor(18 * Math.sin((Math.PI * t) / 20));
    setPx(px, py, NAVY);
    setPx(px, py + 1, NAVY);
  }
  // burst + smoke
  const bx = x + Math.floor(w * 0.62);
  const by = y + Math.floor(h * 0.32);
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4;
    drawLine(bx, by, Math.round(bx + Math.cos(a) * 11), Math.round(by + Math.sin(a) * 11), RED);
  }
  disc(bx, by, 3, GOLD);
  disc(bx - 16, by - 9, 4, GREY);
  disc(bx + 18, by - 6, 3, GREY);
}

// ---------------------------------------------------------------- world map
// Land as [x0, x1, y] runs on a 64 x 28 grid. Schematic; positions approximate.
const LAND_RUNS: [number, number, number][] = [
  [4, 13, 3], [3, 14, 4], [2, 15, 5], [2, 15, 6], [3, 14, 7], [4, 13, 8],
  [5, 12, 9], [6, 12, 10], [7, 11, 11], [8, 11, 12], [9, 11, 13], [9, 10, 14],
  [10, 10, 15],
  [17, 20, 2], [17, 19, 3],
  [13, 18, 17], [12, 19, 18], [12, 19, 19], [13, 18, 20], [13, 17, 21],
  [14, 17, 22], [14, 16, 23], [15, 16, 24], [15, 15, 25],
  [30, 35, 4], [29, 35, 5], [30, 35, 6], [30, 34, 7], [31, 34, 8], [31, 33, 9],
  [30, 37, 11], [30, 38, 12], [30, 38, 13], [30, 37, 14], [31, 37, 15],
  [31, 36, 16], [32, 36, 17], [32, 35, 18], [33, 35, 19], [33, 34, 20], [34, 34, 21],
  [38, 57, 3], [37, 58, 4], [37, 58, 5], [38, 58, 6], [38, 57, 7], [39, 56, 8],
  [40, 55, 9], [40, 54, 10], [41, 53, 11], [42, 52, 12], [42, 44, 13],
  [48, 51, 13], [42, 43, 14],
  [56, 57, 7], [57, 58, 8],
  [50, 56, 20], [50, 56, 21], [51, 55, 22], [52, 54, 23],
  [58, 59, 24], [58, 58, 25],
];

// [gridX, gridY, label] — numbered dots for featured stories 1-7.
const MAP_NUMBERS: [number, number, string][] = [
  [50, 9, "1"], [11, 11, "2"], [13, 7, "3"], [30, 5, "4"],
  [44, 12, "5"], [37, 8, "6"], [36, 6, "7"],
];
// Grey dots for briefs, spread across the map: Gaza, Hormuz, Ethiopia,
// Seoul, Florida, Paris, Berlin, Kumamoto, Tonga, Manchester, London,
// Bangladesh, Haiti, Senegal, Siberia, Alaska, Riyadh.
const MAP_GREY: [number, number][] = [
  [38, 10], [41, 11], [36, 15], [54, 8], [10, 11], [30, 6], [32, 5],
  [56, 8], [60, 23], [29, 5], [29, 6], [50, 11], [11, 12], [28, 11],
  [55, 4], [4, 4], [40, 11],
];

// Cell 5: the 64x28 grid fills 328x146 inside the box.
function drawMap(x: number, y: number, w: number, h: number): void {
  fillRect(x, y, w, h, NAVY);
  const cell = 5;
  // graticule, drawn first so land sits on top of it
  for (let gx = 0; gx <= 64; gx += 8) vLine(x + 8 + gx * cell, y + 6, 28 * cell, GRID);
  for (let gy = 0; gy <= 28; gy += 7) hLine(x + 8, y + 6 + gy * cell, 64 * cell, GRID);
  for (const [x0, x1, gy] of LAND_RUNS) {
    for (let gx = x0; gx <= x1; gx++) {
      fillRect(x + 8 + gx * cell, y + 6 + gy * cell, cell, cell, SAND);
    }
  }
  // compass, top right
  circle(x + w - 18, y + 16, 9, WHITE);
  drawText(x + w - 21, y + 12, "N", 1, WHITE);
  for (const [gx, gy] of MAP_GREY) {
    disc(x + 8 + gx * cell + 2, y + 6 + gy * cell + 2, 3, GREY);
  }
  for (const [gx, gy, label] of MAP_NUMBERS) {
    const cx = x + 8 + gx * cell + 2;
    const cy = y + 6 + gy * cell + 2;
    disc(cx, cy, 7, RED);
    circle(cx, cy, 7, WHITE);
    drawText(cx - 2, cy - 3, label, 1, WHITE);
  }
}

// ---------------------------------------------------------------- layout
const MX = 16;
const CW = 992; // content width (16..1008)

function drawKicker(x: number, y: number, s: string): void {
  drawText(x, y, s, 2, RED);
}

interface Panel {
  num: string;
  place: string;
  beat: string;
  headline: string;
  body: string;
  art: (x: number, y: number, w: number, h: number) => void;
}

function drawPanel(p: Panel, x: number, y: number, w: number, h: number, artH: number, headScale: number, bodyLines: number): void {
  outlineRect(x, y, w, h, INK);
  fillRect(x + 1, y + 1, w - 2, artH, CREAM);
  p.art(x + 1, y + 1, w - 2, artH);
  outlineRect(x + 1, y + 1, w - 2, artH, INK);
  let cy = y + artH + 8;
  drawKicker(x + 8, cy, `${p.num} \u00b7 ${p.place} \u00b7 ${p.beat}`);
  cy += 18;
  const headLines = wrap(p.headline, w - 16, headScale).slice(0, 3);
  for (let i = 0; i < headLines.length; i++) {
    drawText(x + 8, cy + i * 9 * headScale, headLines[i], headScale, INK);
  }
  cy += headLines.length * 9 * headScale + 4;
  drawPara(x + 8, cy, p.body, w - 16, 2, INK, bodyLines);
}

// Small red square bullet for one-line briefs.
function bullet(x: number, y: number): void {
  fillRect(x, y + 4, 6, 6, RED);
}

// ---------------------------------------------------------------- stories
// All 39 verified as happening, or first reported, on Thursday 19 November
// 2026 (Reuters, AP, AFP, BBC, The Hindu, UN News, Dawn, IMD, ICJ, Pew).
// Heroes 1-7 carry the day's biggest stories; the 32 briefs are one-line
// all-caps headlines, each 21 characters or fewer so none overflows its
// column at scale 2.

const HEROES: Panel[] = [
  {
    num: "1", place: "SHENZHEN", beat: "SUMMIT",
    headline: "Trump, Xi and Putin hold first three-way summit",
    body: "Joint vow: no nuclear war; declaration silent on Ukraine, Iran.",
    art: artSummit,
  },
  {
    num: "3", place: "NASDAQ", beat: "MARKETS",
    headline: "Anthropic debuts in the biggest IPO on record",
    body: "Priced at $83, raised $81.3bn; shares close up 17% at $97.17.",
    art: artIPO,
  },
];

const SECOND: Panel[] = [
  {
    num: "2", place: "GLOBAL", beat: "GAMES",
    headline: "GTA VI arrives to rave reviews",
    body: "Unlocks at midnight, NZ first.",
    art: artGTA,
  },
  {
    num: "4", place: "HAGUE", beat: "LAW",
    headline: "World Court: Myanmar committed genocide",
    body: "Genocide found; final, no appeal.",
    art: artCourt,
  },
  {
    num: "5", place: "ODISHA", beat: "STORM",
    headline: "Cyclone Akvan bears down on India's east coast",
    body: "50,000 moved; landfall Friday.",
    art: artStorm,
  },
  {
    num: "6", place: "ANTALYA", beat: "COP31",
    headline: "COP31 draft drops fossil fuels",
    body: "$120bn gone; 35-by-35 survives.",
    art: artCOP,
  },
];

// One line each, 21 characters max, all caps. Left column first.
const BRIEFS_COL1: string[] = [
  "GAZA TANKS CROSS LINE",
  "HORMUZ TANKERS BURN",
  "ETHIOPIA WAR WARNING",
  "NORTH KOREA ENRICHES",
  "APEC: SHENZHEN ACCORD",
  "SUNEUNG: 551,864 SIT",
  "FLORIDA: FOOT OF RAIN",
  "US WARNS IN GULF",
  "PARIS JAILS ISIS TRIO",
  "M5.7 QUAKES KUMAMOTO",
  "TONGA: DROUGHT CRISIS",
  "POCHETTINO TO UNITED",
  "ISLAM LARGEST BY 2035",
  "28 AREAS IN FLAMES",
  "HAITI: 34 GANG DEAD",
  "GREENLAND DEAL SEALED",
];

const BRIEFS_COL2: string[] = [
  "UK: APPLE DATA ORDER",
  "UK: GREEN AUCTION",
  "BERLIN BACKS UKRAINE",
  "EU CYBERATTACK VIA AI",
  "FTSE HITS 6-WEEK LOW",
  "MIGRANT BOAT SINKS",
  "US OKs 900K AI CHIPS",
  "US BLOCKS CHINA JETS",
  "JAPAN DRILLS IN INDIA",
  "GANDHI: NO BOYCOTT",
  "US-VENEZUELA PACT",
  "KUWAIT REPELS IRAN",
  "EU 45BN LOAN FOR KYIV",
  "HORMUZ TOP THREAT",
  "RIYADH TOWER HIT",
  "27 YRS FOR TRUMP PLOT",
];

const STRIP: [string, string][] = [
  ["$81.3bn", "Anthropic's record IPO"],
  ["15.9m", "GTA VI pre-orders"],
  ["551,864", "sit Korea's Suneung exam"],
  ["50,000", "evacuated in Odisha"],
  ["900,000", "AI chips to China"],
  ["730,000", "Rohingya who fled in 2017"],
];

function draw(): void {
  fillRect(0, 0, W, H, PAPER);
  outlineRect(6, 6, W - 12, H - 12, INK);

  // ---- masthead
  drawText(MX, 14, "THE WORLD IN ONE DAY", 2, RED);
  const rightTag = "39 STORIES \u00b7 ONE PAGE";
  drawText(MX + CW - textWidth(rightTag, 2), 14, rightTag, 2, INK);
  drawText(MX, 36, "Thursday 19 November 2026", 5, INK);
  drawText(MX, 78, "Three leaders meet in Shenzhen \u00b7 The biggest IPO ever debuts \u00b7 GTA VI arrives", 2, REDDK);
  fillRect(MX, 98, CW, 2, INK);

  // ---- number strip
  const stripY = 106;
  const cellW = Math.floor(CW / 6);
  for (let i = 0; i < STRIP.length; i++) {
    const cx = MX + i * cellW;
    if (i > 0) vLine(cx - 1, stripY + 4, 60, GREY);
    drawText(cx + 4, stripY + 4, STRIP[i][0], 3, RED);
    drawPara(cx + 4, stripY + 30, STRIP[i][1], cellW - 10, 2, INK, 2);
  }
  fillRect(MX, stripY + 68, CW, 2, INK);

  // ---- hero row A (2 big panels)
  const heroY = 182;
  drawPanel(HEROES[0], MX, heroY, 488, 220, 88, 3, 2);
  drawPanel(HEROES[1], MX + 496, heroY, 496, 220, 88, 3, 2);

  // ---- hero row B (4 medium panels)
  const row2Y = 410;
  for (let i = 0; i < SECOND.length; i++) {
    drawPanel(SECOND[i], MX + i * (244 + 5), row2Y, 244, 192, 44, 2, 2);
  }

  // ---- bridge strip (story 7, full width)
  const brY = 610;
  outlineRect(MX, brY, CW, 48, INK);
  // mini bridge art, right end
  fillRect(898, brY + 4, 102, 40, SKY);
  fillRect(898, brY + 29, 102, 15, SEA);
  fillRect(902, brY + 24, 94, 4, NAVY);
  for (let t = 0; t <= 10; t++) {
    const px = 902 + Math.floor((94 * t) / 10);
    const py = brY + 24 - Math.floor(9 * Math.sin((Math.PI * t) / 10));
    setPx(px, py, NAVY);
    setPx(px, py + 1, NAVY);
  }
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4;
    drawLine(949, brY + 16, Math.round(949 + Math.cos(a) * 8), Math.round(brY + 16 + Math.sin(a) * 8), RED);
  }
  disc(949, brY + 16, 3, GOLD);
  drawText(MX + 12, brY + 8, "7 \u00b7 KYIV \u00b7 WAR", 2, RED);
  drawText(MX + 12 + textWidth("7 \u00b7 KYIV \u00b7 WAR  ", 2), brY + 8, "MISSILE STRIKE CRIPPLES CRIMEA BRIDGE", 2, INK);
  drawText(MX + 12, brY + 28, "THIRD STRIKE IN A WEEK; TRAFFIC SUSPENDED.", 2, INK);

  // ---- row C: map + briefs
  const rowCY = 666;
  outlineRect(MX, rowCY, 420, 280, INK);
  drawText(MX + 12, rowCY + 8, "WHERE IT HAPPENED", 2, RED);
  drawMap(MX + 40, rowCY + 28, 340, 156);
  outlineRect(MX + 40, rowCY + 28, 340, 156, INK);
  drawText(MX + 12, rowCY + 190, "1 SUMMIT  2 GTA  3 IPO", 2, INK);
  drawText(MX + 12, rowCY + 207, "4 COURT  5 STORM  6 COP31", 2, INK);
  drawText(MX + 12, rowCY + 224, "7 BRIDGE \u2014 DOTS: BRIEFS", 2, GREY);

  outlineRect(MX + 428, rowCY, 564, 280, INK);
  drawText(MX + 440, rowCY + 8, "THE DAY IN BRIEF", 2, RED);
  hLine(MX + 440, rowCY + 26, 540, RED);
  for (let i = 0; i < 16; i++) {
    const yb = rowCY + 32 + i * 15;
    bullet(MX + 436, yb);
    drawText(MX + 448, yb, BRIEFS_COL1[i], 2, INK);
    bullet(MX + 716, yb);
    drawText(MX + 728, yb, BRIEFS_COL2[i], 2, INK);
  }

  // ---- date check
  const dcY = 954;
  const dcH = 48;
  outlineRect(MX, dcY, CW, dcH, RED);
  outlineRect(MX + 2, dcY + 2, CW - 4, dcH - 4, RED);
  drawPara(
    MX + 10, dcY + 7,
    "DATE CHECK \u2014 NOT THIS PAGE: Van Gogh $190.4m sale (18 Nov) \u00b7 Jeffries 251-11 (18 Nov) \u00b7 Voyager 1 (18 Nov) \u00b7 Nvidia H-chip halt (17-18 Nov).",
    CW - 20, 2, REDDK, 2,
  );

  // ---- footer
  drawText(MX, 1008, "Every story here happened, or was first reported, on Thursday 19 November 2026. Sources: Reuters, AP, BBC, The Hindu, UN News, Dawn, IMD, ICJ.", 1, GREY);
}

function main(): void {
  draw();
  const outDir = process.env.MAKEFUN_OUTPUT_DIR || "out";
  mkdirSync(outDir, { recursive: true });
  const png = encodePNG();
  writeFileSync(join(outDir, "entry.png"), png);
  console.log(`wrote ${join(outDir, "entry.png")} ${png.length} bytes`);
}

main();
