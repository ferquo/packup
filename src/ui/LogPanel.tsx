import type { FC } from 'react';

type LogPanelProps = {
  lines: string[];
  title?: string;
};

const DEFAULT_LINES = 20;

export const LogPanel: FC<LogPanelProps> = ({ lines, title = 'Recent activity' }) => {
  const latestLines = lines.slice(-DEFAULT_LINES);
  return (
    <box
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
      <text fg="#888888" wrap={false}>
        {title}
      </text>
      <box style={{ flexDirection: 'column', gap: 0 }}>
        {latestLines.length === 0 ? (
          <text fg="#555555" wrap={false}>
            Waiting for commands…
          </text>
        ) : (
          latestLines.map((line, index) => (
            <text key={`${index}-${line}`} wrap>
              {line}
            </text>
          ))
        )}
      </box>
    </box>
  );
};
