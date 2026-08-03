export interface MapWithConcurrencyOptions<TResult> {
  concurrency?: number;
  signal?: AbortSignal;
  stopWhen?: (value: TResult, index: number) => boolean;
}

/**
 * Runs independent Kenjitsu operations with a bounded number of workers.
 * Kenjitsu protects the API with a global request budget, so starting one
 * search per extension at once can make a normal playback request look like
 * a burst and cause every extension to receive 403 responses.
 */
export async function mapWithConcurrency<TItem, TResult>(
  items: readonly TItem[],
  worker: (item: TItem, index: number) => Promise<TResult>,
  options: MapWithConcurrencyOptions<TResult> = {},
): Promise<Array<TResult | undefined>> {
  const results: Array<TResult | undefined> = new Array(items.length);
  const workerCount = Math.min(Math.max(1, options.concurrency ?? 4), items.length);
  let nextIndex = 0;
  let stopped = false;

  const run = async () => {
    while (!stopped && !options.signal?.aborted) {
      const index = nextIndex++;
      if (index >= items.length) return;

      try {
        const value = await worker(items[index], index);
        results[index] = value;
        if (options.stopWhen?.(value, index)) stopped = true;
      } catch {
        // A single unavailable extension must not hide results from the others.
      }
    }
  };

  if (!items.length) return results;
  await Promise.all(Array.from({ length: workerCount }, () => run()));
  return results;
}
