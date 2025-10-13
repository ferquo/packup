import { runWithConcurrency } from '../util/async.js';
import { execCommand, runCommand } from '../util/exec.js';
import { getPackageLatestVersion } from './npmMeta.js';
import type { PackageListResult, PackageRow, UpdateOptions, UpdateResult } from './types.js';

type NpmListDependency = {
  version?: string;
  resolved?: string;
  from?: string;
  dependencies?: Record<string, NpmListDependency>;
};

type NpmListResult = {
  dependencies?: Record<string, NpmListDependency>;
  problems?: string[];
};

const IGNORED_PACKAGES = new Set(['npm']);
const CONCURRENCY_LIMIT = 5;

export async function readGlobalPackages(): Promise<PackageListResult> {
  const errors: string[] = [];
  const rows: PackageRow[] = [];

  const result = await execCommand('npm ls -g --depth=0 --json');
  const payload = result.stdout || result.stderr;

  if (!payload) {
    return { packages: [], errors: ['Failed to read global packages.'] };
  }

  try {
    const parsed = JSON.parse(payload) as NpmListResult;
    const dependencies = parsed.dependencies ?? {};
    for (const [name, data] of Object.entries(dependencies)) {
      if (IGNORED_PACKAGES.has(name)) {
        continue;
      }
      const version = data.version ?? '?';
      rows.push({
        name,
        version,
        latest: undefined,
        source: 'global',
        actionable: true,
        selected: false,
        status: 'idle',
      });
    }
  } catch (error) {
    errors.push(`Unable to parse npm output: ${(error as Error).message}`);
  }

  await hydrateLatestVersions(rows, errors);

  return { packages: rows, errors };
}

export async function updateGlobalPackage(name: string, options: UpdateOptions = {}): Promise<UpdateResult> {
  const args = ['install', '-g', `${name}@latest`];
  const log = options.onLog;
  const result = await runCommand('npm', {
    args,
    dryRun: options.dryRun,
    onLog: log,
    cwd: options.cwd,
    env: options.env,
  });

  if (result.code !== 0) {
    const errorMessage = result.stderr || `npm install exited with code ${result.code}`;
    return { name, success: false, error: errorMessage };
  }

  const detectedVersion =
    extractVersionFromOutput(name, result.stdout) ??
    extractVersionFromOutput(name, result.stderr) ??
    (await getPackageLatestVersion(name));

  return {
    name,
    success: true,
    version: detectedVersion,
  };
}

export async function updateGlobalPackages(names: string[], options: UpdateOptions = {}): Promise<UpdateResult[]> {
  const results: UpdateResult[] = [];
  for (const name of names) {
    // eslint-disable-next-line no-await-in-loop
    const result = await updateGlobalPackage(name, options);
    results.push(result);
  }
  return results;
}

export async function updateNpm(options: UpdateOptions = {}): Promise<UpdateResult> {
  return updateGlobalPackage('npm', options);
}

async function hydrateLatestVersions(rows: PackageRow[], errors: string[]) {
  await runWithConcurrency(rows, CONCURRENCY_LIMIT, async (row) => {
    try {
      const latest = await getPackageLatestVersion(row.name);
      row.latest = latest ?? '?';
    } catch (error) {
      row.latest = '?';
      errors.push(`Failed to load metadata for ${row.name}: ${(error as Error).message}`);
    }
    row.actionable = row.latest ? row.latest.trim() !== row.version.trim() : false;
  });
}

function extractVersionFromOutput(name: string, output: string): string | undefined {
  if (!output) {
    return undefined;
  }
  const regex = new RegExp(`${escapeRegExp(name)}@([\\w.-]+)`, 'i');
  const match = output.match(regex);
  return match?.[1];
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
