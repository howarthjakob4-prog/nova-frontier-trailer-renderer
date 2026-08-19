# Nova Frontier Engine Connector

This folder provides a controlled HTTP bridge between ChatGPT-compatible tools and the Nova Frontier trailer/world-engine workflow.

## What it exposes

Only these approved commands are accepted:

- `import_model`
- `build_scene`
- `render_trailer`
- `run_sim`
- `get_logs`

The connector intentionally does **not** expose arbitrary shell execution, unrestricted file access, or remote desktop control.

## Run locally

```bash
cd engine-connector
export NOVA_ENGINE_API_KEY="replace-with-a-long-random-secret"
npm start
```

On Windows PowerShell:

```powershell
cd engine-connector
$env:NOVA_ENGINE_API_KEY="replace-with-a-long-random-secret"
npm start
```

The service listens on port `8787` by default. Set `PORT` to override it.

## Test

Health check:

```bash
curl http://localhost:8787/health
```

Submit a render job:

```bash
curl -X POST http://localhost:8787/command \
  -H "content-type: application/json" \
  -H "x-api-key: replace-with-a-long-random-secret" \
  -d '{"command":"render_trailer","input":{"scene":"doom-anchor","quality":"preview"}}'
```

Then query the returned job ID:

```bash
curl -H "x-api-key: replace-with-a-long-random-secret" http://localhost:8787/jobs/JOB_ID
```

## Connect to a hosted endpoint

1. Run this connector on a trusted machine/server that can reach the engine.
2. Put it behind HTTPS.
3. Keep `NOVA_ENGINE_API_KEY` secret.
4. Update the `servers.url` value in `openapi.yaml` to the public HTTPS address.
5. Import `openapi.yaml` into the supported ChatGPT action/app workflow.

## Current state

Version `0.1.0` is a safe prototype. It queues and simulates the approved operations so the API contract can be tested now. The next implementation step is replacing `simulateEngineWork()` in `server.js` with calls into the actual Nova Frontier renderer/world-engine service.

A good production bridge should map each command to one narrowly-scoped engine operation, validate asset paths, enforce project-root boundaries, keep an audit log, and require explicit credentials for writes.
