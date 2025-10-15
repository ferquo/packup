import type { FC } from 'react';

import type { Mode } from '../data/types.js';
import { Box, Text } from './primitives.js';

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
    <Box
      style={{
        flexDirection: 'column',
        gap: 1,
        marginBottom: 1,
        alignItems: 'center',
      }}
    >
      <Box style={{ flexDirection: 'row', gap: 2, alignItems: 'center', justifyContent: 'center' }}>
        <Box style={{ flexDirection: 'row', gap: 1, alignItems: 'center' }}>
          <Text fg="#888888" wrap={false}>
            Mode:
          </Text>
          {renderModeChip('global', 'G', mode, onModeChange)}
          {renderModeChip('local', 'L', mode, onModeChange)}
        </Box>
        <Box style={{ flexDirection: 'row', gap: 1 }}>
          {readOnly ? (
            <Text fg="#ff9f43" wrap={false}>
              Read-only
            </Text>
          ) : null}
          {busy ? (
            <Text fg={accentPrimary} wrap={false}>
              Working…
            </Text>
          ) : null}
        </Box>
      </Box>
    </Box>
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
    <Box
      style={{
        border: true,
        borderColor: fg,
        paddingLeft: 1,
        paddingRight: 1,
        paddingTop: 0,
        paddingBottom: 0,
      }}
    >
      <Text fg={fg} wrap={false}>
        {label}
      </Text>
    </Box>
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
    <Box
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
      <Text fg={fg} wrap={false}>
        ({keyHint}) {capitalize(target)}
      </Text>
    </Box>
  );
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
