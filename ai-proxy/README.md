# AI proxy — Cloudflare Worker

This proxy keeps the OpenRouter API key off the Firebase web app.
The client never sees the key — only this Worker has access to it.

## Deploy

```powershell
cd ai-proxy
npm install -g wrangler
wrangler login
wrangler secret put OPENROUTER_API_KEY
wrangler deploy
```

Create a free API key at https://openrouter.ai/keys.

## Environment variables

| Secret / Variable | Required | Description |
|---|---|---|
| `OPENROUTER_API_KEY` | Yes | OpenRouter API key (set via `wrangler secret put`) |
| `OPENROUTER_MODEL` | No | Model override (default: `deepseek/deepseek-chat`) |
| `ALLOWED_ORIGIN` | No | CORS origin restriction (default: `*`, set to your Firebase Hosting URL in production) |

## Client setup

After deployment, set this in the root `.env.local`:

```
VITE_AI_PROXY_URL=https://money-mm-ai-proxy.<your-subdomain>.workers.dev
```

Optionally set a specific model:

```
VITE_AI_MODEL=qwen/qwen3-coder:free
```

## Recommended models

1. `deepseek/deepseek-chat` — DeepSeek V3 (default, tool calling)
2. `google/gemma-4-31b-it:free` — Gemma 4 31B (free, multilingual, tool calling)
3. `nvidia/nemotron-3-ultra-550b-a55b:free` — Nemotron 3 Ultra 550B (free, 1M context, tool calling)
4. `openai/gpt-oss-20b:free` — GPT-OSS 20B (free, function calling)
5. `poolside/laguna-m.1:free` — Laguna M.1 (free, agentic, tool calling)

## CORS

By default CORS allows all origins (`*`). To restrict:

```powershell
wrangler secret put ALLOWED_ORIGIN
```

Enter `https://money-planner-871b8.web.app` (or your actual Firebase Hosting URL).
