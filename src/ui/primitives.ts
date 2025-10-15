import type { ComponentType, ReactNode } from 'react';

type BasePrimitiveProps = {
  children?: ReactNode;
  style?: Record<string, unknown>;
  [key: string]: unknown;
};

type TextPrimitiveProps = BasePrimitiveProps & {
  fg?: string;
  wrap?: boolean;
  attributes?: number;
};

const host =
  <TProps extends BasePrimitiveProps>(tag: string): ComponentType<TProps> =>
    tag as unknown as ComponentType<TProps>;

export const Box = host<BasePrimitiveProps>('box');
export const Text = host<TextPrimitiveProps>('text');
