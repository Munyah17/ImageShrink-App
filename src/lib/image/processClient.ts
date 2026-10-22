import { processImage } from './process';
import type { ProcessOptions, ProcessResult, ProcessSuccess } from './types';
import ProcessWorker from './process.worker.ts?worker';

type WorkerPayload =
  | { requestId: string; result: Extract<ProcessResult, { ok: false }> }
  | {
      requestId: string;
      result: Omit<ProcessSuccess, 'blob'> & { buffer: ArrayBuffer; type: string; ok: true };
    };

type Pending = {
  resolve: (result: ProcessResult) => void;
};

const pending = new Map<string, Pending>();
const idleWorkers: Worker[] = [];
const busy = new Set<Worker>();
const waitQueue: Array<{
  file: File;
  options: ProcessOptions;
  resolve: (result: ProcessResult) => void;
}> = [];

const POOL_SIZE = Math.min(2, Math.max(1, navigator.hardwareConcurrency ? Math.floor(navigator.hardwareConcurrency / 2) : 1));

function createWorker(): Worker {
  const worker = new ProcessWorker();
  worker.addEventListener('message', (event: MessageEvent<WorkerPayload>) => {
    const waiter = pending.get(event.data.requestId);
    if (!waiter) return;
    pending.delete(event.data.requestId);
    busy.delete(worker);
    idleWorkers.push(worker);

    if (!event.data.result.ok) {
      waiter.resolve(event.data.result);
    } else {
      const { buffer, type, ...rest } = event.data.result;
      waiter.resolve({
        ...rest,
        blob: new Blob([buffer], { type }),
      });
    }
    pump();
  });
  worker.addEventListener('error', () => {
    idleWorkers.splice(idleWorkers.indexOf(worker), 1);
    busy.delete(worker);
  });
  return worker;
}

function getWorker(): Worker | undefined {
  const idle = idleWorkers.pop();
  if (idle) return idle;
  if (busy.size + idleWorkers.length < POOL_SIZE) {
    return createWorker();
  }
  return undefined;
}

function pump(): void {
  const next = waitQueue.shift();
  if (!next) return;
  const worker = getWorker();
  if (!worker) {
    waitQueue.unshift(next);
    return;
  }
  const requestId = crypto.randomUUID();
  pending.set(requestId, { resolve: next.resolve });
  busy.add(worker);
  worker.postMessage({ requestId, file: next.file, options: next.options });
}

export function processImageOffthread(file: File, options: ProcessOptions): Promise<ProcessResult> {
  if (typeof Worker === 'undefined') {
    return processImage(file, options);
  }
  return new Promise((resolve) => {
    waitQueue.push({ file, options, resolve });
    pump();
  });
}
