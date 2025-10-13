export type Mode = 'global' | 'local' | 'all';

export type PkgRow = {
  name: string;
  version: string;
  latest?: string;
  dev?: boolean;
};

export type Versions = {
  nodeCurrent: string;
  npmCurrent: string;
  nodeLTS?: string;
  npmLTS?: string;
};

export type PackageSource = 'global' | 'local';

export type PackageStatus = 'idle' | 'queued' | 'updating' | 'success' | 'error';

export type PackageRow = PkgRow & {
  source: PackageSource;
  missing?: boolean;
  actionable?: boolean;
  selected?: boolean;
  status?: PackageStatus;
  statusMessage?: string;
  installedVersion?: string;
  requestedVersion?: string;
};

export type PackageListResult = {
  packages: PackageRow[];
  errors: string[];
};

export type UpdateOptions = {
  dryRun?: boolean;
  onLog?: (line: string) => void;
  cwd?: string;
  env?: NodeJS.ProcessEnv;
};

export type UpdateResult = {
  name: string;
  success: boolean;
  version?: string;
  error?: string;
};

export type RuntimeOptions = {
  mode: Mode;
  cwd: string;
  readOnly: boolean;
};
