import { promises as fs } from 'node:fs';
import path from 'node:path';

import { runWithConcurrency } from '../util/async.js';
import { runCommand } from '../util/exec.js';
import { getPackageLatestVersion } from './npmMeta.js';
import type { PackageListResult, PackageRow, UpdateOptions, UpdateResult } from './types.js';

type PackageJson = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  workspaces?: unknown;
};

type DependencyEntry = {
  name: string;
  spec?: string;
  dev: boolean;
};

const CONCURRENCY_LIMIT = 5;

export async function readLocalPackages(root: string): Promise<PackageListResult> {
  const errors: string[] = [];
  const packageJsonPath = path.join(root, 'package.json');
  let manifest: PackageJson | undefined;

  try {
    const contents = await fs.readFile(packageJsonPath, 'utf8');
    manifest = JSON.parse(contents) as PackageJson;
  } catch (error) {
    errors.push(`Cannot read package.json at ${packageJsonPath}: ${(error as Error).message}`);
    return { packages: [], errors };
  }

  if (manifest?.workspaces) {
    errors.push('Workspaces detected – workspace awareness is not implemented yet (TODO).');
  }

  if (!manifest) {
    return { packages: [], errors };
  }

  const lockfile = await readPackageLock(root);

  const entries = collectDependencies(manifest);
  const rows: PackageRow[] = await Promise.all(
    entries.map(async (entry) => {
      const installedVersion = await readInstalledVersion(root, entry.name);
      const lockVersion = installedVersion ? undefined : getLockfileVersion(lockfile, entry.name);
      const missing = !installedVersion;
      const version = installedVersion ?? lockVersion ?? 'missing';
      const statusMessage = missing
        ? lockVersion
          ? `lockfile ${lockVersion}`
          : entry.spec
            ? `wanted ${entry.spec}`
            : undefined
        : undefined;
      const row: PackageRow = {
        name: entry.name,
        version,
        latest: undefined,
        source: 'local',
        dev: entry.dev,
        actionable: true,
        selected: false,
        status: 'idle',
        missing,
        installedVersion: installedVersion ?? undefined,
        requestedVersion: entry.spec,
        statusMessage,
      };
      return row;
    }),
  );

  await runWithConcurrency(rows, CONCURRENCY_LIMIT, async (row) => {
    try {
      const latest = await getPackageLatestVersion(row.name);
      row.latest = latest ?? '?';
    } catch {
      row.latest = '?';
    }
    const installed = row.installedVersion;
    row.actionable = row.missing || (installed && row.latest ? normalize(installed) !== normalize(row.latest) : false);
  });

  return { packages: rows, errors };
}

export async function updateLocalPackage(
  pkg: PackageRow,
  options: UpdateOptions & { cwd: string },
): Promise<UpdateResult> {
  const args = ['install', `${pkg.name}@latest`];
  if (pkg.dev) {
    args.push('--save-dev');
  } else {
    args.push('--save-prod');
  }

  const result = await runCommand('npm', {
    args,
    cwd: options.cwd,
    dryRun: options.dryRun,
    onLog: options.onLog,
    env: options.env,
  });

  if (result.code !== 0) {
    const errorMessage = result.stderr || `npm install exited with code ${result.code}`;
    return { name: pkg.name, success: false, error: errorMessage };
  }

  const detectedVersion =
    extractVersionFromOutput(pkg.name, `${result.stdout}\n${result.stderr}`) ??
    (await getPackageLatestVersion(pkg.name));

  return {
    name: pkg.name,
    success: true,
    version: detectedVersion,
  };
}

export async function updateLocalPackages(
  packages: PackageRow[],
  options: UpdateOptions & { cwd: string },
): Promise<UpdateResult[]> {
  const results: UpdateResult[] = [];
  for (const pkg of packages) {
    // eslint-disable-next-line no-await-in-loop
    const result = await updateLocalPackage(pkg, options);
    results.push(result);
  }
  return results;
}

export async function hasPackageManifest(root: string): Promise<boolean> {
  try {
    const packageJsonPath = path.join(root, 'package.json');
    await fs.access(packageJsonPath);
    return true;
  } catch {
    return false;
  }
}

function collectDependencies(manifest: PackageJson): DependencyEntry[] {
  const map = new Map<string, DependencyEntry>();
  const assign = (deps: Record<string, string> | undefined, isDev: boolean) => {
    if (!deps) {
      return;
    }
    for (const [name, spec] of Object.entries(deps)) {
      const existing = map.get(name);
      if (existing) {
        existing.dev = existing.dev && isDev;
        if (!existing.spec && spec) {
          existing.spec = spec;
        }
      } else {
        map.set(name, { name, spec, dev: isDev });
      }
    }
  };

  assign(manifest.dependencies, false);
  assign(manifest.devDependencies, true);
  assign(manifest.optionalDependencies, false);

  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

async function readInstalledVersion(root: string, packageName: string): Promise<string | undefined> {
  const segments = packageName.startsWith('@')
    ? packageName.split('/')
    : packageName.split('/');

  const packageJsonPath = path.join(root, 'node_modules', ...segments, 'package.json');
  try {
    const contents = await fs.readFile(packageJsonPath, 'utf8');
    const data = JSON.parse(contents) as { version?: string };
    return data.version ?? undefined;
  } catch {
    return undefined;
  }
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

function normalize(version: string): string {
  return version.replace(/^v/, '').trim();
}

type PackageLock = {
  packages?: Record<string, { version?: string }>;
  dependencies?: Record<string, { version?: string }>;
};

async function readPackageLock(root: string): Promise<PackageLock | undefined> {
  const packageLockPath = path.join(root, 'package-lock.json');
  try {
    const contents = await fs.readFile(packageLockPath, 'utf8');
    return JSON.parse(contents) as PackageLock;
  } catch {
    return undefined;
  }
}

function getLockfileVersion(lockfile: PackageLock | undefined, name: string): string | undefined {
  if (!lockfile) {
    return undefined;
  }
  const direct = lockfile.packages?.[`node_modules/${name}`];
  if (direct?.version) {
    return direct.version;
  }
  const dependency = lockfile.dependencies?.[name];
  if (dependency?.version) {
    return dependency.version;
  }
  return undefined;
}
