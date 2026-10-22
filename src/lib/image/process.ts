import {
  buildOutputFileName,
  jpegLosesTransparency,
  mimeToFormat,
  normalizeMime,
  outputMime,
} from './formats';
import {
  MAX_DIMENSION,
  MAX_OUTPUT_PIXELS,
  MIN_DIMENSION,
  type ProcessOptions,
  type ProcessResult,
  type ProcessWarning,
} from './types';

function parseHexColor(hex: string): { r: number; g: number; b: number } {
  const value = hex.replace('#', '');
  const full = value.length === 3
    ? value.split('').map((c) => c + c).join('')
    : value;
  const n = Number.parseInt(full, 16);
  if (Number.isNaN(n) || full.length !== 6) {
    return { r: 255, g: 255, b: 255 };
  }
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function clampDimension(value: number): number {
  if (!Number.isFinite(value)) return MIN_DIMENSION;
  return Math.min(MAX_DIMENSION, Math.max(MIN_DIMENSION, Math.round(value)));
}

export function computeTargetSize(
  sourceWidth: number,
  sourceHeight: number,
  options: Pick<ProcessOptions, 'width' | 'height' | 'lockAspect'>,
): { width: number; height: number; warnings: ProcessWarning[] } {
  const warnings: ProcessWarning[] = [];
  let width = options.width ? clampDimension(options.width) : sourceWidth;
  let height = options.height ? clampDimension(options.height) : sourceHeight;

  if (options.lockAspect) {
    const ratio = sourceWidth / sourceHeight;
    if (options.width && !options.height) {
      height = clampDimension(width / ratio);
    } else if (options.height && !options.width) {
      width = clampDimension(height * ratio);
    } else if (options.width && options.height) {
      height = clampDimension(width / ratio);
    }
  }

  if (width !== (options.width ?? sourceWidth) || height !== (options.height ?? sourceHeight)) {
    if (width === MAX_DIMENSION || height === MAX_DIMENSION) {
      warnings.push({
        code: 'dimensions-clamped',
        message: `Dimensions were limited to ${MAX_DIMENSION}px to protect browser memory.`,
      });
    }
  }

  const pixels = width * height;
  if (pixels > MAX_OUTPUT_PIXELS) {
    const scale = Math.sqrt(MAX_OUTPUT_PIXELS / pixels);
    width = clampDimension(width * scale);
    height = clampDimension(height * scale);
    warnings.push({
      code: 'pixels-clamped',
      message: 'The image was scaled down because the requested size would use too much memory.',
    });
  }

  return { width, height, warnings };
}

async function decodeImage(file: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    try {
      return await createImageBitmap(file);
    } catch {
      throw new Error('This file could not be decoded as an image in your browser.');
    }
  }
}

async function scaleBitmap(bitmap: ImageBitmap, width: number, height: number): Promise<ImageBitmap> {
  if (bitmap.width === width && bitmap.height === height) return bitmap;
  try {
    const scaled = await createImageBitmap(bitmap, {
      resizeWidth: width,
      resizeHeight: height,
      resizeQuality: 'low',
    });
    bitmap.close();
    return scaled;
  } catch {
    return bitmap;
  }
}

function canvasToBlob(
  canvas: OffscreenCanvas | HTMLCanvasElement,
  mime: string,
  quality: number,
): Promise<Blob> {
  if (canvas instanceof OffscreenCanvas && typeof canvas.convertToBlob === 'function') {
    return canvas.convertToBlob({ type: mime, quality });
  }
  return new Promise((resolve, reject) => {
    (canvas as HTMLCanvasElement).toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('The browser failed to encode this image.'));
      },
      mime,
      quality,
    );
  });
}

function bytesStartWith(bytes: Uint8Array, signature: number[]): boolean {
  return signature.every((value, index) => bytes[index] === value);
}

async function blobMatchesMime(blob: Blob, mime: string): Promise<boolean> {
  if (blob.type && blob.type !== mime) {
    return false;
  }
  const header = new Uint8Array(await blob.slice(0, 12).arrayBuffer());
  if (mime === 'image/jpeg') {
    return bytesStartWith(header, [0xff, 0xd8, 0xff]);
  }
  if (mime === 'image/png') {
    return bytesStartWith(header, [0x89, 0x50, 0x4e, 0x47]);
  }
  if (mime === 'image/webp') {
    const riff = String.fromCharCode(header[0], header[1], header[2], header[3]);
    const webp = String.fromCharCode(header[8], header[9], header[10], header[11]);
    return riff === 'RIFF' && webp === 'WEBP';
  }
  return false;
}

function createCanvas(width: number, height: number): OffscreenCanvas | HTMLCanvasElement {
  if (typeof OffscreenCanvas !== 'undefined') {
    return new OffscreenCanvas(width, height);
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

export async function processImage(file: File, options: ProcessOptions): Promise<ProcessResult> {
  const sourceMime = normalizeMime(file);
  const requestedMime = outputMime(options.outputFormat);
  const quality = Math.min(1, Math.max(0.1, options.quality));
  const warnings: ProcessWarning[] = [];

  if (options.outputFormat === 'png' && (sourceMime === 'image/jpeg' || sourceMime === 'image/webp')) {
    warnings.push({
      code: 'lossy-to-png',
      message:
        'Converting a lossy image to PNG usually increases file size. Prefer WebP or JPG when you need a smaller file.',
    });
  }

  if (options.outputFormat === 'png' && sourceMime === 'image/png' && !options.width && !options.height) {
    warnings.push({
      code: 'png-reencode',
      message:
        'Browser PNG encoding is lossless and may not shrink this file. Try WebP if you need a smaller image.',
    });
  }

  let bitmap: ImageBitmap | undefined;
  try {
    bitmap = await decodeImage(file);
    const originalWidth = bitmap.width;
    const originalHeight = bitmap.height;
    const target = computeTargetSize(originalWidth, originalHeight, options);
    warnings.push(...target.warnings);

    bitmap = await scaleBitmap(bitmap, target.width, target.height);

    const canvas = createCanvas(target.width, target.height);
    const ctx = canvas.getContext('2d', {
      alpha: options.outputFormat !== 'jpeg',
      desynchronized: true,
    }) as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
    if (!ctx) {
      return { ok: false, error: 'This browser could not create a drawing surface for image processing.' };
    }

    const flatten = jpegLosesTransparency(sourceMime, options.outputFormat);
    if (flatten) {
      const { r, g, b } = parseHexColor(options.flattenColor);
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.fillRect(0, 0, target.width, target.height);
      warnings.push({
        code: 'transparency-flattened',
        message: 'JPG does not support transparency. Transparent pixels were filled with a solid background.',
      });
    }

    ctx.imageSmoothingEnabled = bitmap.width !== target.width || bitmap.height !== target.height;
    if (ctx.imageSmoothingEnabled) {
      ctx.imageSmoothingQuality = 'low';
    }
    ctx.drawImage(bitmap, 0, 0, target.width, target.height);
    bitmap.close();
    bitmap = undefined;

    const blob = await canvasToBlob(
      canvas,
      requestedMime,
      options.outputFormat === 'png' ? 1 : quality,
    );

    const encodedType = blob.type || requestedMime;
    const actualFormat = mimeToFormat(encodedType);
    const signatureOk = await blobMatchesMime(blob, requestedMime);
    if (!actualFormat || encodedType !== requestedMime || !signatureOk) {
      return {
        ok: false,
        error: `Your browser could not encode ${options.outputFormat.toUpperCase()}. Try a different output format.`,
      };
    }

    if (blob.size > file.size) {
      warnings.push({
        code: 'larger-than-original',
        message: 'The processed file is larger than the original. You can keep the original or try a different format or quality.',
      });
    }

    return {
      ok: true,
      blob,
      width: target.width,
      height: target.height,
      originalWidth,
      originalHeight,
      outputFormat: actualFormat,
      outputMime: encodedType,
      fileName: buildOutputFileName(file.name, actualFormat),
      warnings,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Image processing failed.';
    return { ok: false, error: message };
  } finally {
    bitmap?.close();
  }
}

export function yieldToMain(): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, 0);
  });
}
