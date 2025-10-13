import type { FC } from 'react';

import type { Mode } from '../data/types.js';

type ToolbarProps = {
  mode: Mode;
  readOnly: boolean;
  busy: boolean;
  onModeChange: (mode: Mode) => void;
};

const accentPrimary = '#44d9a6';

export const Toolbar: FC<ToolbarProps> = ({
  mode,
  readOnly,
  busy,
  onModeChange,
}) => {
  return (
    <box
      style={{
        flexDirection: 'column',
        gap: 1,
        marginBottom: 1,
      }}
    >
      <box style={{ flexDirection: 'row', gap: 1, alignItems: 'center', justifyContent: 'space-between' }}>
        <box style={{ flexDirection: 'row', gap: 1, alignItems: 'center' }}>
          <text fg="#888888" wrap={false}>
            Mode:
          </text>
          {renderModeChip('global', 'G', mode, onModeChange)}
          {renderModeChip('local', 'L', mode, onModeChange)}
          {renderModeChip('all', 'A', mode, onModeChange)}
        </box>
        <box style={{ flexDirection: 'row', gap: 1 }}>
          {readOnly ? (
            <text fg="#ff9f43" wrap={false}>
              Read-only
            </text>
          ) : null}
          {busy ? (
            <text fg={accentPrimary} wrap={false}>
              Working…
            </text>
          ) : null}
        </box>
      </box>
    </box>
  );
};

type ToolbarButtonProps = {
  label: string;
  disabled?: boolean;
  onPress: () => void;
  primary?: boolean;
};

const ToolbarButton: FC<ToolbarButtonProps> = ({ label, disabled = false, onPress, primary = false }) => {
  const fg = disabled ? '#555555' : primary ? accentPrimary : '#ffffff';

  return (
    <box
      style={{
        border: true,
        borderColor: fg,
        paddingLeft: 1,
        paddingRight: 1,
        paddingTop: 0,
        paddingBottom: 0,
      }}
    >
      <text fg={fg} wrap={false}>
        {label}
      </text>
    </box>
  );
};

function renderModeChip(
  target: Mode,
  keyHint: string,
  active: Mode,
  onModeChange: (mode: Mode) => void,
) {
  const selected = target === active;
  const fg = selected ? accentPrimary : '#cccccc';
  const borderColor = selected ? accentPrimary : '#444444';

  return (
    <box
      key={target}
      style={{
        border: true,
        borderColor,
        paddingLeft: 1,
        paddingRight: 1,
        paddingTop: 0,
        paddingBottom: 0,
      }}
    >
      <text fg={fg} wrap={false}>
        ({keyHint}) {capitalize(target)}
      </text>
    </box>
  );
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
