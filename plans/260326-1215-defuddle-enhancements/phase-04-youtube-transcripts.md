---
phase: 4
title: "YouTube transcript extraction"
status: pending
effort: 1h
depends_on: [1]
---

# Phase 4: YouTube Transcript Extraction

## Overview

Defuddle v0.12.0+ extracts YouTube transcripts with diarization. Detect YouTube URLs and use defuddle's async extraction to get transcripts.

## Key Insight

Defuddle's YouTube transcript extraction requires **async parsing** — the standard `parse()` won't fetch transcripts. Need to check if defuddle exposes `parseAsync()` or if `useAsync: true` in options enables it via `parse()`.

From docs: `useAsync` (boolean, default true) — "Allow third-party API calls". This likely enables transcript fetching during parse.

## YouTube URL Detection

```typescript
const YOUTUBE_URL_PATTERN = /^https?:\/\/(www\.)?(youtube\.com\/watch|youtu\.be\/)/;
```

## Implementation Steps

1. Add `YOUTUBE_URL_PATTERN` to a shared utils or to `web-page-extractor.ts`
2. For YouTube URLs, ensure defuddle is called with `useAsync: true` (default)
3. Check if defuddle has `parseAsync()` method — if so, use it for YouTube URLs
4. If no parseAsync, test if regular `parse()` with `useAsync: true` fetches transcripts in Worker environment
5. Include transcript in the markdown content (defuddle should handle this automatically)
6. Pass `language` option to control transcript language selection
7. Test with several YouTube URLs

## Potential Issue

Cloudflare Workers have limited async capabilities. Defuddle's async YouTube extraction may make external API calls that need to work within Worker constraints. Test thoroughly.

## Files to Modify

| File | Change |
|------|--------|
| `src/web-page-extractor.ts` | Detect YouTube URLs, use async parsing if available |
| `src/convert.ts` | May need async path for YouTube |

## Success Criteria

- [ ] YouTube URLs return video metadata + transcript as Markdown
- [ ] `language` param controls transcript language
- [ ] Non-YouTube URLs unaffected
- [ ] Works within Cloudflare Worker constraints
