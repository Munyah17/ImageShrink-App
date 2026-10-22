export const INPUT_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/bmp',
] as const;

export type InputMimeType = (typeof INPUT_MIME_TYPES)[number];

export const OUTPUT_FORMATS = ['jpeg', 'png', 'webp'] as const;
export type OutputFormat = (typeof OUTPUT_FORMATS)[number];

export const OUTPUT_MIME: Record<OutputFormat, string> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

export const FORMAT_LABEL: Record<OutputFormat, string> = {
  jpeg: 'JPG',
  png: 'PNG',
  webp: 'WebP',
};

export const MAX_UPLOAD_BYTES = 40 * 1024 * 1024;
export const MAX_OUTPUT_PIXELS = 16_777_216; // 4096²
export const MAX_DIMENSION = 8192;
export const MIN_DIMENSION = 1;

export type ProcessOptions = {
  outputFormat: OutputFormat;
  quality: number;
  width?: number;
  height?: number;
  lockAspect: boolean;
  flattenColor: string;
};

export type ProcessWarning = {
  code:
    | 'larger-than-original'
    | 'transparency-flattened'
    | 'dimensions-clamped'
    | 'pixels-clamped'
    | 'lossy-to-png'
    | 'png-reencode';
  message: string;
};

export type ProcessSuccess = {
  ok: true;
  blob: Blob;
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
  outputFormat: OutputFormat;
  outputMime: string;
  fileName: string;
  warnings: ProcessWarning[];
};

export type ProcessFailure = {
  ok: false;
  error: string;
};

export type ProcessResult = ProcessSuccess | ProcessFailure;

export type QueueItemStatus = 'pending' | 'processing' | 'done' | 'error';

export type ImageQueueItem = {
  id: string;
  file: File;
  originalUrl: string;
  originalSize: number;
  status: QueueItemStatus;
  error?: string;
  result?: ProcessSuccess;
  resultUrl?: string;
};
