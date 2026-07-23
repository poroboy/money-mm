# AI proxy — Cloudflare Worker

This proxy keeps the Google Gemini API key off the Firebase web app.
The client never sees the key — only this Worker has access to it.

## Deploy

```powershell
cd ai-proxy
npm install -g wrangler
wrangler login
wrangler secret put GOOGLE_API_KEY
wrangler secret put ALLOWED_ORIGIN
wrangler deploy
```

Create a free API key at https://aistudio.google.com/apikey.

## Environment variables

### Secrets (set via `wrangler secret put`)

| Secret | Required | Description |
|---|---|---|
| `GOOGLE_API_KEY` | Yes | Google AI Studio API key |
| `ALLOWED_ORIGIN` | No | CORS origin restriction (default: `*`, comma-separated for multiple origins) |

### Variables (set via `wrangler secret put` or `wrangler.toml` `[vars]`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `AI_PROVIDER` | No | `google` | Provider (only `google` is supported) |
| `PRIMARY_MODEL` | No | `gemini-2.0-flash` | Primary Gemini model |
| `FALLBACK_MODEL` | No | `gemini-1.5-flash` | Fallback model if primary fails/times out |

### Fallback behavior

The worker retries with the fallback model when the primary model:
- times out (30s)
- returns HTTP 429 (rate limited)
- returns HTTP 500/502/503/504 (server error)
- is unavailable

No fallback for:
- HTTP 400 (bad request)
- HTTP 401 (unauthorized)
- HTTP 403 (forbidden)

## Client setup

After deployment, set this in the root `.env.local`:

```
VITE_AI_PROXY_URL=https://money-mm-ai-proxy.<your-subdomain>.workers.dev
```

The proxy handles model selection server-side via `PRIMARY_MODEL` / `FALLBACK_MODEL`.
No client-side model config is needed.

## Model logging

Each response includes an `X-Model-Used` header indicating which model handled the request:

```
X-Model-Used: gemini-2.0-flash
```

## CORS

By default CORS allows all origins (`*`). To restrict:

```powershell
wrangler secret put ALLOWED_ORIGIN
```

Enter a comma-separated list of allowed origins, e.g.:

```
https://money-planner-871b8.web.app,http://localhost:5173
```
