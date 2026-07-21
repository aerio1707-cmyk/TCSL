// 同一份檔案（同名/同大小/同修改時間）只解析一次，重複按「開始分析」時直接複用結果
const cache = new Map<string, Promise<unknown>>();

function cacheKey(file: File): string {
  return `${file.name}|${file.size}|${file.lastModified}`;
}

export function withFileCache<T>(file: File, compute: () => Promise<T>): Promise<T> {
  const key = cacheKey(file);
  const hit = cache.get(key);
  if (hit) return hit as Promise<T>;
  const promise = compute();
  cache.set(key, promise);
  return promise;
}
