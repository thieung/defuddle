---
description: Convert a PDF file into a premium Vietnamese web page (index.html) — from extraction to deploy
---

# PDF-to-Web Pipeline

Automated pipeline to convert a PDF file (English or Vietnamese) into a premium Vietnamese web page.

## Step 0: Validate Input

1. Confirm the user has provided a PDF file path. If not, ask for it.
2. Verify the PDF file exists at the given path.
3. Install Python dependencies if not already available:

```bash
pip install PyPDF2 markdown
```

## Step 1: Extract PDF Content

1. Create and run `extract_pdf.py` to extract raw text content from the PDF:

```python
import PyPDF2
import sys

def extract_pdf(pdf_path, output_path="pdf_extracted.txt"):
    with open(pdf_path, "rb") as f:
        reader = PyPDF2.PdfReader(f)
        text = ""
        for page in reader.pages:
            text += page.extract_text() + "\n"
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(text)
    print(f"Extracted {len(reader.pages)} pages to {output_path}")

if __name__ == "__main__":
    extract_pdf(sys.argv[1])
```

// turbo
2. Run the extraction script:

```bash
python extract_pdf.py <pdf_path>
```

3. Read the first 200 lines of `pdf_extracted.txt` to verify encoding quality. If garbled or empty, alert the user and stop.

## Step 2: Detect Language & Convert to Vietnamese Markdown

1. Read the extracted text and detect the language (English vs Vietnamese).

### If English:
- Translate the content from English to Vietnamese.
- Keep technical terms bilingual (e.g., "Machine Learning (Học máy)").
- Maintain an anti-AI, natural Vietnamese tone.
- Preserve all code blocks unchanged.
- Output as well-structured Markdown.

### If Vietnamese:
- Convert directly to Markdown.
- Only reformat headings and structure — no translation needed.

2. Save the result as `content.md`.

## Step 3: Web Build Pipeline

### Phase 1: Generate Design System

1. Use the `ui-ux-pro-max` MCP tools to get design recommendations:
   - Call `mcp_ui-ux-pro-max_ui_search_context` with query "premium article landing page Vietnamese"
   - Call `mcp_ui-ux-pro-max_ui_search` for style, color, and typography guidance
2. Define the design system: color palette, fonts, spacing, and layout tokens.
3. Apply Web Design Standards:
   - Sticky/collapsible sidebar navigation
   - Author branding section
   - Fully responsive layout

### Phase 2: Code `index.html`

1. Build a single `index.html` file that includes:
   - **Design system** from Phase 1 (CSS custom properties, fonts, etc.)
   - **Markdown content** rendered as semantic HTML
   - **Sidebar TOC** auto-generated from H2 headings
   - **Author branding**: "Minh Đỗ" with Zalo link (https://zalo.me/g/igkywu632)
   - **Responsive layout** optimized for mobile-first
   - **Premium aesthetics**: smooth transitions, hover effects, micro-animations
   - **Dark mode** support (optional but recommended)

## Step 4: Auto Audit

Run the following checks automatically (do NOT wait for user to ask):

1. **Responsive check**: Verify layout at 375px, 390px, 768px, and 1024px+ breakpoints.
2. **Accessibility check**: Verify color contrast ratios, alt text on images, focus states on interactive elements.
3. **UX check**: Verify hover states, transitions, cursor-pointer on clickable elements.
4. **Layout check**: Ensure no horizontal scroll overflow, TOC navigation works correctly.

If any issues are found:
- Fix them immediately.
- Re-run the audit until all checks pass.
- Report a summary of what was fixed.

## Step 5: Deploy Prompt

1. Ask the user: **"Bạn có muốn deploy lên Vercel luôn không?"** (Do you want to deploy to Vercel now?)

### If Yes:
- Initialize git repo if not already done
- Create/push to a GitHub repository
- Deploy to Vercel using the `/deploy-to-vercel` workflow (or manual Vercel CLI)
- Provide the live URL

### If No:
- End the pipeline
- Confirm that `index.html` is ready for manual use
- Provide the file path

## Notes

- **Author**: Minh Đỗ
- **Source**: https://2026-03-14-pdf-to-web-pipeline.vercel.app
- This workflow produces a single `index.html` file with all CSS/JS inlined for easy deployment.
