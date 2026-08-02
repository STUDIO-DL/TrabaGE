/**
 * Builds remarcable chat_background_light / dark from the official wallpaper.
 * Amplifies the subtle source pattern so icons clearly read behind bubbles.
 */
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'public', 'images');
const SOURCE = path.join(outDir, 'chat_background_light_source.png');

const LIGHT_BG = { r: 248, g: 250, b: 252 };
const LIGHT_INK = { r: 37, g: 99, b: 235 }; // brand blue
const LIGHT_INK_SOFT = { r: 71, g: 85, b: 105 }; // slate

const DARK_BG = { r: 15, g: 23, b: 42 };
const DARK_INK = { r: 147, g: 197, b: 253 };
const DARK_INK_SOFT = { r: 100, g: 116, b: 139 };

function mix(a, b, t) {
  const u = Math.min(1, Math.max(0, t));
  return {
    r: Math.round(a.r + (b.r - a.r) * u),
    g: Math.round(a.g + (b.g - a.g) * u),
    b: Math.round(a.b + (b.b - a.b) * u),
  };
}

function luma(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Source icons sit ~201–245 on ~250 bg. Amplify delta so pattern is remarcable.
 */
function strengthFromPixel(r, g, b) {
  const delta = Math.max(0, 252 - luma(r, g, b)); // 0..~50
  // Map ~8–50 delta → 0–1 with a soft curve
  const t = Math.min(1, Math.max(0, (delta - 4) / 42));
  return t ** 0.85;
}

async function buildTheme(raw, width, height, channels, { bg, ink, inkSoft, amount }) {
  const out = Buffer.alloc(width * height * 3);
  for (let i = 0, j = 0; i < raw.length; i += channels, j += 3) {
    const s = strengthFromPixel(raw[i], raw[i + 1], raw[i + 2]);
    const color = mix(inkSoft, ink, 0.55);
    const pixel = mix(bg, color, s * amount);
    out[j] = pixel.r;
    out[j + 1] = pixel.g;
    out[j + 2] = pixel.b;
  }
  return out;
}

if (!fs.existsSync(SOURCE)) {
  throw new Error(`Missing source: ${SOURCE}`);
}

fs.mkdirSync(outDir, { recursive: true });

const { data: raw, info } = await sharp(SOURCE).rotate().ensureAlpha().raw().toBuffer({
  resolveWithObject: true,
});

const lightBuf = await buildTheme(raw, info.width, info.height, info.channels, {
  bg: LIGHT_BG,
  ink: LIGHT_INK,
  inkSoft: LIGHT_INK_SOFT,
  amount: 0.55, // clearly remarcable behind bubbles
});

const darkBuf = await buildTheme(raw, info.width, info.height, info.channels, {
  bg: DARK_BG,
  ink: DARK_INK,
  inkSoft: DARK_INK_SOFT,
  amount: 0.48,
});

const lightPath = path.join(outDir, 'chat_background_light.png');
const darkPath = path.join(outDir, 'chat_background_dark.png');

await sharp(lightBuf, { raw: { width: info.width, height: info.height, channels: 3 } })
  .png({ compressionLevel: 9 })
  .toFile(lightPath);

await sharp(darkBuf, { raw: { width: info.width, height: info.height, channels: 3 } })
  .png({ compressionLevel: 9 })
  .toFile(darkPath);

fs.copyFileSync(lightPath, path.join(outDir, 'chat-wallpaper.png'));

// Sanity contrast check
const check = await sharp(lightPath).raw().toBuffer({ resolveWithObject: true });
let min = 255;
let max = 0;
for (let i = 0; i < check.data.length; i += check.info.channels) {
  const y = (check.data[i] + check.data[i + 1] + check.data[i + 2]) / 3;
  if (y < min) min = y;
  if (y > max) max = y;
}

console.log(
  JSON.stringify(
    {
      size: `${info.width}x${info.height}`,
      lightContrast: { min, max, range: max - min },
      files: ['public/images/chat_background_light.png', 'public/images/chat_background_dark.png'],
    },
    null,
    2,
  ),
);
