---
name: run
description: Launch EatWhat's backend (Express) and/or mobile app (Expo) for manual verification. Use whenever asked to run, start, or test the app, or to confirm a change works for real. Cleans up leftover dev-server processes first — npm run dev backgrounded across sessions tends to accumulate orphaned nodemon instances that keep re-grabbing port 3000.
---

# Running EatWhat

Two independent processes: the Express backend (repo root, port 3000) and the Expo mobile app (`mobile/`, Metro on port 8081). The backend has no persistence, so it's safe to kill/restart freely — nothing is lost beyond in-memory analyzed records.

## 1. Clean up stale dev servers first

Every `npm run dev` invocation spawns `npm run dev` → `nodemon` → `ts-node app.ts`. If a previous session backgrounded one and never stopped it, nodemon's crash-restart behavior (or a second orphaned instance silently retrying in the background) means killing just the process listening on port 3000 doesn't actually stop it — a leftover instance grabs the port right back. This has happened repeatedly in practice: three separate orphaned `npm run dev` trees were found accumulated from past sessions in one case.

Before starting the backend, find every leftover instance:

```bash
ps -ef | grep -E "nodemon|ts-node app.ts|npm run dev" | grep -v grep
```

For each `npm run dev` / `nodemon` / `ts-node app.ts` process tied to this project's `node_modules/.bin`, kill the whole trio (the `npm run dev` parent, its `nodemon` child, and nodemon's `ts-node` child) — killing only the `ts-node` child lets nodemon respawn it. Then confirm the port is actually free:

```bash
lsof -nP -iTCP:3000 -sTCP:LISTEN || echo "port 3000 is free"
```

Check the `ps -ef` output's `TTY` column before killing: `??` means fully detached (safe to kill silently), anything else (e.g. `ttys004`) means it's attached to a real open terminal window — still fine to kill if asked to stop the server, but worth telling the user which terminal will go quiet, rather than surprising them.

## 2. Start the backend

From the repo root:

```bash
npm run dev
```

Requires `.env` (copied from `.env.example`) with `OPENAI_API_KEY` set. Runs on `PORT` (default 3000). There's no test suite — `npm run build` (tsc) is the fastest correctness check after a backend change, and doesn't require the server to be running.

## 3. Start the mobile app (only if testing the mobile frontend)

Mobile has no backend of its own — step 2 must already be running.

```bash
cd mobile && npm start
```

Before this will actually reach the backend, confirm `mobile/src/config.ts`'s `API_BASE_URL` matches how it's being run:
- Physical phone (Expo Go): the Mac's LAN IP (`ipconfig getifaddr en0`), phone and computer on the same Wi-Fi
- Android emulator: `http://10.0.2.2:3000`
- iOS simulator: `http://localhost:3000`

It does not auto-detect — this is the most common reason "the app loads but nothing works."

## 4. Verifying the static web frontend instead

`public/` is served directly by the Express app (`express.static("public")`) — once the backend (step 2) is running, it's already live at `http://localhost:3000`. No separate process needed.
