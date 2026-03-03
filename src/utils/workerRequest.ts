/**
 * Wrap a one-shot Worker request/response exchange in a Promise.
 * Attaches `message` and `error` listeners, cleans them up on settlement,
 * and resolves with `TResponse` when `isSuccess` returns true, otherwise rejects.
 */
export function workerRequest<TResponse>(
  worker: Worker,
  payload: unknown,
  isSuccess: (data: unknown) => data is TResponse,
): Promise<TResponse> {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      worker.removeEventListener('message', onMessage);
      worker.removeEventListener('error', onError);
    };
    const onMessage = (e: MessageEvent) => {
      cleanup();
      if (isSuccess(e.data)) {
        resolve(e.data);
      } else {
        reject(new Error((e.data as { message?: string }).message ?? 'Worker returned an error'));
      }
    };
    const onError = (e: ErrorEvent) => {
      cleanup();
      reject(new Error(e.message || 'Worker error'));
    };
    worker.addEventListener('message', onMessage);
    worker.addEventListener('error', onError);
    worker.postMessage(payload);
  });
}
