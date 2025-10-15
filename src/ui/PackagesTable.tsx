import type { FC } from 'react';

import type { PackageRow } from '../data/types.js';
import { Box, Text } from './primitives.js';

type PackagesTableProps = {
  rows: PackageRow[];
  cursor: number;
  readOnly: boolean;
  loading: boolean;
  errors: string[];
  emptyMessage?: string;
};

type ColumnWidths = {
  name: number;
  installed: number;
  latest: number;
  action: number;
};

const headerLabels = {
  select: 'Sel',
  package: 'Package',
  installed: 'Installed',
  latest: 'Latest',
  action: 'Action',
};

export const PackagesTable: FC<PackagesTableProps> = ({
  rows,
  cursor,
  readOnly,
  loading,
  errors,
  emptyMessage = 'No packages discovered.',
}) => {
  const widths = computeColumnWidths(rows);
  const layout = getColumnLayout(widths);

  return (
    <Box
      style={{
        border: true,
        borderColor: '#3a3a3a',
        flexDirection: 'column',
        padding: 1,
        gap: 0,
      }}
    >
      {renderHeader(layout)}
      {errors.map((error) => (
        <Text key={error} fg="#ff6666" wrap={false}>
          ! {error}
        </Text>
      ))}
      {loading ? (
        <Text fg="#44d9a6" wrap={false}>
          ⏳ Loading package data…
        </Text>
      ) : rows.length === 0 ? (
        <Text fg="#555555" wrap>
          {emptyMessage}
        </Text>
      ) : (
        rows.map((row, index) => (
          <TableRow
            key={`${row.source}:${row.name}`}
            row={row}
            active={index === cursor}
            readOnly={readOnly}
            layout={layout}
          />
        ))
      )}
    </Box>
  );
};

function computeColumnWidths(rows: PackageRow[]): ColumnWidths {
  const base: ColumnWidths = {
    name: headerLabels.package.length,
    installed: headerLabels.installed.length,
    latest: headerLabels.latest.length,
    action: headerLabels.action.length,
  };

  for (const row of rows) {
    base.name = Math.max(base.name, row.name.length);
    base.installed = Math.max(base.installed, displayInstalled(row).length);
    base.latest = Math.max(base.latest, (row.latest ?? '?').length);
    base.action = Math.max(base.action, resolveActionLabel(row, false).length);
    if (row.actionable && !base.action) {
      base.action = Math.max(base.action, 'Update'.length);
    }
  }

  // Provide some breathing room
  base.name = Math.min(base.name + 2, 60);
  base.installed = Math.min(base.installed + 2, 16);
  base.latest = Math.min(base.latest + 2, 16);
  base.action = Math.min(base.action + 2, 16);

  return base;
}

type ColumnLayout = {
  cursor: number;
  select: number;
  name: number;
  installed: number;
  latest: number;
  action: number;
};

function getColumnLayout(widths: ColumnWidths): ColumnLayout {
  return {
    cursor: 2,
    select: 4,
    name: widths.name,
    installed: widths.installed,
    latest: widths.latest,
    action: widths.action,
  };
}

function renderHeader(layout: ColumnLayout) {
  return (
    <Box style={{ flexDirection: 'row', gap: 2, marginBottom: 1 }}>
      <HeaderCell width={layout.cursor} value="" />
      <HeaderCell width={layout.select} value={headerLabels.select} align="center" />
      <HeaderCell width={layout.name} value={headerLabels.package} />
      <HeaderCell width={layout.installed} value={headerLabels.installed} />
      <HeaderCell width={layout.latest} value={headerLabels.latest} />
      <HeaderCell width={layout.action} value={headerLabels.action} />
    </Box>
  );
}

type TableRowProps = {
  row: PackageRow;
  active: boolean;
  readOnly: boolean;
  layout: ColumnLayout;
};

const TableRow: FC<TableRowProps> = ({ row, active, readOnly, layout }) => {
  const color = resolveRowColor(row, active);
  const nameLines = wrapString(row.name, layout.name);
  const installedLines = wrapString(displayInstalled(row), layout.installed);
  const latestLines = wrapString(row.latest ?? '?', layout.latest);
  const actionLines = wrapString(resolveActionLabel(row, readOnly), layout.action);
  const lineCount = Math.max(nameLines.length, installedLines.length, latestLines.length, actionLines.length);

  const lines = [];
  for (let i = 0; i < lineCount; i += 1) {
    lines.push(
      <Box key={`${row.name}-line-${i}`} style={{ flexDirection: 'row', gap: 2 }}>
        <Cell width={layout.cursor} value={i === 0 && active ? '›' : ''} color={color} />
        <Cell width={layout.select} value={i === 0 && row.selected ? '[x]' : i === 0 ? '[ ]' : ''} color={color} />
        <Cell width={layout.name} value={nameLines[i] ?? ''} color={color} />
        <Cell width={layout.installed} value={installedLines[i] ?? ''} color={color} />
        <Cell width={layout.latest} value={latestLines[i] ?? ''} color={color} />
        <Cell width={layout.action} value={actionLines[i] ?? ''} color={color} />
      </Box>,
    );
  }

  return (
    <Box style={{ flexDirection: 'column', gap: 0 }}>
      {lines}
      {row.statusMessage ? (
        <Box style={{ flexDirection: 'row', marginLeft: layout.cursor + layout.select + 2 }}>
          <Text fg="#777777" wrap={false}>
            • {truncate(row.statusMessage, layout.name + layout.installed + layout.latest + layout.action)}
          </Text>
        </Box>
      ) : null}
    </Box>
  );
};

type HeaderCellProps = {
  width: number;
  value: string;
  align?: 'left' | 'center' | 'right';
};

const HeaderCell: FC<HeaderCellProps> = ({ width, value, align = 'left' }) => {
  const alignment = align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start';
  return (
    <Box
      style={{
        width,
        flexDirection: 'row',
        justifyContent: alignment,
        flexGrow: 0,
        flexShrink: 0,
      }}
    >
      <Text fg="#888888" wrap={false}>
        {truncate(value, width) || ' '}
      </Text>
    </Box>
  );
};

type CellProps = {
  width: number;
  value: string;
  color: string;
};

const Cell: FC<CellProps> = ({ width, value, color }) => {
  return (
    <Box style={{ width, flexDirection: 'row', flexGrow: 0, flexShrink: 0 }}>
      <Text fg={color} wrap={false}>
        {value || ' '}
      </Text>
    </Box>
  );
};

function resolveRowColor(row: PackageRow, active: boolean): string {
  if (row.status === 'error') {
    return '#ff6666';
  }
  if (row.status === 'success') {
    return '#44d9a6';
  }
  if (row.status === 'updating') {
    return '#5ab3ff';
  }
  if (active) {
    return '#ffffff';
  }
  if (row.actionable) {
    return '#cccccc';
  }
  return '#777777';
}

function resolveActionLabel(row: PackageRow, readOnly: boolean): string {
  if (readOnly) {
    return row.actionable ? 'Would update' : '—';
  }
  switch (row.status) {
    case 'queued':
      return 'Queued…';
    case 'updating':
      return 'Updating…';
    case 'success':
      return 'Updated';
    case 'error':
      return 'Failed';
    default:
      break;
  }
  return row.actionable ? 'Update' : '—';
}

function displayInstalled(row: PackageRow): string {
  if (row.missing) {
    return 'missing';
  }
  if (row.installedVersion) {
    return row.installedVersion;
  }
  return row.version;
}

function formatCell(value: string, width: number): string {
  const truncated = truncate(value, width);
  return truncated.padEnd(width);
}

function truncate(value: string, width: number): string {
  if (value.length <= width) {
    return value;
  }
  if (width <= 1) {
    return value.slice(0, width);
  }
  return `${value.slice(0, width - 1)}…`;
}

function wrapString(value: string, width: number): string[] {
  if (width <= 1) {
    return [truncate(value, width)];
  }
  const lines: string[] = [];
  let cursor = 0;
  const clampedWidth = Math.max(width, 1);
  while (cursor < value.length) {
    const slice = value.slice(cursor, cursor + clampedWidth);
    lines.push(slice);
    cursor += clampedWidth;
  }
  return lines.length > 0 ? lines : [''];
}
