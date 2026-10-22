import type { ImageQueueItem } from './types';

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.rel = 'noopener';
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function downloadItemsAsZip(items: ImageQueueItem[]): Promise<void> {
  const successful = items.filter((item) => item.status === 'done' && item.result);
  if (successful.length === 0) {
    throw new Error('There are no processed images to download.');
  }

  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  const usedNames = new Map<string, number>();

  for (const item of successful) {
    const result = item.result;
    if (!result) continue;
    let name = result.fileName;
    const count = usedNames.get(name) ?? 0;
    usedNames.set(name, count + 1);
    if (count > 0) {
      const dot = name.lastIndexOf('.');
      name = `${name.slice(0, dot)}-${count + 1}${name.slice(dot)}`;
    }
    zip.file(name, result.blob);
  }

  const archive = await zip.generateAsync({ type: 'blob' });
  downloadBlob(archive, 'imageshrink.zip');
}
