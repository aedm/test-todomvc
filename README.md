# test-todomvc

Todo app on Cloudflare Workers. Rust backend (compiled to WASM) + React/Tailwind
frontend, persisted to Cloudflare D1.

## Layout

```
backend/      # Rust Worker (worker-rs + D1)
  src/
    todo.rs       # validation + types (testable on host)
    handlers.rs   # HTTP handlers (worker feature only)
    lib.rs        # entry + router
frontend/     # Vite + React + TypeScript + Tailwind
  src/
    App.tsx, components/, api.ts
migrations/   # D1 SQL migrations
wrangler.toml # Cloudflare config (Worker + D1 + static assets)
```

## Local tests

```
# Backend (pure logic — no wasm needed)
cd backend && cargo test --no-default-features

# Frontend
cd frontend && npm install && npm test
```

## API

| Method | Path                | Body                                     | Returns |
|--------|---------------------|------------------------------------------|---------|
| GET    | `/api/health`       | —                                        | `ok`    |
| GET    | `/api/todos`        | —                                        | `Todo[]`|
| POST   | `/api/todos`        | `{ "title": string }`                    | `Todo`  |
| PATCH  | `/api/todos/:id`    | `{ title?, completed? }` (≥1 field)      | `Todo`  |
| DELETE | `/api/todos/:id`    | —                                        | 204     |

## Deploy

CI runs on push to `main` or any `claude/**` branch. The `cloudflare-deploy` vault
repo provides `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as repo secrets;
the deploy job creates the D1 database on first run, applies migrations, and runs
`wrangler deploy`. After deploy it smoke-tests the live URL (full CRUD + SPA root).
