---
phase: 2
title: "Use defuddle built-in Markdown conversion"
status: pending
effort: 1.5h
depends_on: [1]
---

# Phase 2: Use Defuddle Built-in Markdown Conversion

## Overview

Defuddle v0.10.0+ supports `markdown: true` which returns Markdown directly in `content`. Evaluate whether this replaces our custom Turndown setup.

## Current Custom Turndown Rules

We have 4 custom rules that defuddle's built-in may or may not handle:

1. **Tight list items** — collapses `<li><p>` into tight lists (Substack, WordPress)
2. **Escape fix** — prevents `\-` at start of lines
3. **Image no redundant title** — omits title when it duplicates alt
4. **Linked image** — `<a><img></a>` → `[![alt](img)](href)`

## Implementation Steps

1. **Test defuddle's markdown output** against 5-10 real URLs (Substack, WordPress, Medium, GitHub, news sites)
2. **Compare** defuddle markdown vs our Turndown output for the 4 custom rules
3. **Decision point:**
   - If defuddle handles all cases well → remove Turndown entirely, delete `src/turndown-markdown-converter.ts`
   - If defuddle misses some cases → use `separateMarkdown: true` to get both HTML and MD, keep Turndown as fallback option, or contribute fixes upstream
   - Most likely path: use defuddle's markdown and accept minor differences

### If replacing Turndown:

4. Update `src/web-page-extractor.ts`:
   ```typescript
   const defuddle = new Defuddle(document, {
     url: targetUrl,
     markdown: true,
   });
   const result = defuddle.parse();
   // result.content is now Markdown directly
   ```
5. Remove Turndown import and `src/turndown-markdown-converter.ts`
6. Remove `turndown` and `@types/turndown` from `package.json`
7. Simplify `src/polyfill.ts` — DOMParser polyfill was needed for Turndown; check if still needed
8. Run tests, compare output quality

### If keeping Turndown as fallback:

4. Add a `useBuiltinMarkdown` flag (default `true`)
5. Fall back to Turndown when flag is false or for specific domains

## Files to Modify

| File | Change |
|------|--------|
| `src/web-page-extractor.ts` | Pass `markdown: true` to Defuddle, remove Turndown usage |
| `src/polyfill.ts` | Potentially simplify if Turndown removed |
| `package.json` | Remove turndown deps if fully replaced |

## Files to Delete (if replacing Turndown)

- `src/turndown-markdown-converter.ts`

## Success Criteria

- [ ] Web page extraction returns quality Markdown comparable to current output
- [ ] Tests pass
- [ ] Turndown removed OR kept with clear justification documented in code comment

## Risk

- Defuddle's Markdown may differ in edge cases. Mitigation: test thoroughly, accept minor differences that don't affect readability.
