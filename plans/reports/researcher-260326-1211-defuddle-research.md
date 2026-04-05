# Defuddle Repository Research Report

**Date:** 2026-03-26
**Subject:** Current state, features, and recent updates of kepano/defuddle
**Status:** Active development (last commit: 2026-03-26)

---

## Executive Summary

Defuddle is a mature, actively maintained content extraction library (5.8k+ stars) that removes webpage clutter and extracts primary content as cleaned HTML or Markdown. Latest version **0.14.0** released 2026-03-17. Development velocity is high—20+ commits in past 3 days with focus on edge-case handling, platform-specific extraction, and API normalization.

---

## Current Version & Release History

| Version | Release Date | Key Changes |
|---------|--------------|-------------|
| **0.14.0** (latest) | 2026-03-17 | `includeReplies` option, callout standardization, YouTube mobile extraction, truncated descriptions (300 words) |
| 0.13.0 | 2026-03-13 | DOM Document abstraction, switched JSDOM → linkedom |
| 0.12.0 | 2026-03-10 | YouTube transcripts with diarization, comment extraction, Node.js speed |
| 0.11.0 | 2026-03-08 | Shadow DOM flattening, pipeline diagnostics toggles |
| 0.10.0 | 2026-03-06 | Standalone Markdown API, arXiv fixes, content scoring |
| 0.9.0 | 2026-03-05 | Async X.com extraction, Substack app, Shiki language detection |
| 0.8.0 | 2026-03-02 | CLI moved to main repo |
| 0.7.0 | 2026-02-14 | X.com article extraction, Markdown in full bundle |

---

## Key Features & API Surface

### Core Extraction
- **Content removal:** Removes comments, sidebars, headers, footers, ads, navigation clutter
- **Forgiving approach:** Removes fewer uncertain elements vs. similar tools
- **Output formats:** HTML or Markdown
- **Metadata extraction:** title, author, publication date, description, domain, language, word count

### Advanced Capabilities
- **Schema.org data extraction:** Structured data support
- **Math element standardization:** Converts to MathML
- **Code block normalization:** Language preservation
- **Footnote restructuring:** Consistent formatting
- **Shadow DOM flattening:** Web component support (v0.11+)
- **YouTube transcripts:** With speaker diarization (v0.12+)
- **X.com async extraction:** For async-loaded content (v0.9+)
- **Comment extraction:** Platform-aware comment parsing

### Interfaces
- **Browser API:** Class-based (`new Defuddle(document)`)
- **Node.js:** Works with linkedom, JSDOM, happy-dom
- **CLI:** Full-featured command-line tool

### Configuration Options
- `markdown` — Convert to Markdown
- `debug` — Detailed logging with element removal reasons
- `contentSelector` — Manual content element specification
- `removeHiddenElements` — Strip CSS-hidden content
- `removeLowScoring` — Filter low-relevance blocks
- `useAsync` — Enable third-party API fallbacks
- `language` — Set preferred language (BCP 47)
- `includeReplies` — Include reply threads (v0.14+)

### Response Properties
```javascript
{
  content,          // Cleaned content (HTML/Markdown)
  title,            // Article title
  author,           // Extracted author
  description,      // Summary (truncated to 300 words in v0.14+)
  domain,           // Website domain
  language,         // BCP 47 language code
  wordCount,        // Content word count
  parseTime,        // Processing duration (ms)
  schemaOrgData     // Structured data from page
}
```

---

## Recent Commits & Ongoing Work (Last 3 Days)

**Pattern:** Rapid iterations on edge-case handling, platform-specific fixes, and content scoring refinement.

| Date | Change | Impact |
|------|--------|--------|
| 2026-03-26 | Charset parsing (quotes, trailing commas) | HTTP header robustness |
| 2026-03-26 | Author/date extraction from cover elements | Metadata completeness |
| 2026-03-25 | Scoring tweaks, removal patterns | Content selection accuracy |
| 2026-03-25 | Breadcrumb detection | Navigation removal |
| 2026-03-24 | Reddit author deduplication | Prevents superstring duplication |
| 2026-03-24 | Fixes for arm.com, Reddit lazy-loaded comments (#204) | Platform-specific stability |

---

## Breaking Changes & Migration Notes

### v0.13 (Major: DOM Abstraction)
- **Changed:** Accepts any DOM Document interface (not just JSDOM)
- **Migration:** Code accepting JSDOM directly may need validation against new interface
- **Recommended parser:** linkedom (faster, lighter than JSDOM)

### v0.9 (Feature: Async Support)
- Added `useAsync` option for third-party API fallbacks
- X.com extraction now async-aware
- **Impact:** Some calls now async; await required

### v0.8 (Structural: CLI Merged)
- CLI moved from separate repo into main repository
- Simplifies installation (`npx defuddle` now works)

---

## Technical Stack

- **Language:** JavaScript/TypeScript
- **DOM Parser (recommended):** linkedom (v0.13+)
- **Alternatives:** JSDOM, happy-dom
- **Code highlighting:** Shiki (for language detection)
- **License:** MIT
- **Repository:** https://github.com/kepano/defuddle
- **Live demo:** https://defuddle.md

---

## Upstream Dependency Implications

For `/Users/thieunv/projects/personal/cloudflare/defuddle-worker`:

1. **Latest API (0.14.0):** Supports `includeReplies`, improved YouTube extraction, truncated descriptions—relevant for Twitter/social content processing

2. **DOM abstraction (v0.13):** If currently using JSDOM directly, verify compatibility with linkedom approach

3. **Async patterns (v0.9+):** If using defuddle for X.com content, handle async extraction with proper await patterns

4. **CLI availability:** Can leverage `npx defuddle` for testing and CLI-based extraction workflows

---

## Development Activity Signals

- **Commit frequency:** 20+ commits in 72 hours—active development
- **Issue tracking:** 23 open issues (mostly feature requests, not blockers)
- **Community:** 227 forks, 5.8k stars—stable production library
- **Maintenance:** Single lead maintainer (kepano) with community contributors
- **Last activity:** 2026-03-26 00:15:30 UTC (current session date)

---

## Unresolved Questions

1. **Package.json availability:** Direct fetch of package.json returned 503 (may be rate-limited). Current npm version not independently verified beyond release tags.
2. **Changelog file:** Separate CHANGELOG.md not found in repository root. Release history reconstructed from API.
3. **Pending PRs:** Open PR count and merge status not examined—may indicate pending features or fixes.
4. **Performance benchmarks:** No published benchmarks for v0.14.0. Earlier versions showed linkedom ~2x faster than JSDOM.
