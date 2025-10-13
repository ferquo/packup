import https from 'node:https';
import { URL } from 'node:url';

type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

const cache = new Map<string, CacheEntry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

const DEFAULT_TTL_MS = 5 * 60 * 1000;
const DEFAULT_TIMEOUT_MS = 10_000;
const USER_AGENT = 'PackUp/0.1 (+https://www.npmjs.com/package/@ferquo/packup)';

export type NpmRegistryPackage = {
  name: string;
  ['dist-tags']?: Record<string, string>;
  versions?: Record<string, NpmRegistryPackageVersion>;
};

export type NpmRegistryPackageVersion = {
  version: string;
};

export async function fetchJSON<T>(url: string, ttlMs: number = DEFAULT_TTL_MS): Promise<T | undefined> {
  const cached = cache.get(url);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value as T;
  }

  const inflightRequest = inflight.get(url) as Promise<T | undefined> | undefined;
  if (inflightRequest) {
    return inflightRequest;
  }

  const promise = requestJSON<T>(url)
    .catch(() => undefined)
    .then((value) => {
      if (value !== undefined && value !== null) {
        cache.set(url, { value, expiresAt: Date.now() + ttlMs });
      }
      return value;
    })
    .finally(() => {
      inflight.delete(url);
    });

  inflight.set(url, promise as Promise<unknown>);
  return promise;
}

export async function getPackageMetadata(name: string): Promise<NpmRegistryPackage | undefined> {
  const encoded = encodeURIComponent(name);
  const url = `https://registry.npmjs.org/${encoded}`;
  return fetchJSON<NpmRegistryPackage>(url);
}

export async function getPackageLatestVersion(name: string): Promise<string | undefined> {
  try {
    const metadata = await getPackageMetadata(name);
    const distTags = metadata?.['dist-tags'];
    if (!distTags) {
      return undefined;
    }
    return distTags.latest;
  } catch {
    return undefined;
  }
}

export async function getPackageDistTag(name: string, tag: string): Promise<string | undefined> {
  try {
    const metadata = await getPackageMetadata(name);
    return metadata?.['dist-tags']?.[tag];
  } catch {
    return undefined;
  }
}

async function requestJSON<T>(url: string): Promise<T | undefined> {
  const parsed = new URL(url);

  return new Promise<T | undefined>((resolve, reject) => {
    const req = https.get(
      parsed,
      {
        headers: {
          'user-agent': USER_AGENT,
          accept: 'application/json',
        },
        timeout: DEFAULT_TIMEOUT_MS,
      },
      (res) => {
        if (!res.statusCode) {
          res.resume();
          resolve(undefined);
          return;
        }

        if (res.statusCode >= 400) {
          res.resume();
          resolve(undefined);
          return;
        }

        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => {
          chunks.push(chunk);
        });
        res.on('end', () => {
          try {
            const raw = Buffer.concat(chunks).toString('utf8');
            if (!raw) {
              resolve(undefined);
              return;
            }
            const json = JSON.parse(raw) as T;
            resolve(json);
          } catch (error) {
            reject(error);
          }
        });
      },
    );

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy(new Error('Request timed out'));
    });
  });
}
