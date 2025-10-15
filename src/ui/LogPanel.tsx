import type { FC } from 'react';
import { Box, Text } from './primitives.js';

type LogPanelProps = {
  lines: string[];
  title?: string;
};

const DEFAULT_LINES = 20;

export const LogPanel: FC<LogPanelProps> = ({ lines, title = 'Recent activity' }) => {
  const latestLines = lines.slice(-DEFAULT_LINES);
  return (
    <Box
      style={{
        border: true,
        borderColor: '#3a3a3a',
        flexDirection: 'column',
        padding: 1,
        marginTop: 1,
        height: 10,
        overflow: 'hidden',
      }}
    >
      <Text fg="#888888" wrap={false}>
        {title}
      </Text>
      <Box style={{ flexDirection: 'column', gap: 0 }}>
        {latestLines.length === 0 ? (
          <Text fg="#555555" wrap={false}>
            Waiting for commands…
          </Text>
        ) : (
          latestLines.map((line, index) => (
            <Text key={`${index}-${line}`} wrap>
              {line}
            </Text>
          ))
        )}
      </Box>
    </Box>
  );
};
