export async function runWithConcurrency<T>(
  items: readonly T[],
  limit: number,
  iterator: (item: T, index: number) => Promise<void>,
) {
  if (items.length === 0) {
    return;
  }

  const maxConcurrency = Math.max(1, limit);
  const executing = new Set<Promise<void>>();

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    const task = iterator(item, index).finally(() => {
      executing.delete(task);
    });
    executing.add(task);
    if (executing.size >= maxConcurrency) {
      await Promise.race(executing);
    }
  }

  await Promise.all(executing);
}
