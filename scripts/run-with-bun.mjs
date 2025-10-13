#!/usr/bin/env node
import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';

const args = process.argv.slice(2);

const bunExecutable = resolveBun();

if (!bunExecutable) {
  const bunHome = process.env.BUN_INSTALL ?? path.join(homedir(), '.bun');
  console.error('PackUp requires the Bun runtime because @opentui/core depends on bun:ffi.');
  console.error('Install Bun from https://bun.sh and ensure it is available on your PATH.');
  console.error(`If Bun is installed in a non-standard location, set PACKUP_BUN=/path/to/bun (default search includes ${path.join(bunHome, 'bin', bunExecutableName())}).`);
  process.exit(1);
}

const child = spawn(bunExecutable, ['run', 'src/index.ts', ...args], {
  stdio: 'inherit',
  env: process.env,
});

child.on('error', (err) => {
  console.error(err);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
  } else {
    process.exit(code ?? 0);
  }
});

function resolveBun() {
  const candidates = new Set();
  const explicit = process.env.PACKUP_BUN?.trim();
  if (explicit) {
    collectCandidates(candidates, explicit);
  }
  collectCandidates(candidates, 'bun');
  collectCandidates(candidates, bunExecutableName());
  const bunHome = process.env.BUN_INSTALL ?? path.join(homedir(), '.bun');
  collectCandidates(candidates, path.join(bunHome, 'bin', bunExecutableName()));

  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }
    if (!candidate.includes(path.sep) && candidate === bunExecutableName()) {
      const check = spawnSync(candidate, ['--version'], { stdio: 'ignore' });
      if (!check.error) {
        return candidate;
      }
      continue;
    }
    if (existsSync(candidate)) {
      return candidate;
    }
    const check = spawnSync(candidate, ['--version'], { stdio: 'ignore' });
    if (!check.error) {
      return candidate;
    }
  }
  return null;
}

function collectCandidates(set, candidate) {
  if (!candidate) {
    return;
  }
  set.add(candidate);
  if (process.platform === 'win32' && !candidate.endsWith('.exe')) {
    set.add(`${candidate}.exe`);
  }
}

function bunExecutableName() {
  return process.platform === 'win32' ? 'bun.exe' : 'bun';
}
