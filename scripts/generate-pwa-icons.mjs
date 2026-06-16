import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const logoPath = path.join(rootDir, 'src/assets/branding/logo.png');
const iconsDir = path.join(rootDir, 'public/icons');

async function generateIcon(size, outputName, maskable = false) {
  const padding = maskable ? Math.round(size * 0.18) : 0;
  const innerSize = size - padding * 2;

  const resized = await sharp(logoPath)
    .resize(innerSize, innerSize, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toBuffer();

  const canvas = sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: maskable ? { r: 37, g: 99, b: 235, alpha: 1 } : { r: 255, g: 255, b: 255, alpha: 0 },
    },
  });

  await canvas
    .composite([{ input: resized, gravity: 'centre' }])
    .png()
    .toFile(path.join(iconsDir, outputName));

  console.log(`Generated ${outputName} (${size}x${size})`);
}

await mkdir(iconsDir, { recursive: true });
await generateIcon(192, 'icon-192.png');
await generateIcon(512, 'icon-512.png');
await generateIcon(512, 'maskable-icon.png', true);
console.log('PWA icons ready in public/icons');
