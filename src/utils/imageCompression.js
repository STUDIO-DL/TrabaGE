const WEBP_MIME = 'image/webp';

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No se pudo procesar la imagen.'));
    };
    img.src = url;
  });
}

function canvasToBlob(canvas, mimeType, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('No se pudo comprimir la imagen.'));
          return;
        }
        resolve(blob);
      },
      mimeType,
      quality,
    );
  });
}

function drawToCanvas(img, maxWidth, maxHeight) {
  const scale = Math.min(maxWidth / img.width, maxHeight / img.height, 1);
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, width, height);
  return canvas;
}

async function compressImage(file, { maxWidth, maxHeight, quality, extension }) {
  const img = await loadImageFromFile(file);
  const canvas = drawToCanvas(img, maxWidth, maxHeight);
  const blob = await canvasToBlob(canvas, WEBP_MIME, quality);
  const baseName = file.name.replace(/\.[^.]+$/, '') || 'image';
  return new File([blob], `${baseName}.${extension}`, { type: WEBP_MIME });
}

export function compressProfileImage(file) {
  return compressImage(file, {
    maxWidth: 512,
    maxHeight: 512,
    quality: 0.75,
    extension: 'webp',
  });
}

export function compressPostImage(file) {
  return compressImage(file, {
    maxWidth: 1200,
    maxHeight: 12000,
    quality: 0.75,
    extension: 'webp',
  });
}
