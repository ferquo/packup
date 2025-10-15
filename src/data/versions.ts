import { execCommand } from '../util/exec.js';
import { fetchJSON, getPackageDistTag } from './npmMeta.js';
import type { Versions } from './types.js';

type NodeDistEntry = {
  version: string;
  lts?: string | boolean | null;
};

const NODE_DIST_INDEX = 'https://nodejs.org/dist/index.json';

let cachedVersions: Versions | null = null;

export async function getVersions(): Promise<Versions> {
  if (cachedVersions) {
    return cachedVersions;
  }

  const [npmCurrent, nodeLTS, npmLTS] = await Promise.all([
    getNpmCurrentVersion(),
    getNodeLatestLTS(),
    getNpmLTSVersion(),
  ]);

  const versions: Versions = {
    nodeCurrent: normalizeVersion(process.version),
    npmCurrent,
    nodeLTS: nodeLTS ?? undefined,
    npmLTS: npmLTS ?? undefined,
  };

  cachedVersions = versions;
  return versions;
}

async function getNpmCurrentVersion(): Promise<string> {
  const result = await execCommand('npm -v');
  const output = result.stdout.trim() || result.stderr.trim();
  return output || '?';
}

async function getNodeLatestLTS(): Promise<string | undefined> {
  try {
    const entries = await fetchJSON<NodeDistEntry[]>(NODE_DIST_INDEX, 60 * 60 * 1000);
    if (!entries || entries.length === 0) {
      return undefined;
    }
    const latestLts = entries.find(
      (entry) => entry.lts !== null && entry.lts !== undefined && entry.lts !== false,
    );
    if (!latestLts) {
      return undefined;
    }
    return normalizeVersion(latestLts.version);
  } catch {
    return undefined;
  }
}

async function getNpmLTSVersion(): Promise<string | undefined> {
  try {
    const [lts, latest] = await Promise.all([
      getPackageDistTag('npm', 'lts'),
      getPackageDistTag('npm', 'latest'),
    ]);
    return lts ?? latest ?? undefined;
  } catch {
    return undefined;
  }
}

function normalizeVersion(version: string): string {
  return version.replace(/^v/, '').trim();
}
