import { processImage } from './process';
import type { ProcessOptions, ProcessResult } from './types';

type WorkerRequest = {
  requestId: string;
  file: File;
  options: ProcessOptions;
};

self.addEventListener('message', async (event: MessageEvent<WorkerRequest>) => {
  const { requestId, file, options } = event.data;
  const result = await processImage(file, options);

  if (!result.ok) {
    self.postMessage({ requestId, result } satisfies { requestId: string; result: ProcessResult });
    return;
  }

  const buffer = await result.blob.arrayBuffer();
  globalThis.postMessage(
    {
      requestId,
      result: {
        ok: true as const,
        type: result.outputMime,
        width: result.width,
        height: result.height,
        originalWidth: result.originalWidth,
        originalHeight: result.originalHeight,
        outputFormat: result.outputFormat,
        outputMime: result.outputMime,
        fileName: result.fileName,
        warnings: result.warnings,
        buffer,
      },
    },
    { transfer: [buffer] },
  );
});
