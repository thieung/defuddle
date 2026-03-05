# Defuddle

A Cloudflare Worker that extracts the main content of any web page and returns clean Markdown. Built on top of [Defuddle](https://github.com/kepano/defuddle) with special handling for **X/Twitter** posts, including text, media, polls, quotes, and long-form Articles.

![Defuddle — Live Demo](assets/cover.png)

**🔗 Live demo:** [defuddle.thieunv.workers.dev](https://defuddle.thieunv.workers.dev/)

**Examples:**
```bash
# Regular web page
https://defuddle.thieunv.workers.dev/vividkit.dev

# X/Twitter post
https://defuddle.thieunv.workers.dev/x.com/thieunguyen_it/status/2021461660310044828

# X Article (long-form with multiple mediums)
https://defuddle.thieunv.workers.dev/x.com/trq212/status/2024574133011673516
```

## Features

- **Any web page** → Markdown via Defuddle + Turndown
- **X/Twitter posts** → rich Markdown via the [FxTwitter API](https://github.com/FxEmbed/FxEmbed)
  - Tweet text with `t.co` link expansion
  - Photos, videos, GIFs with thumbnails & duration
  - X Articles (long-form DraftJS content with inline media)
  - Quote tweets with media
  - Polls with visual progress bars
  - Engagement stats (❤️ likes, 🔁 retweets, 💬 replies, 👁 views)
  - Community notes, replying-to context, broadcasts
  - External media (YouTube embeds, etc.)
- JSON and Markdown output formats
- CORS support

## Usage

```bash
# Get any web page as Markdown
curl https://<your-worker>.workers.dev/medium.com/@richardhightower/claude-code-todos-to-tasks-5a1b0e351a1c

# Get an X/Twitter post
curl https://<your-worker>.workers.dev/x.com/thieunguyen_it/status/2021461660310044828

# Get X Article (long-form with multiple mediums)
curl https://<your-worker>.workers.dev/x.com/trq212/status/2024574133011673516

# Get JSON output
curl -H 'Accept: application/json' https://<your-worker>.workers.dev/x.com/thieunguyen_it/status/2021461660310044828
```

## Local Development

### Prerequisites

- [Node.js](https://nodejs.org/) ≥ 18
- A [Cloudflare account](https://dash.cloudflare.com/sign-up) (free tier works)

### Setup

```bash
# Clone the repo
git clone <repo-url>
cd defuddle

# Install dependencies
npm install

# Start local dev server
npm run dev
```

The worker will be available at `http://localhost:8787`.

```bash
# Test locally
curl http://localhost:8787/x.com/thieunguyen_it/status/2021461660310044828
```

### Run Tests

```bash
npm test
```

## Deploy to Cloudflare Workers

### First-time setup

1. **Login to Cloudflare CLI**

   ```bash
   npx wrangler login
   ```

2. **Deploy**

   ```bash
   npm run deploy
   ```

   This runs `wrangler deploy` which:
   - Bundles the TypeScript source
   - Uploads to Cloudflare Workers
   - Assigns a `*.workers.dev` subdomain

3. **Verify**

   ```bash
   curl https://defuddle.<your-subdomain>.workers.dev/example.com
   ```

### Custom domain (optional)

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/) → Workers & Pages → `defuddle` → Settings → Domains & Routes
2. Add a custom domain (must be on Cloudflare DNS) or a route pattern

### Configuration

The worker config is in [`wrangler.jsonc`](./wrangler.jsonc):

```jsonc
{
  "name": "defuddle",        // Worker name (= subdomain)
  "main": "src/index.ts",           // Entry point
  "compatibility_date": "2026-03-01",
  "compatibility_flags": ["nodejs_compat"]  // Required for linkedom
}
```

Key settings:
- **`nodejs_compat`** — required for the `linkedom` DOM parser used by Defuddle
- **`observability.enabled`** — enables Workers logs in the dashboard

## Project Structure

```
src/
├── index.ts        # Worker entry point, request routing
├── convert.ts      # Core extraction logic (web pages + X/Twitter)
└── polyfill.ts     # Workers runtime polyfills for DOM APIs
```

## API Reference

### `GET /<url>`

Extracts content from the given URL.

**Response formats:**
- `text/markdown` (default) — Markdown with YAML frontmatter
- `application/json` — set `Accept: application/json` header

**Frontmatter fields:**

| Field | Description |
|-------|-------------|
| `title` | Page/tweet title |
| `author` | Author name |
| `published` | Publication date |
| `source` | Original URL |
| `domain` | Source domain |
| `description` | Page description or tweet preview |
| `word_count` | Content word count |
| `likes` | ❤️ (X/Twitter only) |
| `retweets` | 🔁 (X/Twitter only) |
| `replies` | 💬 (X/Twitter only) |
| `views` | 👁 (X/Twitter only) |

## License

MIT
