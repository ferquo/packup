import { PackageRow } from '../data/types.js';

export type TableState = {
  cursor: number;
};

export function createInitialState(rows: PackageRow[]): TableState {
  return { cursor: clampCursor(rows, 0) };
}

export function clampCursor(rows: PackageRow[], index: number): number {
  if (rows.length === 0) {
    return -1;
  }
  if (index < 0) {
    return 0;
  }
  if (index >= rows.length) {
    return rows.length - 1;
  }
  return index;
}

export function moveCursor(rows: PackageRow[], current: number, delta: number): number {
  return clampCursor(rows, current + delta);
}

export function toggleRowSelection(rows: PackageRow[], index: number): PackageRow[] {
  return rows.map((row, rowIndex) => {
    if (rowIndex !== index) {
      return row;
    }
    return { ...row, selected: !row.selected };
  });
}

export function setSelection(rows: PackageRow[], selected: boolean): PackageRow[] {
  return rows.map((row) => ({ ...row, selected }));
}

export function clearSelection(rows: PackageRow[]): PackageRow[] {
  return setSelection(rows, false);
}

export function getSelected(rows: PackageRow[]): PackageRow[] {
  return rows.filter((row) => row.selected);
}

export function countUpdatable(rows: PackageRow[]) {
  const total = rows.length;
  const selectable = rows.filter(isActionable).length;
  const selected = rows.filter((row) => row.selected).length;
  const updatable = rows.filter((row) => isOutdated(row) && isActionable(row)).length;
  const selectedUpdatable = rows.filter((row) => row.selected && isOutdated(row) && isActionable(row)).length;
  return { total, selectable, selected, updatable, selectedUpdatable };
}

export function isOutdated(row: PackageRow): boolean {
  if (!row.latest) {
    return false;
  }
  if (!row.version) {
    return true;
  }
  return row.version.trim() !== row.latest.trim();
}

export function isActionable(row: PackageRow): boolean {
  return !!row.actionable;
}

export function applySelection(rows: PackageRow[], predicate: (row: PackageRow) => boolean): PackageRow[] {
  return rows.map((row) => ({ ...row, selected: predicate(row) }));
}

export function toggleSelectAll(rows: PackageRow[]): PackageRow[] {
  const allSelected = rows.every((row) => row.selected);
  return setSelection(rows, !allSelected);
}
