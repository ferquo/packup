import { measureText, type ASCIIFontName } from '@opentui/core';
import type { FC } from 'react';

import type { Mode, Versions } from '../data/types.js';
import { AsciiFont, Box, Text } from './primitives.js';
import { VersionPill } from './VersionPill.js';

type HeroProps = {
  versions?: Versions | null;
  mode: Mode;
  readOnly?: boolean;
};

const heroTitleText = 'PackUp';
const heroFont: ASCIIFontName = 'block';
const heroDimensions = measureText({
  text: heroTitleText,
  font: heroFont,
});

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
        minHeight: 15,
        alignItems: 'center',
      }}
    >
      <Box style={{ flexDirection: 'column', gap: 1, alignItems: 'center' }}>
        <AsciiFont
          font={heroFont}
          text={heroTitleText}
          style={{ width: heroDimensions.width, height: heroDimensions.height }}
        />
        <Text fg="#aaaaaa" wrap style={{ textAlign: 'center' }}>
          Keep your global and local npm packages in sync without leaving the terminal.
        </Text>
      </Box>
      <Box style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 1, justifyContent: 'center' }}>
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
