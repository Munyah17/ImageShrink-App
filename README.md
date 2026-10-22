# ImageShrink

Browser-side image compression, conversion and resizing. Files are processed locally. Optional AI suggestions go through a Cloudflare Worker that calls Groq; the Groq API key never ships in the frontend.

## Install

```bash
npm install
```

## Local development

Frontend only (compression, conversion, resizing, ZIP download):

```bash
npm run dev
```

AI assistant (optional). Copy `.dev.vars.example` to `.dev.vars`, add a Groq key, then run the Worker in a second terminal:

```bash
copy .dev.vars.example .dev.vars
npm run worker:dev
```

Vite proxies `/api` to `http://127.0.0.1:8787`. If the Worker is not running, the image tools still work; AI panels show an availability error.

Never put `GROQ_API_KEY` in `.env`, `.env.local`, or any `VITE_*` variable. Use `.dev.vars` (gitignored) for local Worker secrets and Wrangler/Pages secrets for production.

To smoke-test the proxy after `npm run worker:dev`:

```bash
curl -X POST http://127.0.0.1:8787/api/ai/advise -H "Content-Type: application/json" -d "{\"consent\":true,\"intendedUse\":\"blog thumbnail\",\"targetBytes\":80000}"
```

A request without `consent: true` should return 403. Image tools must still load at `http://localhost:5173` even if this call fails.

## Production build

```bash
npm run build
npm run preview
```

Output directory: `dist`.

## Cloudflare Pages

| Setting | Value |
| --- | --- |
| Framework preset | Vite |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | `/` |

`public/_redirects` sends unknown paths to `index.html` so `/compress-jpg` and the other tool URLs work on refresh.

Pages Functions in `functions/api/ai/` serve the Groq proxy on the same domain. After the Pages project exists:

```bash
npx wrangler pages secret put GROQ_API_KEY --project-name imageshrink
npx wrangler pages secret put RATE_SALT --project-name imageshrink
npx wrangler pages deployment create dist --project-name imageshrink
```

Set Pages compatibility date to `2026-10-14` or later. Bind a KV namespace named `USAGE` on the Pages project for durable daily AI limits.

## Cloudflare Worker (standalone proxy)

Use this if you prefer a separate `*.workers.dev` origin instead of Pages Functions.

```bash
npx wrangler kv namespace create USAGE
```

Add the returned id to `wrangler.jsonc` as `kv_namespaces: [{ "binding": "USAGE", "id": "..." }]`, then:

```bash
npx wrangler secret put GROQ_API_KEY
npx wrangler secret put RATE_SALT
npm run worker:deploy
```

Point the frontend at that origin in production with a Pages `_redirects` proxy, or keep Functions and skip this deploy.

Do not put `GROQ_API_KEY` in Vite env files (`VITE_*`), client code, or `wrangler.jsonc` vars.

## Accounts, usage and paid plans

D1 stores users, sessions and daily counters. Apply migrations, then bind `DB` on the Worker/Pages project:

```bash
npx wrangler d1 create imageshrink
npx wrangler d1 migrations apply imageshrink --local
npx wrangler d1 migrations apply imageshrink --remote
```

Put the returned database id in `wrangler.jsonc`.

| Plan | Price | Compressions / UTC day | AI drafts / UTC day | Ads |
| --- | --- | --- | --- | --- |
| Free | $0 | 500 (soft) | 50 (enforced) | Yes |
| Plus | $2.99/mo | 5,000 | 300 | No |
| Pro | $5.99/mo | 50,000 | 2,000 | No |

Compression still runs locally if the usage API is down. AI is enforced on the Worker. Guest visitors get a cookie-backed free quota.

Stripe Checkout (optional):

```bash
npx wrangler secret put STRIPE_SECRET_KEY
npx wrangler secret put STRIPE_WEBHOOK_SECRET
npx wrangler secret put STRIPE_PRICE_PLUS
npx wrangler secret put STRIPE_PRICE_PRO
```

Webhook URL: `https://<your-domain>/api/billing/webhook`. Set `APP_ORIGIN` to the public site origin.

## Ads

Free users see reserved slots (top, in-feed, sidebar, footer). Paid plans hide them. House ads promote Plus until you set public AdSense IDs in `.env` (`VITE_ADSENSE_*` only — never Groq/Stripe secrets). Update `public/ads.txt` with your publisher line before serving network ads.

## Groq models

Verified against Groq’s current vision docs:

- Vision (SEO generator): `qwen/qwen3.8-27b` via `chat.completions` image_url / data URL input.
- Text (compression advisor): `openai/gpt-oss-20b`.

Override with Worker/Pages vars `VISION_MODEL` and `TEXT_MODEL` if Groq changes IDs.

The AI Image SEO Generator sends a downscaled JPEG data URL only after the user consents. Images are not stored. Recommendations are drafts, not measured file-size results.

## Browser-side limitations

- Encoding uses the browser canvas. Quality and file size vary by browser.
- PNG re-encoding is lossless and often does not shrink an already-optimised PNG.
- JPG cannot keep transparency; transparent pixels are flattened.
- If the browser cannot encode WebP (or another requested type), ImageShrink reports failure instead of faking the format.
- Very large images are clamped (max edge 8192px, max 16 megapixels) to reduce tab crashes.
- Animated GIFs are decoded as a still frame.
- Accounts need D1. Payments need Stripe secrets. Ads need an AdSense publisher ID if you want network units instead of house ads.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run build` | Typecheck and production bundle |
| `npm run preview` | Serve `dist` locally |
| `npm run lint` | Oxlint |
| `npm run worker:dev` | Groq proxy on port 8787 |
| `npm run worker:deploy` | Deploy the standalone Worker |
