---
phase: 5
title: "Update routing and frontend UI"
status: pending
effort: 0.5h
depends_on: [3, 4]
---

# Phase 5: Update Routing and Frontend UI

## Overview

Update `public/index.html` to expose new options in the UI and update API docs.

## Implementation Steps

1. Add optional UI controls for new params:
   - Checkbox: "Include replies" (default checked)
   - Text input: "Content selector" (optional, placeholder: `.article-body`)
   - Text input: "Language" (optional, placeholder: `en`)
2. Update the frontend JS `fetch('/api/convert', ...)` call to include new fields
3. Display `language` in the result metadata section
4. Update any API usage documentation in the HTML

## Files to Modify

| File | Change |
|------|--------|
| `public/index.html` | Add form controls, update fetch call, display language |

## Success Criteria

- [ ] New options visible in UI
- [ ] Options sent to API correctly
- [ ] Language displayed in results
- [ ] UI remains clean and usable
