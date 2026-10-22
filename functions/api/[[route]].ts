import worker from '../../worker/src/index';
import type { WorkerEnv } from '../../worker/src/env';

type PagesContext = {
  request: Request;
  env: WorkerEnv;
};

export async function onRequest(context: PagesContext): Promise<Response> {
  return worker.fetch(context.request, context.env);
}
