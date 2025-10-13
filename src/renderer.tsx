import type { AppProps } from './app.js';
import { App } from './app.js';

export async function renderApp(props: AppProps) {
  const { render } = await import('@opentui/react');
  await render(<App {...props} />);
}
