# CLAUDE.md

## Project Overview

Cloudflare Worker that converts web pages to markdown. Wraps [defuddle](https://github.com/kepano/defuddle) for content extraction with Turndown for HTML-to-markdown conversion. Includes custom X/Twitter support.

## Architecture Notes

- **Defuddle** is used ONLY for content extraction (title, author, content HTML, metadata) — NOT for markdown conversion
- **Turndown** handles HTML-to-markdown conversion because defuddle's built-in `markdown: true` does not work with linkedom (missing DOM APIs in Cloudflare Workers environment)
- **linkedom** provides DOM environment for defuddle to parse HTML — still required
- X/Twitter URLs are routed to a separate custom extractor (`x-twitter-fetcher.ts`)

## Updating Dependencies

- `npm update defuddle` — only affects content extraction. If upstream changes `parse()` result fields, update mapping in `src/web-page-extractor.ts`
- Do NOT re-enable `markdown: true` in defuddle options — it will produce raw HTML instead of markdown in Workers environment

## Commands

- `npm run dev` — local dev server
- `npm run deploy` — deploy to Cloudflare
- `npx tsc --noEmit` — type check
