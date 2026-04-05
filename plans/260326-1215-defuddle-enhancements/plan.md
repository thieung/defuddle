---
title: "Defuddle Worker Enhancements"
description: "Modularize convert.ts and leverage new defuddle v0.14 features"
status: completed
priority: P1
effort: 6h
branch: main
tags: [refactor, features, defuddle]
created: 2026-03-26
---

# Defuddle Worker Enhancements

## Phases

| # | Phase | Status | Effort | File |
|---|-------|--------|--------|------|
| 1 | Modularize convert.ts | **Done** | 2h | [phase-01](phase-01-modularize-convert.md) |
| 2 | Use defuddle built-in Markdown | **Done** | 1.5h | [phase-02](phase-02-builtin-markdown.md) |
| 3 | New API options (includeReplies, contentSelector, language) | **Done** | 1h | [phase-03](phase-03-new-api-options.md) |
| 4 | YouTube transcript support | **Done** | 1h | [phase-04](phase-04-youtube-transcripts.md) |
| 5 | Update index.ts & frontend | **Done** | 0.5h | [phase-05](phase-05-update-routing-and-ui.md) |

## Dependencies

- Phase 2-4 depend on Phase 1 (modularization)
- Phase 5 depends on Phase 3-4 (exposes new options in API)

## Key Decision

**Defuddle's `markdown: true` option** returns Markdown directly in `content`. This could replace our entire custom Turndown setup. However, we have 5 custom Turndown rules (tight lists, escape fix, image titles, linked images). Need to test if defuddle's built-in MD handles these cases well enough. Phase 2 should compare outputs and decide whether to keep Turndown as fallback or remove entirely.
