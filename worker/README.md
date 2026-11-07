# AI Q&A — deployment

The Tips page assistant (`qa.js`) can answer with a real LLM. Because the site is
static, the API key cannot live in the browser, so a small Cloudflare Worker
holds the key and forwards the request.

```
browser (qa.js)  ──POST /  ──▶  Cloudflare Worker  ──▶  Groq API
                                  (holds GROQ_API_KEY)
```

If the Worker is unreachable, `qa.js` falls back to the local keyword search over
`knowledge.js`, so the page never breaks.

## 1. Get a Groq API key

1. Sign up at <https://console.groq.com> (free tier).
2. Create an API key — it looks like `gsk_...`.
3. Keep it out of the repo. Never paste it into `qa.js`.

## 2. Deploy the Worker

```bash
npm install -g wrangler
wrangler login
wrangler deploy worker/ai-proxy.js --name run-tianjin-ai
wrangler secret put GROQ_API_KEY      # paste the gsk_... key when prompted
```

Wrangler prints a URL like:

```
https://run-tianjin-ai.<your-subdomain>.workers.dev
```

## 3. Point the site at it

Open `qa.js` and set:

```js
const AI_ENDPOINT = 'https://run-tianjin-ai.<your-subdomain>.workers.dev';
```

That is the only front-end change. Leave it as `''` to stay on local search only.

## 4. Lock down CORS (recommended)

By default the Worker accepts any origin. Restrict it to your site:

```bash
wrangler secret put ALLOWED_ORIGIN
# value: https://liuxizhao512-blip.github.io
```

## What the Worker does

| Concern | Handling |
|---|---|
| Key exposure | Key lives in a Worker secret, never sent to the browser |
| Abuse | 30 requests per IP per hour, in-memory |
| Prompt injection | System prompt pins answers to the guide; `temperature: 0.3` |
| Hallucination | Model is told to say when the guide does not cover something |
| Cost | `max_tokens: 400`, context capped at 12k chars |
| Failure | Front end falls back to local keyword search |

## Local testing

`file://` cannot reach the Worker (CORS + no origin). To test the AI path, serve
the folder over HTTP:

```bash
python -m http.server 8000
# then open http://localhost:8000/tips.html
```

Add `http://localhost:8000` to `ALLOWED_ORIGIN` while testing, or leave
`ALLOWED_ORIGIN` unset so any origin is accepted.

## Cost

Groq's free tier is generous enough for a personal guide site. If traffic grows,
watch the rate limit in `worker/ai-proxy.js` (`RATE_LIMIT`) and the
`max_tokens` cap.
