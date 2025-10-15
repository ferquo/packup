import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useKeyboard } from '@opentui/react';

import type { Mode, PackageRow, PackageSource, Versions } from './data/types.js';
import { getVersions } from './data/versions.js';
import { readGlobalPackages, updateGlobalPackage, updateNpm } from './data/global.js';
import { hasPackageManifest, readLocalPackages, updateLocalPackage } from './data/local.js';
import { countUpdatable, clampCursor, getSelected } from './util/table.js';
import { Hero } from './ui/Hero.js';
import { LogPanel } from './ui/LogPanel.js';
import { PackagesTable } from './ui/PackagesTable.js';
import { Toolbar } from './ui/Toolbar.js';
import { Box, Text } from './ui/primitives.js';

type ModeData = {
  rows: PackageRow[];
  loading: boolean;
  errors: string[];
};

type PackagesState = {
  global: ModeData;
  local: ModeData;
};

type CursorState = Record<Mode, number>;

export type AppProps = {
  initialMode: Mode;
  cwd: string;
  readOnly?: boolean;
};

const ACCENT = '#44d9a6';
const MAX_LOG_LINES = 40;

export const App = ({ initialMode, cwd, readOnly = false }: AppProps) => {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [versions, setVersions] = useState<Versions | null>(null);
  const [packages, setPackages] = useState<PackagesState>(() => ({
    global: { rows: [], loading: true, errors: [] },
    local: { rows: [], loading: true, errors: [] },
  }));
  const [cursor, setCursor] = useState<CursorState>({ global: 0, local: 0, all: 0 });
  const [logLines, setLogLines] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [localAvailable, setLocalAvailable] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('Loading package data…');

  const rows = useMemo(() => {
    if (mode === 'global') {
      return packages.global.rows;
    }
    if (mode === 'local') {
      return packages.local.rows;
    }
    return [...packages.global.rows, ...packages.local.rows];
  }, [mode, packages]);

  const currentCursor = cursor[mode];
  const activeRow = rows[currentCursor];

  const stats = useMemo(() => countUpdatable(rows), [rows]);

  useEffect(() => {
    let cancelled = false;
    getVersions()
      .then((value) => {
        if (!cancelled) {
          setVersions(value);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setVersions({
            nodeCurrent: process.version.replace(/^v/, ''),
            npmCurrent: '?',
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const appendLog = useCallback((input: string) => {
    const timestamp = new Date();
    const timePrefix = timestamp.toISOString().split('T')[1]?.slice(0, 8) ?? '';
    const segments = input.split(/\r?\n/).filter(Boolean);
    setLogLines((prev) => {
      const next = [...prev, ...segments.map((line) => `[${timePrefix}] ${line}`)];
      if (next.length > MAX_LOG_LINES) {
        return next.slice(-MAX_LOG_LINES);
      }
      return next;
    });
  }, []);

  const setModeRows = useCallback(
    (source: PackageSource, updater: (rows: PackageRow[]) => PackageRow[]) => {
      setPackages((prev) => {
        const modeState = prev[source];
        const nextRows = updater(modeState.rows);
        return {
          ...prev,
          [source]: {
            ...modeState,
            rows: nextRows,
          },
        };
      });
    },
    [],
  );

  const refreshSource = useCallback(
    async (source: PackageSource) => {
      if (source === 'local' && !localAvailable) {
        return;
      }
      setPackages((prev) => ({
        ...prev,
        [source]: {
          ...prev[source],
          loading: true,
          errors: [],
        },
      }));

      const result =
        source === 'global' ? await readGlobalPackages() : await readLocalPackages(cwd);

      setPackages((prev) => ({
        ...prev,
        [source]: {
          rows: result.packages,
          loading: false,
          errors: result.errors,
        },
      }));
    },
    [cwd, localAvailable],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const manifestExists = await hasPackageManifest(cwd);
      if (cancelled) {
        return;
      }
      setLocalAvailable(manifestExists);
      if (!manifestExists) {
        setPackages((prev) => ({
          global: prev.global,
          local: {
            rows: [],
            loading: false,
            errors: [`No package.json found in ${cwd}`],
          },
        }));
      }
      await Promise.all([
        readGlobalPackages().then((result) => {
          if (cancelled) {
            return;
          }
          setPackages((prev) => ({
            ...prev,
            global: {
              rows: result.packages,
              loading: false,
              errors: result.errors,
            },
            local: manifestExists ? prev.local : prev.local,
          }));
        }),
        manifestExists
          ? readLocalPackages(cwd).then((result) => {
              if (cancelled) {
                return;
              }
              setPackages((prev) => ({
                ...prev,
                local: {
                  rows: result.packages,
                  loading: false,
                  errors: result.errors,
                },
              }));
            })
          : Promise.resolve(),
      ]);
    })();
    return () => {
      cancelled = true;
    };
  }, [cwd]);

  useEffect(() => {
    setStatusMessage(
      stats.updatable > 0
        ? `${stats.updatable} packages have updates available`
        : 'All visible packages are up to date',
    );
  }, [stats]);

  useEffect(() => {
    setCursor((prev) => {
      const next: CursorState = { ...prev };
      const globalCursor = clampCursor(packages.global.rows, prev.global);
      const localCursor = clampCursor(packages.local.rows, prev.local);
      const allCursor = clampCursor([...packages.global.rows, ...packages.local.rows], prev.all);
      if (globalCursor !== prev.global) {
        next.global = globalCursor;
      }
      if (localCursor !== prev.local) {
        next.local = localCursor;
      }
      if (allCursor !== prev.all) {
        next.all = allCursor;
      }
      return next;
    });
  }, [packages]);

  const handleMoveCursor = useCallback(
    (delta: number) => {
      setCursor((prev) => {
        const targetRows =
          mode === 'global'
            ? packages.global.rows
            : mode === 'local'
              ? packages.local.rows
              : [...packages.global.rows, ...packages.local.rows];
        const nextIndex = clampCursor(targetRows, prev[mode] + delta);
        if (nextIndex === prev[mode]) {
          return prev;
        }
        return { ...prev, [mode]: nextIndex };
      });
    },
    [mode, packages],
  );

  const updateRow = useCallback(
    (row: PackageRow, updater: (value: PackageRow) => PackageRow) => {
      setModeRows(row.source, (rowsForMode) =>
        rowsForMode.map((candidate) =>
          candidate.source === row.source && candidate.name === row.name ? updater(candidate) : candidate,
        ),
      );
    },
    [setModeRows],
  );

  const performUpdates = useCallback(
    async (targetRows: PackageRow[]) => {
      if (targetRows.length === 0) {
        return;
      }
      setBusy(true);
      appendLog(`Updating ${targetRows.length} package(s)…`);

      const sourcesToRefresh = new Set<PackageSource>();

      for (const row of targetRows) {
        sourcesToRefresh.add(row.source);
        updateRow(row, (current) => ({
          ...current,
          status: 'updating',
          statusMessage: 'Installing latest release…',
        }));
        const options = {
          cwd,
          dryRun: false,
          onLog: appendLog,
        };
        const result =
          row.source === 'global'
            ? await updateGlobalPackage(row.name, options)
            : await updateLocalPackage(row, options);

        if (result.success) {
          appendLog(`✓ ${row.name} updated to ${result.version ?? 'latest'}`);
          updateRow(row, (current) => ({
            ...current,
            status: 'success',
            statusMessage: result.version ? `Now at ${result.version}` : 'Up to date',
            version: result.version ?? current.version,
            installedVersion: result.version ?? current.installedVersion,
            actionable: false,
            selected: false,
          }));
        } else {
          const message = result.error ?? 'Unknown error';
          appendLog(`✗ ${row.name} failed: ${message}`);
          updateRow(row, (current) => ({
            ...current,
            status: 'error',
            statusMessage: message,
          }));
        }
      }

      for (const source of sourcesToRefresh) {
        // eslint-disable-next-line no-await-in-loop
        await refreshSource(source);
      }

      setBusy(false);
    },
    [appendLog, cwd, refreshSource, updateRow],
  );

  const handleUpdateFocused = useCallback(() => {
    if (readOnly) {
      appendLog('Read-only mode: updates are disabled.');
      return;
    }
    if (!activeRow || !activeRow.actionable) {
      return;
    }
    void performUpdates([activeRow]);
  }, [activeRow, appendLog, performUpdates, readOnly]);

  const handleUpdateSelected = useCallback(() => {
    if (readOnly) {
      appendLog('Read-only mode: updates are disabled.');
      return;
    }
    const selectedRows = getSelected(rows).filter((row) => row.actionable);
    void performUpdates(selectedRows);
  }, [appendLog, performUpdates, readOnly, rows]);

  const handleUpdateAll = useCallback(() => {
    if (readOnly) {
      appendLog('Read-only mode: updates are disabled.');
      return;
    }
    const updatable = rows.filter((row) => row.actionable);
    void performUpdates(updatable);
  }, [appendLog, performUpdates, readOnly, rows]);

  const handleUpdateNpm = useCallback(async () => {
    if (readOnly) {
      appendLog('Read-only mode: updates are disabled.');
      return;
    }
    setBusy(true);
    appendLog('Updating npm globally…');
    const result = await updateNpm({ onLog: appendLog });
    if (result.success) {
      appendLog(`✓ npm updated to ${result.version ?? 'latest'}`);
    } else {
      appendLog(`✗ npm update failed: ${result.error ?? 'Unknown error'}`);
    }
    await refreshSource('global');
    setBusy(false);
  }, [appendLog, readOnly, refreshSource]);

  const toggleSelection = useCallback(() => {
    if (!activeRow) {
      return;
    }
    updateRow(activeRow, (current) => ({
      ...current,
      selected: !current.selected,
    }));
  }, [activeRow, updateRow]);

  const setSelectionForMode = useCallback(
    (targetMode: Mode, selected: boolean) => {
      if (targetMode === 'global' || targetMode === 'local') {
        setModeRows(targetMode, (rowsForMode) =>
          rowsForMode.map((row) => ({
            ...row,
            selected: selected ? row.actionable : false,
          })),
        );
      } else {
        setModeRows('global', (rowsForMode) =>
          rowsForMode.map((row) => ({
            ...row,
            selected: selected ? row.actionable : false,
          })),
        );
        setModeRows('local', (rowsForMode) =>
          rowsForMode.map((row) => ({
            ...row,
            selected: selected ? row.actionable : false,
          })),
        );
      }
    },
    [setModeRows],
  );

  const clearStatuses = useCallback(() => {
    setModeRows('global', (rowsForMode) =>
      rowsForMode.map((row) => ({
        ...row,
        status: row.status === 'updating' ? 'error' : row.status,
      })),
    );
    setModeRows('local', (rowsForMode) =>
      rowsForMode.map((row) => ({
        ...row,
        status: row.status === 'updating' ? 'error' : row.status,
      })),
    );
  }, [setModeRows]);

  useKeyboard((key) => {
    if (key.ctrl && key.name === 'c') {
      appendLog('Received SIGINT, exiting…');
      clearStatuses();
      process.exit(130);
    }
    if (key.name === 'q') {
      appendLog('Quitting PackUp.');
      clearStatuses();
      process.exit(0);
    }
    if (key.shift && key.name === 'u') {
      handleUpdateAll();
      return;
    }
    switch (key.name) {
      case 'down':
        handleMoveCursor(1);
        break;
      case 'up':
        handleMoveCursor(-1);
        break;
      case 'space':
        toggleSelection();
        break;
      case 'return':
        handleUpdateFocused();
        break;
      case 'u':
        handleUpdateSelected();
        break;
      case 'g':
        setMode('global');
        break;
      case 'l':
        setMode('local');
        break;
      case 'a':
        setMode('all');
        break;
      case 's':
        setSelectionForMode(mode, true);
        break;
      case 'c':
        setSelectionForMode(mode, false);
        break;
      case 'n':
        void handleUpdateNpm();
        break;
      default:
        break;
    }
  });

  return (
    <Box style={{ flexDirection: 'column', gap: 1, padding: 1 }}>
      <Hero versions={versions} mode={mode} readOnly={readOnly} />
      <Text fg={ACCENT} wrap={false}>
        {statusMessage}
      </Text>
      <Toolbar mode={mode} readOnly={readOnly} busy={busy} onModeChange={setMode} />
      <PackagesTable
        rows={rows}
        cursor={currentCursor}
        readOnly={readOnly}
        loading={
          mode === 'global'
            ? packages.global.loading
            : mode === 'local'
              ? packages.local.loading
              : packages.global.loading || packages.local.loading
        }
        errors={
          mode === 'global'
            ? packages.global.errors
            : mode === 'local'
              ? packages.local.errors
              : [...packages.global.errors, ...packages.local.errors]
        }
      />
      <Footer readOnly={readOnly} />
      <LogPanel lines={logLines} />
    </Box>
  );
};

type FooterProps = {
  readOnly: boolean;
};

const Footer = ({ readOnly }: FooterProps) => (
  <Box
    style={{
      flexDirection: 'row',
      gap: 1,
      alignItems: 'center',
      border: true,
      borderColor: '#333333',
      padding: 1,
    }}
  >
    <Text fg="#888888" wrap>
      Keyboard: ↑/↓ move • space select • enter update focused • U update selected • Shift+U update all • G/L/A switch mode • S select all • C clear • N update npm • Q quit
    </Text>
    {readOnly ? (
      <Text fg="#ff9f43" wrap={false}>
        Updates disabled in read-only mode.
      </Text>
    ) : (
      <Text fg="#5ab3ff" wrap>
        Press N to update the global npm CLI (runs npm install -g npm@latest).
      </Text>
    )}
  </Box>
);
