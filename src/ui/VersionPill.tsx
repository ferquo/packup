import type { FC } from 'react';

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
    <box
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
      <text fg={accent} wrap={false}>
        {label}:
      </text>
      <text wrap={false}>
        {current}
        {ltsText}
      </text>
    </box>
  );
};
