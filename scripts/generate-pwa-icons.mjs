import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const logoPath = path.join(rootDir, 'src/assets/branding/trabage-icon.png');
const iconsDir = path.join(rootDir, 'public/icons');

const iconSizes = [16, 32, 48, 64, 72, 96, 128, 144, 152, 180, 192, 256, 384, 512];
const iconBackground = { r: 255, g: 255, b: 255, alpha: 1 };
const blackBackgroundThreshold = 32;

async function createIconBuffer(size) {
  const { data, info } = await sharp(logoPath)
    .resize(size, size, {
      fit: 'contain',
      background: iconBackground,
    })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let index = 0; index < data.length; index += 4) {
    const red = data[index];
    const green = data[index + 1];
    const blue = data[index + 2];

    if (
      red <= blackBackgroundThreshold &&
      green <= blackBackgroundThreshold &&
      blue <= blackBackgroundThreshold
    ) {
      data[index] = 255;
      data[index + 1] = 255;
      data[index + 2] = 255;
      data[index + 3] = 255;
    }
  }

  return sharp(data, {
    raw: {
      width: info.width,
      height: info.height,
      channels: info.channels,
    },
  })
    .flatten({ background: iconBackground })
    .png({
      compressionLevel: 9,
      adaptiveFiltering: true,
      palette: size <= 64,
    })
    .toBuffer();
}

async function generateIcon(size, outputName) {
  await writeFile(path.join(iconsDir, outputName), await createIconBuffer(size));

  console.log(`Generated ${outputName} (${size}x${size})`);
}

async function createPngBuffer(size) {
  return createIconBuffer(size);
}

async function generateFaviconIco() {
  const sizes = [16, 32, 48];
  const images = await Promise.all(sizes.map(async (size) => ({ size, buffer: await createPngBuffer(size) })));
  const headerSize = 6;
  const entrySize = 16;
  let imageOffset = headerSize + images.length * entrySize;

  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);

  const entries = images.map(({ size, buffer }) => {
    const entry = Buffer.alloc(entrySize);
    entry.writeUInt8(size === 256 ? 0 : size, 0);
    entry.writeUInt8(size === 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(buffer.length, 8);
    entry.writeUInt32LE(imageOffset, 12);
    imageOffset += buffer.length;
    return entry;
  });

  await writeFile(
    path.join(rootDir, 'public/favicon.ico'),
    Buffer.concat([header, ...entries, ...images.map(({ buffer }) => buffer)]),
  );
  console.log('Generated favicon.ico (16x16, 32x32, 48x48)');
}

await mkdir(iconsDir, { recursive: true });
await Promise.all(iconSizes.map((size) => generateIcon(size, `trabage-icon-${size}.png`)));

await generateIcon(180, 'apple-touch-icon.png');
await generateIcon(192, 'icon-192.png');
await generateIcon(512, 'icon-512.png');
await generateIcon(512, 'maskable-icon.png');
await generateIcon(512, 'trabage-maskable-512.png');
await generateFaviconIco();
console.log('PWA icons ready in public/icons');
