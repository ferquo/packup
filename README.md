# PackUp

[![Status](https://img.shields.io/badge/status-alpha-blue.svg)](https://npmjs.org/package/%40ferquo%2Fpackup)
[![Node Version](https://img.shields.io/badge/node-%3E%3D18.18-brightgreen.svg)](https://nodejs.org)
[![License](https://img.shields.io/badge/license-MIT-lightgrey.svg)](./LICENSE)

PackUp is a terminal UI built with OpenTUI + React that keeps global and project-local npm packages in sync. See what is out of date, queue updates, and watch progress without leaving your terminal.

## Install

```bash
npm i -g bun   # install Bun if you don't already have it
npm i -g @ferquo/packup
packup
```

## Features

- Hero banner showing current Node/npm versions alongside the most recent LTS releases.
- Switchable views for global packages, local project dependencies, or a combined list.
- Rich table with selection, per-package status, and background metadata fetches.
- Sequential update queue with live logs, spinners, and clear success/error states.
- Keyboard-driven workflow (arrow keys, space, enter, G/L/A/U/S/C/N, Q).
- Read-only mode for audits or dry-runs.

## Usage

```
packup [options]
```

> **Requires Bun** – OpenTUI currently depends on Bun's FFI runtime. The bundled CLI and npm scripts will automatically hand off to Bun (via `bun tsx …`). Install Bun from [bun.sh](https://bun.sh) before running PackUp if it is not already on your PATH.

If Bun is installed but PackUp still cannot find it, either add Bun's install directory to your `PATH` (e.g. `export PATH="$HOME/.bun/bin:$PATH"`) or set `PACKUP_BUN=/absolute/path/to/bun` before running PackUp.

PackUp starts in local mode when a `package.json` is found in the working directory; otherwise it falls back to global mode.

### Keybindings

- `↑` / `↓` – Move selection
- `space` – Toggle current package selection
- `enter` – Update focused package
- `u` – Update all selected packages
- `Shift+u` – Update all upgradable packages in the current view
- `g` / `l` / `a` – Switch to Global, Local, or All mode
- `s` / `c` – Select all / clear selection
- `n` – Update the globally installed `npm` CLI
- `q` – Quit

### CLI Flags

| Flag            | Description                                         |
| --------------- | --------------------------------------------------- |
| `--global`      | Start in global package mode                        |
| `--local`       | Start in local mode (requires a `package.json`)     |
| `--all`         | Show both global and local packages                 |
| `--cwd <path>`  | Operate on a specific project directory             |
| `--read-only`   | Disable all update actions (view only)              |
| `--version`     | Print the PackUp version                            |
| `--help`        | Show CLI help                                       |

When working from source you can run PackUp directly with Bun:

```bash
bun tsx src/index.ts --local
```

## Development

PackUp needs **Node 18+** for tooling and **Bun** for runtime execution. After cloning:

1. Install deps (npm honours the `type: module` setup):
   ```bash
   npm install
   ```
2. Make sure Bun is on your `PATH` (for example `export PATH="$HOME/.bun/bin:$PATH"`). If Bun lives elsewhere set `PACKUP_BUN=/absolute/path/to/bun`.
3. Run the app:
   ```bash
   npm run start       # autodetects mode
   npm run dev         # forces local mode
   ```
   Both scripts shell out to `bun tsx …`, so Bun must be available.

## Updating npm itself

`npm` is hidden from the global package table to avoid accidental upgrades. Press `N` inside the UI to run `npm install -g npm@latest`, or run the command manually if you prefer.

## Permissions & environment tips

- PackUp assumes your environment manages Node/npm without requiring `sudo`. If you use `nvm`, `fnm`, or `asdf`, ensure PackUp runs inside that environment.
- On Windows, use an elevated shell if your global npm directory lives inside `Program Files`.
- Corporate proxies or custom registries may need `npm` configuration (`npm config set proxy …`); PackUp honors your existing npm settings.

## Troubleshooting

- **No packages listed in local mode** – verify `--cwd` points at a directory with `package.json`.
- **Network timeouts** – PackUp falls back to `latest: ?`; try again once you have connectivity.
- **Permission errors on global updates** – make sure `$NODE_PATH` points to a writeable location or run via your Node version manager.
- **Workspace projects** – workspace detection is noted but updates currently operate on the root `package.json` only (see roadmap below).
- **PackUp can't find Bun** – ensure Bun is on your `PATH` (usually `$HOME/.bun/bin`) or export `PACKUP_BUN` with the full path to the Bun executable.

## Contributing

1. Clone the repository and install dependencies with `npm install` (**requires Node 18+**).
2. Run `npm run dev` (or `npm run start`) to launch the TUI; ensure Bun is on your `PATH` or set `PACKUP_BUN`.

Please open issues for bugs, feature requests, or ideas. PRs are welcome!

## Roadmap

- Workspace selector for npm/yarn/pnpm monorepos.
- Smarter dependency diffing (lockfile comparison, optional dependencies).
- Extended status analytics (changelogs, security advisories).

---

PackUp is released under the [MIT License](./LICENSE).
