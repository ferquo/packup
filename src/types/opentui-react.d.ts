declare module '@opentui/react' {
  import type { ReactNode } from 'react';

  export type KeyEvent = {
    name?: string;
    ctrl?: boolean;
    meta?: boolean;
    shift?: boolean;
    option?: boolean;
    sequence?: string;
    [key: string]: unknown;
  };

  export function render(node: ReactNode, config?: Record<string, unknown>): Promise<void>;
  export function useKeyboard(handler: (key: KeyEvent) => void): void;
}
