# Claw Pickup Classroom

A classroom-friendly claw machine game built with React, TypeScript, Vite, and Electron.

Teachers can:

- set up a machine with toys that reveal text, images, or video
- save the whole machine as a single `.claw.json` file
- load saved classroom machines later
- switch into play mode and reveal each toy fullscreen

When a toy is collected, it moves into a fullscreen reveal state until the player clicks `Continue` or uses the keyboard. After dismissal, that toy is removed from the machine for the rest of the session.

## Run It

Install dependencies:

```bash
pnpm install
```

If Electron was just installed, approve the build scripts once:

```bash
pnpm approve-builds --all
```

Run the browser version:

```bash
pnpm dev
```

Then open [http://localhost:5173](http://localhost:5173).

Run the desktop app and Vite together:

```bash
pnpm desktop:dev
```

## Useful Commands

Run tests:

```bash
pnpm test:run
```

Run lint:

```bash
pnpm lint
```

Build production assets:

```bash
pnpm build
```

Package the macOS desktop app:

```bash
pnpm package:desktop
```

## Machine Files

Saved machine files store:

- machine title and subtitle
- all toys currently loaded into the machine
- each toy's reveal content blocks
- session progress for already collected toys

The app includes a setup mode for authoring classroom machines and a play mode for live use.
