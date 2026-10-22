import { handleAiRequest, type WorkerEnv } from '../../../worker/src/handler';

type PagesContext = {
  request: Request;
  env: WorkerEnv;
};

export async function onRequest(context: PagesContext): Promise<Response> {
  return handleAiRequest(context.request, context.env);
}
