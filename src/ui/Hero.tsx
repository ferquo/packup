import type { FC } from 'react';

import type { Mode, Versions } from '../data/types.js';
import { Box, Text } from './primitives.js';
import { VersionPill } from './VersionPill.js';

type HeroProps = {
  versions?: Versions | null;
  mode: Mode;
  readOnly?: boolean;
};

const accentPrimary = '#44d9a6';
const accentSecondary = '#5ab3ff';

export const Hero: FC<HeroProps> = ({ versions, mode, readOnly = false }) => {
  return (
    <Box
      style={{
        border: true,
        borderColor: accentPrimary,
        padding: 1,
        flexDirection: 'column',
        gap: 1,
        marginBottom: 1,
        minHeight: 10,
      }}
    >
      <Box style={{ flexDirection: 'column', gap: 1 }}>
        <Text fg={accentPrimary} wrap attributes={1}>
          PackUp
        </Text>
        <Text fg="#aaaaaa" wrap>
          Keep your global and local npm packages in sync without leaving the terminal.
        </Text>
      </Box>
      <Box style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 1 }}>
        <VersionPill
          label="Node"
          current={versions?.nodeCurrent ?? '?'}
          lts={versions?.nodeLTS}
          accent={accentPrimary}
        />
        <VersionPill
          label="npm"
          current={versions?.npmCurrent ?? '?'}
          lts={versions?.npmLTS}
          accent={accentSecondary}
        />
      </Box>
    </Box>
  );
};
