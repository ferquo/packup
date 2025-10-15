import type { FC } from 'react';
import { Box, Text } from './primitives.js';

export type VersionPillProps = {
  label: string;
  current: string;
  lts?: string;
  accent?: string;
};

const DEFAULT_ACCENT = '#44d9a6';

export const VersionPill: FC<VersionPillProps> = ({
  label,
  current,
  lts,
  accent = DEFAULT_ACCENT,
}) => {
  const ltsText = lts ? ` (LTS ${lts})` : '';
  return (
    <Box
      style={{
        border: true,
        borderColor: accent,
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 1,
        paddingRight: 1,
        paddingTop: 0,
        paddingBottom: 0,
        marginRight: 1,
        marginBottom: 1,
        gap: 1,
      }}
    >
      <Text fg={accent} wrap={false}>
        {label}:
      </Text>
      <Text wrap={false}>
        {current}
        {ltsText}
      </Text>
    </Box>
  );
};
