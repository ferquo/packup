import { spawn, exec as execCallback } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(execCallback);

export type ExecOptions = {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
};

export type RunCommandOptions = ExecOptions & {
  args?: string[];
  dryRun?: boolean;
  onStdout?: (line: string) => void;
  onStderr?: (line: string) => void;
  onLog?: (line: string) => void;
};

export type ExecResult = {
  stdout: string;
  stderr: string;
  code: number;
};

export async function execCommand(command: string, options: ExecOptions = {}): Promise<ExecResult> {
  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd: options.cwd,
      env: options.env,
      maxBuffer: 10 * 1024 * 1024,
    });
    return { stdout, stderr, code: 0 };
  } catch (error) {
    if (isExecError(error)) {
      return {
        stdout: error.stdout ?? '',
        stderr: error.stderr ?? '',
        code: typeof error.code === 'number' ? error.code : 1,
      };
    }
    throw error;
  }
}

export async function runCommand(command: string, options: RunCommandOptions = {}): Promise<ExecResult> {
  const {
    args = [],
    cwd,
    env,
    dryRun = false,
    onStdout,
    onStderr,
    onLog,
  } = options;

  const renderedCommand = `${command} ${args.join(' ')}`.trim();
  if (dryRun) {
    onLog?.(`DRY RUN: ${renderedCommand}`);
    return { stdout: '', stderr: '', code: 0 };
  }

  return new Promise<ExecResult>((resolve, reject) => {
    const stdouts: string[] = [];
    const stderrs: string[] = [];
    const resolvedCommand = normalizeCommand(command);
    const child = spawn(resolvedCommand, args, {
      cwd,
      env,
      shell: process.platform === 'win32',
    });

    wireStream(child.stdout, (line) => {
      stdouts.push(line);
      onStdout?.(line);
      onLog?.(line);
    });

    wireStream(child.stderr, (line) => {
      stderrs.push(line);
      onStderr?.(line);
      onLog?.(line);
    });

    child.once('error', (error) => {
      reject(error);
    });

    child.once('close', (code) => {
      resolve({
        stdout: stdouts.join('\n'),
        stderr: stderrs.join('\n'),
        code: typeof code === 'number' ? code : 0,
      });
    });
  });
}

function wireStream(stream: NodeJS.ReadableStream | null, onLine: (line: string) => void) {
  if (!stream) {
    return;
  }
  stream.setEncoding('utf8');
  let buffer = '';
  stream.on('data', (chunk: string) => {
    buffer += chunk;
    const parts = buffer.split(/\r?\n/);
    buffer = parts.pop() ?? '';
    for (const part of parts) {
      onLine(part);
    }
  });
  stream.on('end', () => {
    if (buffer.length > 0) {
      onLine(buffer);
    }
  });
}

function normalizeCommand(command: string): string {
  if (process.platform === 'win32') {
    if (command === 'npm') {
      return 'npm.cmd';
    }
    if (command === 'npx') {
      return 'npx.cmd';
    }
  }
  return command;
}

type ExecError = Error & {
  code?: number;
  stdout?: string;
  stderr?: string;
};

function isExecError(error: unknown): error is ExecError {
  return (
    typeof error === 'object' &&
    error !== null &&
    ('stdout' in error || 'stderr' in error)
  );
}
