/**
 * Generates TrabaGE chat wallpaper tiles for light and dark themes.
 * Same icon layout (shared seed) so theme switches feel continuous.
 *
 * Outputs:
 *   public/images/chat_background_light.png|.svg
 *   public/images/chat_background_dark.png|.svg
 *   (legacy aliases: chat-wallpaper-tile.png/.svg, chat-wallpaper.png)
 */
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'public', 'images');

const TILE = 640;

const THEMES = {
  light: {
    bg: '#F8FAFC',
    /** Brand blue + soft slate accents at 3–5% effective opacity */
    strokes: ['#2563EB', '#3B82F6', '#64748B'],
    iconOpacity: [0.03, 0.05],
    markOpacity: [0.025, 0.04],
  },
  dark: {
    bg: '#0F172A',
    /** Dark blue, blue-gray, brand blue — 2–4% */
    strokes: ['#1E3A5F', '#334155', '#2563EB', '#3B82F6'],
    iconOpacity: [0.02, 0.04],
    markOpacity: [0.018, 0.032],
  },
};

/** Minimal line-icon paths (24×24), stroke only */
const ICONS = {
  briefcase:
    'M8 7V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1M4 7h16v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7zm0 4h16',
  building:
    'M4 21h16M6 21V5a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v16M9 8h2M13 8h2M9 12h2M13 12h2M9 16h2M13 16h2',
  user: 'M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8',
  users:
    'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  file: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h6',
  badge: 'M12 15a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM8.5 14.5 7 22l5-3 5 3-1.5-7.5',
  diploma: 'M4 6h16v10H4zM8 16v4l4-2 4 2v-4',
  star: 'M12 3l2.4 5.6L20 9.3l-4.2 4 1.1 6.2L12 16.5 7.1 19.5 8.2 13.3 4 9.3l5.6-.7z',
  heart:
    'M19 14c1.5-1.4 2-2.8 2-4.4A4.2 4.2 0 0 0 12 7a4.2 4.2 0 0 0-9 2.6c0 1.6.5 3 2 4.4l7 6.4z',
  message: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
  check: 'M22 11.1V12a10 10 0 1 1-5.9-9.1M22 4 12 14.2l-3-3',
  bell: 'M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0',
  calendar:
    'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3',
  mapPin:
    'M12 21s7-5.3 7-11a7 7 0 1 0-14 0c0 5.7 7 11 7 11zM12 10.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3',
  send: 'M22 2 11 13M22 2l-7 20-4-9-9-4z',
  mail: 'M4 4h16v16H4zM4 6l8 7 8-7',
  handshake:
    'M12 12 8.5 8.5a2.1 2.1 0 0 0-3 0L4 10M12 12l3.5-3.5a2.1 2.1 0 0 1 3 0L20 10M8 16l2 2 2-2 2 2 2-2',
  laptop: 'M4 6h16v10H4zM2 18h20',
  phone: 'M8 3h8a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM11 18h2',
  lightbulb: 'M9 18h6M10 21h4M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z',
  chart: 'M3 3v18h18M7 14v4M12 10v8M17 6v12',
  network:
    'M12 5a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM5 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM19 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM12 5v4M7 16l3-5M17 16l-3-5',
  folder: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  paperclip:
    'M21.4 11.6 12 21a5 5 0 0 1-7-7l9.5-9.5a3.2 3.2 0 1 1 4.5 4.5L9.5 18.5a1.4 1.4 0 1 1-2-2l8.3-8.4',
  camera:
    'M14.5 4h-5L8 6H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-4zM12 16a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7',
  gear: 'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9c.3.6.9 1 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  cloud: 'M18 10.1A5 5 0 0 0 9.1 8a4.2 4.2 0 0 0-1 8.3h10a3.5 3.5 0 0 0 0-7z',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  chatDots:
    'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2zM8 10h.01M12 10h.01M16 10h.01',
};

const iconKeys = Object.keys(ICONS);

function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function placeIcons(rand, count) {
  const placed = [];
  let attempts = 0;
  while (placed.length < count && attempts < count * 100) {
    attempts += 1;
    const key = iconKeys[Math.floor(rand() * iconKeys.length)];
    const size = 18 + Math.floor(rand() * 22);
    const pad = size * 0.55;
    const x = pad + rand() * (TILE - pad * 2);
    const y = pad + rand() * (TILE - pad * 2);
    const rot = (rand() - 0.5) * 36;
    const strokeIndex = Math.floor(rand() * 1000);
    const opacityT = rand();
    const ok = placed.every((p) => {
      const dx = p.x - x;
      const dy = p.y - y;
      const minDist = (p.size + size) * 0.72;
      return dx * dx + dy * dy >= minDist * minDist;
    });
    if (ok) placed.push({ key, x, y, size, rot, strokeIndex, opacityT });
  }
  return placed;
}

function placeDots(rand, count) {
  const dots = [];
  for (let i = 0; i < count; i += 1) {
    const roll = rand();
    const kind = roll < 0.4 ? 'dot' : roll < 0.72 ? 'cross' : 'spark';
    dots.push({
      kind,
      x: rand() * TILE,
      y: rand() * TILE,
      s: 1.2 + rand() * 2.2,
      opacityT: rand(),
      strokeIndex: Math.floor(rand() * 1000),
      rot: rand() * 45,
    });
  }
  return dots;
}

function lerp(range, t) {
  return range[0] + (range[1] - range[0]) * t;
}

function buildSvg(themeKey, icons, dots) {
  const theme = THEMES[themeKey];
  const strokeAt = (index) => theme.strokes[index % theme.strokes.length];

  let marks = '';
  for (const d of dots) {
    const opacity = lerp(theme.markOpacity, d.opacityT).toFixed(3);
    const stroke = strokeAt(d.strokeIndex);
    if (d.kind === 'dot') {
      marks += `<circle cx="${d.x.toFixed(1)}" cy="${d.y.toFixed(1)}" r="${(d.s * 0.45).toFixed(2)}" fill="${stroke}" opacity="${opacity}"/>`;
    } else if (d.kind === 'cross') {
      const h = d.s;
      marks += `<g transform="translate(${d.x.toFixed(1)} ${d.y.toFixed(1)}) rotate(${d.rot.toFixed(1)})" opacity="${opacity}" stroke="${stroke}" stroke-width="0.8" stroke-linecap="round"><path d="M${(-h).toFixed(1)} 0h${(h * 2).toFixed(1)}M0 ${(-h).toFixed(1)}v${(h * 2).toFixed(1)}"/></g>`;
    } else {
      const h = d.s * 1.1;
      marks += `<g transform="translate(${d.x.toFixed(1)} ${d.y.toFixed(1)}) rotate(${d.rot.toFixed(1)})" opacity="${opacity}" fill="${stroke}"><path d="M0 ${(-h).toFixed(1)} L${(h * 0.28).toFixed(1)} ${(-h * 0.28).toFixed(1)} L${h.toFixed(1)} 0 L${(h * 0.28).toFixed(1)} ${(h * 0.28).toFixed(1)} L0 ${h.toFixed(1)} L${(-h * 0.28).toFixed(1)} ${(h * 0.28).toFixed(1)} L${(-h).toFixed(1)} 0 L${(-h * 0.28).toFixed(1)} ${(-h * 0.28).toFixed(1)} Z"/></g>`;
    }
  }

  let iconSvg = '';
  for (const ic of icons) {
    const scale = ic.size / 24;
    const opacity = lerp(theme.iconOpacity, ic.opacityT).toFixed(3);
    const stroke = strokeAt(ic.strokeIndex);
    iconSvg += `<g transform="translate(${ic.x.toFixed(1)} ${ic.y.toFixed(1)}) rotate(${ic.rot.toFixed(1)}) scale(${scale.toFixed(3)}) translate(-12 -12)" fill="none" stroke="${stroke}" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round" opacity="${opacity}"><path d="${ICONS[ic.key]}"/></g>`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${TILE}" height="${TILE}" viewBox="0 0 ${TILE} ${TILE}" role="img" aria-label="TrabaGE chat background ${themeKey}">
  <rect width="100%" height="100%" fill="${theme.bg}"/>
  ${marks}
  ${iconSvg}
</svg>`;
}

async function writeThemeAssets(themeKey, svg) {
  const base = `chat_background_${themeKey}`;
  const svgPath = path.join(outDir, `${base}.svg`);
  fs.writeFileSync(svgPath, svg, 'utf8');

  const tilePng = await sharp(Buffer.from(svg)).png().toBuffer();
  await sharp(tilePng)
    .resize(512, 512, { fit: 'fill' })
    .png({ compressionLevel: 9 })
    .toFile(path.join(outDir, `${base}.png`));

  return { svgPath, tilePng, bg: THEMES[themeKey].bg };
}

const rand = mulberry32(0x74726162);
const icons = placeIcons(rand, 44);
const dots = placeDots(rand, 60);

fs.mkdirSync(outDir, { recursive: true });

const lightSvg = buildSvg('light', icons, dots);
const darkSvg = buildSvg('dark', icons, dots);

const light = await writeThemeAssets('light', lightSvg);
const dark = await writeThemeAssets('dark', darkSvg);

// Legacy aliases (light tile) for any remaining references
fs.copyFileSync(path.join(outDir, 'chat_background_light.svg'), path.join(outDir, 'chat-wallpaper-tile.svg'));
fs.copyFileSync(path.join(outDir, 'chat_background_light.png'), path.join(outDir, 'chat-wallpaper-tile.png'));

const W = 1440;
const H = 3200;
const tileMeta = await sharp(light.tilePng).metadata();
const tw = tileMeta.width;
const th = tileMeta.height;
const composites = [];
for (let y = 0; y < H; y += th) {
  for (let x = 0; x < W; x += tw) {
    composites.push({ input: light.tilePng, left: x, top: y });
  }
}

await sharp({
  create: { width: W, height: H, channels: 3, background: light.bg },
})
  .composite(composites)
  .png({ compressionLevel: 9 })
  .toFile(path.join(outDir, 'chat-wallpaper.png'));

console.log(
  JSON.stringify(
    {
      icons: icons.length,
      dots: dots.length,
      files: [
        'public/images/chat_background_light.png',
        'public/images/chat_background_light.svg',
        'public/images/chat_background_dark.png',
        'public/images/chat_background_dark.svg',
      ],
    },
    null,
    2,
  ),
);
