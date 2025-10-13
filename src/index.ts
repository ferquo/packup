#!/usr/bin/env node
import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import type { Mode } from './data/types.js';
import { hasPackageManifest } from './data/local.js';
import { renderApp } from './renderer.js';

type CLIOptions = {
  mode?: Mode;
  cwd: string;
  readOnly: boolean;
};

const pkgJson = readPackageJson();

async function main() {
  const options = await parseArgs(process.argv.slice(2));
  const initialMode = options.mode ?? (await defaultMode(options.cwd));

  await renderApp({
    initialMode,
    cwd: options.cwd,
    readOnly: options.readOnly,
  });
}

async function parseArgs(argv: string[]): Promise<CLIOptions> {
  let mode: Mode | undefined;
  let readOnly = false;
  let cwd = process.cwd();

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    switch (arg) {
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
        break;
      case '--version':
      case '-v':
        printVersion();
        process.exit(0);
        break;
      case '--global':
        mode = 'global';
        break;
      case '--local':
        mode = 'local';
        break;
      case '--all':
        mode = 'all';
        break;
      case '--read-only':
        readOnly = true;
        break;
      case '--cwd': {
        const next = argv[index + 1];
        if (!next) {
          throw new Error('--cwd requires a directory path');
        }
        index += 1;
        cwd = path.resolve(next);
        if (!isDirectory(cwd)) {
          throw new Error(`Directory does not exist: ${cwd}`);
        }
        break;
      }
      default:
        if (arg.startsWith('-')) {
          throw new Error(`Unknown option: ${arg}`);
        }
        cwd = path.resolve(arg);
        if (!isDirectory(cwd)) {
          throw new Error(`Directory does not exist: ${cwd}`);
        }
        break;
    }
  }

  return { mode, cwd, readOnly };
}

async function defaultMode(cwd: string): Promise<Mode> {
  return (await hasPackageManifest(cwd)) ? 'local' : 'global';
}

function readPackageJson(): { name?: string; version?: string } {
  try {
    const file = new URL('../package.json', import.meta.url);
    const contents = readFileSync(file, 'utf8');
    return JSON.parse(contents) as { name?: string; version?: string };
  } catch {
    return {};
  }
}

function printHelp() {
  const name = pkgJson.name ?? 'packup';
  const version = pkgJson.version ?? 'unknown';
  const message = `
${name} v${version}

Usage:
  packup [options]

Options:
  --global              Start in global mode
  --local               Start in local mode
  --all                 Show both global and local packages
  --cwd <dir>           Operate on a specific directory
  --read-only           Disable update commands
  --version, -v         Print version
  --help, -h            Show this help message
`;
  process.stdout.write(message);
}

function printVersion() {
  const version = pkgJson.version ?? 'unknown';
  process.stdout.write(`${version}\n`);
}

function isDirectory(dirPath: string): boolean {
  try {
    return statSync(dirPath).isDirectory();
  } catch {
    return false;
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
