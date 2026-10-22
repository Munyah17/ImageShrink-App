import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { downloadBlob, downloadItemsAsZip } from '../lib/image/download';
import { isSupportedInput } from '../lib/image/formats';
import { processImageOffthread } from '../lib/image/processClient';
import { MAX_UPLOAD_BYTES, type ImageQueueItem, type ProcessOptions } from '../lib/image/types';

function createId(): string {
  return crypto.randomUUID();
}

export function useImageQueue(getOptions: () => ProcessOptions) {
  const [items, setItems] = useState<ImageQueueItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const processingRef = useRef(false);

  const revokeAll = useCallback((list: ImageQueueItem[]) => {
    for (const item of list) {
      URL.revokeObjectURL(item.originalUrl);
      if (item.resultUrl) URL.revokeObjectURL(item.resultUrl);
    }
  }, []);

  useEffect(() => {
    return () => {
      revokeAll(itemsRef.current);
    };
  }, [revokeAll]);

  const processAll = useCallback(async (force = false) => {
    if (processingRef.current) return;
    const options = getOptions();
    processingRef.current = true;
    setIsProcessing(true);
    const snapshot = itemsRef.current.filter((item) => force || item.status !== 'done');

    let succeeded = 0;
    await Promise.all(
      snapshot.map(async (item) => {
        setItems((current) =>
          current.map((entry) =>
            entry.id === item.id ? { ...entry, status: 'processing', error: undefined } : entry,
          ),
        );
        const result = await processImageOffthread(item.file, options);
        if (result.ok) {
          succeeded += 1;
          const resultUrl = URL.createObjectURL(result.blob);
          setItems((current) =>
            current.map((entry) => {
              if (entry.id !== item.id) return entry;
              if (entry.resultUrl) URL.revokeObjectURL(entry.resultUrl);
              return { ...entry, status: 'done', result, resultUrl, error: undefined };
            }),
          );
        } else {
          setItems((current) =>
            current.map((entry) =>
              entry.id === item.id ? { ...entry, status: 'error', error: result.error } : entry,
            ),
          );
        }
      }),
    );

    if (succeeded > 0) {
      void fetch('/api/usage/compress', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Math.min(50, succeeded) }),
      }).catch(() => undefined);
    }

    processingRef.current = false;
    setIsProcessing(false);
  }, [getOptions]);

  const addFiles = useCallback(
    (fileList: FileList | File[]) => {
      const files = Array.from(fileList);
      const accepted: ImageQueueItem[] = [];
      const rejected: string[] = [];

      for (const file of files) {
        if (!isSupportedInput(file)) {
          rejected.push(`${file.name}: unsupported file type.`);
          continue;
        }
        if (file.size > MAX_UPLOAD_BYTES) {
          rejected.push(`${file.name}: larger than 40 MB.`);
          continue;
        }
        accepted.push({
          id: createId(),
          file,
          originalUrl: URL.createObjectURL(file),
          originalSize: file.size,
          status: 'pending',
        });
      }

      setUploadError(rejected.length ? rejected.join(' ') : null);
      if (accepted.length) {
        setItems((current) => {
          const next = [...current, ...accepted];
          itemsRef.current = next;
          return next;
        });
        void Promise.resolve().then(() => processAll());
      }
    },
    [processAll],
  );

  const removeItem = useCallback((id: string) => {
    setItems((current) => {
      const target = current.find((item) => item.id === id);
      if (target) {
        URL.revokeObjectURL(target.originalUrl);
        if (target.resultUrl) URL.revokeObjectURL(target.resultUrl);
      }
      const next = current.filter((item) => item.id !== id);
      itemsRef.current = next;
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setItems((current) => {
      revokeAll(current);
      itemsRef.current = [];
      return [];
    });
    setUploadError(null);
  }, [revokeAll]);

  const downloadOne = useCallback((id: string) => {
    const item = itemsRef.current.find((entry) => entry.id === id);
    if (!item?.result) return;
    downloadBlob(item.result.blob, item.result.fileName);
  }, []);

  const downloadZip = useCallback(async () => {
    await downloadItemsAsZip(itemsRef.current);
  }, []);

  const stats = useMemo(() => {
    const done = items.filter((item) => item.status === 'done' && item.result);
    const original = done.reduce((sum, item) => sum + item.originalSize, 0);
    const processed = done.reduce((sum, item) => sum + (item.result?.blob.size ?? 0), 0);
    return { done: done.length, original, processed };
  }, [items]);

  return {
    items,
    isProcessing,
    uploadError,
    addFiles,
    removeItem,
    clearAll,
    processAll,
    downloadOne,
    downloadZip,
    stats,
  };
}
