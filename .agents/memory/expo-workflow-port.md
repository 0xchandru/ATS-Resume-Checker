---
name: Expo workflow port binding
description: Metro interactive mode never binds waitForPort in non-TTY Replit workflows; use a dev-proxy.js wrapper.
---

## Rule
Never rely on `expo start` alone to satisfy Replit's `waitForPort` health check for Expo artifacts. Metro's interactive mode starts but doesn't actually bind the declared web port until the user presses 'w' — and in non-TTY workflow environments, it never does.

**Why:** Replit's artifact workflow system uses `waitForPort: <N>` to health-check that the dev server is up. Metro prints "Web is waiting on http://localhost:<N>" but only binds the TCP port lazily (on first browser request, or on 'w' press). The workflow health check never sees the port open and marks the workflow failed.

**How to apply:** Create `scripts/dev-proxy.js` that:
1. Immediately `server.listen(PORT, "0.0.0.0", ...)` — passes the health check instantly.
2. Spawns `pnpm exec expo start --localhost --port 8081` in the background.
3. Polls `net.createConnection` to 127.0.0.1:8081 until Metro is ready.
4. Proxies all HTTP requests from PORT → 8081 once ready; serves a loading page while Metro starts.

Update `package.json` dev script to: `node scripts/dev-proxy.js`

**Flags that do NOT work:**
- `--web` flag: still shows interactive mode in non-TTY, doesn't bind port
- `--localhost` removal: makes no difference to the health check issue
- Increasing `restart_workflow` timeout: the tool's own DIDNT_OPEN_A_PORT triggers before Metro binds

**Working restart method:** Use `restartWorkflow({ workflowName: "...", timeout: 120 })` via `code_execution` tool (not `restart_workflow` tool) — the code_execution version has a longer internal grace period.
