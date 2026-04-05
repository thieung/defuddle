---
phase: 1
title: "Modularize convert.ts"
status: pending
effort: 2h
---

# Phase 1: Modularize convert.ts

## Overview

Split the 944-line `src/convert.ts` into focused modules under `src/`, keeping `convert.ts` as a thin orchestrator.

## Target Module Structure

```
src/
├── convert.ts                          # Orchestrator (~50 lines) - keeps convertToMarkdown, formatResponse
├── x-twitter-types.ts                  # FxTwitter API interfaces (~120 lines)
├── x-twitter-fetcher.ts                # fetchTweetData + URL helpers (~120 lines)
├── x-twitter-media-renderer.ts         # renderMedia, renderQuote, renderPoll, renderEngagement (~130 lines)
├── x-twitter-text-processor.ts         # expandTweetText, facet processing (~60 lines)
├── draftjs-to-markdown-converter.ts    # blocksToMarkdown, applyInlineStyles, applyEntityLinks, resolveArticleMediaUrl (~180 lines)
├── turndown-markdown-converter.ts      # Turndown setup with custom rules (~100 lines)
├── web-page-extractor.ts              # fetchAndParse using defuddle + turndown (~80 lines)
├── convert-types.ts                    # ConvertResult interface + shared constants (~30 lines)
├── index.ts                            # unchanged
└── polyfill.ts                         # unchanged
```

## Files to Create

| File | Extracted From | Key Exports |
|------|---------------|-------------|
| `src/convert-types.ts` | Lines 5, 206-223 | `ConvertResult`, `MAX_SIZE` |
| `src/x-twitter-types.ts` | Lines 11-202 | All Fx* interfaces, DraftBlock, DraftEntity |
| `src/x-twitter-text-processor.ts` | Lines 466-516 | `expandTweetText` |
| `src/x-twitter-media-renderer.ts` | Lines 518-636 | `renderMedia`, `renderQuote`, `renderPoll`, `renderEngagement`, `formatDuration` |
| `src/draftjs-to-markdown-converter.ts` | Lines 237-464 | `blocksToMarkdown`, `getEntityInfo`, `resolveArticleMediaUrl` |
| `src/x-twitter-fetcher.ts` | Lines 227-235, 640-747 | `isXUrl`, `parseTweetUrl`, `fetchTweetData` |
| `src/turndown-markdown-converter.ts` | Lines 799-886 (inside fetchAndParse) | `createTurndownService`, `htmlToMarkdown` |
| `src/web-page-extractor.ts` | Lines 751-901 | `fetchAndParse` |

## Files to Modify

| File | Change |
|------|--------|
| `src/convert.ts` | Reduce to orchestrator: import from modules, re-export `convertToMarkdown`, `formatResponse` |

## Implementation Steps

1. Create `src/convert-types.ts` — extract `ConvertResult` interface and `MAX_SIZE` constant
2. Create `src/x-twitter-types.ts` — move all Fx* interfaces + Draft* interfaces
3. Create `src/x-twitter-text-processor.ts` — move `expandTweetText` (imports FxTweet from types)
4. Create `src/x-twitter-media-renderer.ts` — move `renderMedia`, `renderQuote`, `renderPoll`, `renderEngagement`, `formatDuration` (imports from types + text-processor)
5. Create `src/draftjs-to-markdown-converter.ts` — move `blocksToMarkdown`, `applyInlineStyles`, `applyEntityLinks`, `getEntityInfo`, `resolveArticleMediaUrl`
6. Create `src/x-twitter-fetcher.ts` — move `isXUrl`, `parseTweetUrl`, `fetchTweetData` (imports from all x-twitter modules + draftjs module)
7. Create `src/turndown-markdown-converter.ts` — extract Turndown instantiation and all 4 custom rules into `createTurndownService()` and `htmlToMarkdown(html: string): string`
8. Create `src/web-page-extractor.ts` — move `fetchAndParse` (imports from convert-types + turndown-markdown-converter)
9. Rewrite `src/convert.ts` as orchestrator importing from `x-twitter-fetcher` and `web-page-extractor`
10. Run `npx tsc --noEmit` to verify no type errors
11. Run `npm test` to verify no regressions

## Success Criteria

- [ ] `src/convert.ts` < 60 lines
- [ ] Every new module < 200 lines
- [ ] `npx tsc --noEmit` passes
- [ ] `npm test` passes
- [ ] No functional changes — same API surface (`convertToMarkdown`, `formatResponse`)

## Risk

- Circular imports: avoided by having types in separate files and one-directional dependency flow (types → processors → fetcher → orchestrator)
