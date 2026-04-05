---
phase: 3
title: "New API options: includeReplies, contentSelector, language"
status: pending
effort: 1h
depends_on: [1]
---

# Phase 3: New API Options

## Overview

Expose three new defuddle options through the worker API: `includeReplies`, `contentSelector`, `language`.

## API Design

### POST /api/convert body

```typescript
interface ConvertRequest {
  url: string;
  cookies?: string;
  // New:
  includeReplies?: boolean;       // default: true (via 'extractors')
  contentSelector?: string;       // CSS selector for main content
  language?: string;              // BCP 47 tag e.g. "en", "fr"
}
```

### GET /{url} query params

```
?includeReplies=false
?contentSelector=.article-body
?language=en
```

### Response additions

Add `language` field to `ConvertResult`:

```typescript
export interface ConvertResult {
  // ... existing fields
  language?: string;  // NEW: detected language from defuddle
}
```

## Implementation Steps

1. Update `src/convert-types.ts` — add `language` to `ConvertResult`, create `ConvertOptions` interface
2. Update `src/web-page-extractor.ts` — pass `contentSelector`, `language`, `includeReplies` to Defuddle constructor; include `result.language` in return
3. Update `src/x-twitter-fetcher.ts` — pass `includeReplies` if applicable (FxTwitter API doesn't use it, but defuddle extractors might)
4. Update `src/convert.ts` — accept `ConvertOptions` param in `convertToMarkdown(url, options)`
5. Update `src/index.ts` — parse new params from POST body and GET query string, pass to `convertToMarkdown`
6. Update `formatResponse` — include `language` in frontmatter

## Files to Modify

| File | Change |
|------|--------|
| `src/convert-types.ts` | Add `language` to ConvertResult, add `ConvertOptions` |
| `src/web-page-extractor.ts` | Accept and pass new options to Defuddle |
| `src/convert.ts` | Update `convertToMarkdown` signature |
| `src/index.ts` | Parse new params, pass through |

## Success Criteria

- [ ] POST body accepts `includeReplies`, `contentSelector`, `language`
- [ ] GET query params work for all three
- [ ] `language` appears in response metadata
- [ ] Existing behavior unchanged when params omitted
