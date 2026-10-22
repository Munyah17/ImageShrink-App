import {
  FORMAT_LABEL,
  INPUT_MIME_TYPES,
  OUTPUT_MIME,
  type InputMimeType,
  type OutputFormat,
} from './types';

const EXTENSION_MIME: Record<string, InputMimeType> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  bmp: 'image/bmp',
};

export function normalizeMime(file: File): string {
  const type = file.type.toLowerCase();
  if (type && INPUT_MIME_TYPES.includes(type as InputMimeType)) {
    return type;
  }
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  return EXTENSION_MIME[ext] ?? type;
}

export function isSupportedInput(file: File): boolean {
  return INPUT_MIME_TYPES.includes(normalizeMime(file) as InputMimeType);
}

export function mimeToFormat(mime: string): OutputFormat | undefined {
  if (mime === 'image/jpeg') return 'jpeg';
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  return undefined;
}

export function formatExtension(format: OutputFormat): string {
  return format === 'jpeg' ? 'jpg' : format;
}

export function buildOutputFileName(originalName: string, format: OutputFormat): string {
  const base = originalName.replace(/\.[^.]+$/, '') || 'image';
  const safe = base.replace(/[^\w.-]+/g, '-').replace(/-+/g, '-').slice(0, 80);
  return `${safe || 'image'}.${formatExtension(format)}`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`;
  const mb = kb / 1024;
  return `${mb < 10 ? mb.toFixed(2) : mb.toFixed(1)} MB`;
}

export function percentSaved(original: number, processed: number): number {
  if (original <= 0) return 0;
  return Math.round(((original - processed) / original) * 100);
}

export function formatLabel(format: OutputFormat): string {
  return FORMAT_LABEL[format];
}

export function outputMime(format: OutputFormat): string {
  return OUTPUT_MIME[format];
}

export function supportsLossyQuality(format: OutputFormat): boolean {
  return format === 'jpeg' || format === 'webp';
}

export function jpegLosesTransparency(sourceMime: string, output: OutputFormat): boolean {
  return output === 'jpeg' && (sourceMime === 'image/png' || sourceMime === 'image/webp' || sourceMime === 'image/gif');
}
