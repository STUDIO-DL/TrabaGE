import {
  COMPRESSION_PRESETS,
  PDF_COMPRESSION_LIMITS,
  UPLOAD_COMPRESSION_TYPES,
} from '../constants/compressionPresets';
import { UPLOAD_PHASES } from '../constants/uploadPhases';

const WEBP_MIME = 'image/webp';
const JPEG_MIME = 'image/jpeg';

let webpSupported;

function detectWebpSupport() {
  if (webpSupported !== undefined) return webpSupported;
  if (typeof document === 'undefined') {
    webpSupported = true;
    return webpSupported;
  }
  const canvas = document.createElement('canvas');
  webpSupported = canvas.toDataURL(WEBP_MIME).startsWith('data:image/webp');
  return webpSupported;
}

function isImageFile(file) {
  return Boolean(file?.type?.startsWith('image/'));
}

function isPdfFile(file) {
  if (!file) return false;
  if (file.type === 'application/pdf') return true;
  return file.name?.toLowerCase().endsWith('.pdf');
}

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

function buildOutputFile(blob, originalName, extension, mimeType) {
  const baseName = (originalName || 'file').replace(/\.[^.]+$/, '') || 'file';
  return new File([blob], `${baseName}.${extension}`, { type: mimeType, lastModified: Date.now() });
}

function resolveImageMime(preset) {
  if (detectWebpSupport()) {
    return { mimeType: WEBP_MIME, extension: preset.extension || 'webp' };
  }
  return { mimeType: JPEG_MIME, extension: 'jpg' };
}

async function compressImageWithPreset(file, preset) {
  const img = await loadImageFromFile(file);
  const { mimeType, extension } = resolveImageMime(preset);
  const minDimensionScale = preset.safeMode ? 0.9 : 0.55;
  let dimensionScale = 1;

  while (dimensionScale >= minDimensionScale) {
    const maxWidth = Math.max(1, Math.round(preset.maxWidth * dimensionScale));
    const maxHeight = Math.max(1, Math.round(preset.maxHeight * dimensionScale));
    const canvas = drawToCanvas(img, maxWidth, maxHeight);

    for (
      let quality = preset.qualityStart;
      quality >= preset.qualityMin - 0.001;
      quality -= preset.qualityStep
    ) {
      const blob = await canvasToBlob(canvas, mimeType, quality);
      if (blob.size <= preset.maxBytes) {
        return buildOutputFile(blob, file.name, extension, mimeType);
      }
    }

    if (preset.safeMode) break;
    dimensionScale *= 0.9;
  }

  const fallbackCanvas = drawToCanvas(
    img,
    Math.max(1, Math.round(preset.maxWidth * minDimensionScale)),
    Math.max(1, Math.round(preset.maxHeight * minDimensionScale)),
  );
  const fallbackBlob = await canvasToBlob(fallbackCanvas, mimeType, preset.qualityMin);
  return buildOutputFile(fallbackBlob, file.name, extension, mimeType);
}

async function preparePdf(file, limitsKey) {
  const limits = PDF_COMPRESSION_LIMITS[limitsKey];
  if (!limits) {
    throw new Error('Tipo de PDF no soportado.');
  }
  if (!isPdfFile(file)) {
    throw new Error('Solo se permiten archivos PDF.');
  }

  if (file.size <= limits.maxBytes) {
    return {
      file,
      contentType: limits.mimeType,
      wasCompressed: false,
      originalSize: file.size,
      finalSize: file.size,
    };
  }

  const maxMb = (limits.maxBytes / (1024 * 1024)).toFixed(0);
  throw new Error(
    `El PDF supera ${maxMb} MB. Comprímelo antes de subirlo o elige un archivo más pequeño.`,
  );
}

function resolveUploadStrategy(uploadType, file) {
  switch (uploadType) {
    case UPLOAD_COMPRESSION_TYPES.AVATAR:
      return { kind: 'image', preset: COMPRESSION_PRESETS.profile };
    case UPLOAD_COMPRESSION_TYPES.COMPANY_LOGO:
      return { kind: 'image', preset: COMPRESSION_PRESETS.logo };
    case UPLOAD_COMPRESSION_TYPES.CANDIDATE_COVER:
    case UPLOAD_COMPRESSION_TYPES.COMPANY_COVER:
      return { kind: 'image', preset: COMPRESSION_PRESETS.cover };
    case UPLOAD_COMPRESSION_TYPES.POST_IMAGE:
    case UPLOAD_COMPRESSION_TYPES.PROJECT_IMAGE:
      return { kind: 'image', preset: COMPRESSION_PRESETS.post };
    case UPLOAD_COMPRESSION_TYPES.CV:
      return { kind: 'pdf', limitsKey: 'cv' };
    case UPLOAD_COMPRESSION_TYPES.VERIFICATION_DOC:
      return isImageFile(file)
        ? { kind: 'image', preset: COMPRESSION_PRESETS.verificationImage }
        : { kind: 'pdf', limitsKey: 'verificationPdf' };
    case UPLOAD_COMPRESSION_TYPES.REPRESENTATIVE_VERIFICATION_DOC:
      return isImageFile(file)
        ? { kind: 'image', preset: COMPRESSION_PRESETS.verificationImage }
        : { kind: 'pdf', limitsKey: 'verificationPdf' };
    case UPLOAD_COMPRESSION_TYPES.EDUCATION_FILE:
      return isImageFile(file)
        ? { kind: 'image', preset: COMPRESSION_PRESETS.educationImage }
        : { kind: 'pdf', limitsKey: 'educationPdf' };
    case UPLOAD_COMPRESSION_TYPES.CERTIFICATION_IMAGE:
      return { kind: 'image', preset: COMPRESSION_PRESETS.certificationImage };
    default:
      return null;
  }
}

function shouldCompress(file, uploadType) {
  const strategy = resolveUploadStrategy(uploadType, file);
  if (!strategy) return false;
  if (strategy.kind === 'pdf') return true;
  return isImageFile(file);
}

export const storageCompressionService = {
  shouldCompress,

  async compress(file, presetKey) {
    const preset = COMPRESSION_PRESETS[presetKey];
    if (!preset) {
      throw new Error(`Preset de compresión desconocido: ${presetKey}`);
    }
    if (!isImageFile(file)) {
      throw new Error('El archivo no es una imagen compatible.');
    }
    return compressImageWithPreset(file, preset);
  },

  async prepareForUpload(file, uploadType, { onProgress } = {}) {
    if (!file) {
      throw new Error('No se seleccionó ningún archivo.');
    }

    const strategy = resolveUploadStrategy(uploadType, file);
    if (!strategy) {
      return {
        file,
        contentType: file.type || undefined,
        wasCompressed: false,
        originalSize: file.size,
        finalSize: file.size,
      };
    }

    onProgress?.({ phase: UPLOAD_PHASES.COMPRESSING });

    if (strategy.kind === 'pdf') {
      return preparePdf(file, strategy.limitsKey);
    }

    if (!isImageFile(file)) {
      return {
        file,
        contentType: file.type || undefined,
        wasCompressed: false,
        originalSize: file.size,
        finalSize: file.size,
      };
    }

    const originalSize = file.size;
    const compressed = await compressImageWithPreset(file, strategy.preset);

    return {
      file: compressed,
      contentType: compressed.type,
      wasCompressed: compressed.size < originalSize || compressed.type !== file.type,
      originalSize,
      finalSize: compressed.size,
    };
  },
};

export function compressProfileImage(file) {
  return storageCompressionService.compress(file, 'profile');
}

export function compressPostImage(file) {
  return storageCompressionService.compress(file, 'post');
}

export function compressLogoImage(file) {
  return storageCompressionService.compress(file, 'logo');
}

export function compressCoverImage(file) {
  return storageCompressionService.compress(file, 'cover');
}
