---
title: "Editor Guide"
category: "general"
description: "How to use the wiki editor"
tags: ["guide", "editor"]
order: 2
---

# Editor Guide

## Accessing the Editor

Click the Editor button in the top navigation bar to open the wiki editor.

## Creating a Page

1. Fill in the metadata fields at the top
2. Write your content in the markdown pane on the left
3. See the live preview on the right
4. Export as a zip when ready

## Toolbar Buttons

| Button | Function              |
|--------|-----------------------|
| B      | Bold                  |
| I      | Italic                |
| H1-H4  | Headings              |
| UL     | Unordered list        |
| OL     | Ordered list          |
| TASK   | Task list (checkboxes)|
| LINK   | Insert link           |
| IMG    | Insert image          |
| </>    | Code block            |
| TBL    | Insert table          |
| NOTE   | Admonition block      |
| FN     | Footnote              |
| :m:    | Monochrome emoji      |

> [!NOTE]
> Media files can be dragged directly onto the media panel at the bottom
> of the editor.

## Emoji Shortcodes

Use shortcode prefixes to render emoji in alternative styles.

**Colour:** `:smile:` &#x1F604;
**Monochrome:** `:m:smile:` <span class="emoji-black">&#x1F604;</span>

| Prefix | Style | Example |
|--------|-------|---------|
| (none) | Full colour | `:smile:` |
| `:m:` | Monochrome (Noto Emoji) | `:m:smile:` |

Any standard emoji shortcode works with these prefixes. The `:m:` version
renders the emoji using the Noto Emoji monochrome font for a clean
line-art appearance. All 1,900+ GitHub-compatible shortcodes are supported.

> [!TIP]
> The examples above use HTML to show the different styles. When you write
> `:m:smile:` in your own pages, it will render using the monochrome font.

## Footnotes

Use footnotes to add citations and references. Click the FN button or type the syntax manually:

**Inline reference:** `[^label]`
**Definition:** `[^label]: Citation text here`

Example:

```markdown
This is a claim[^1] with a source[^2].

[^1]: First citation details
[^2]: Second citation details
```

Footnotes render as superscript numbers linking to a footnotes section at the bottom of the page.

## Code Blocks

Use fenced code blocks with a language identifier for syntax highlighting:

````
```javascript
const x = 42;
```

```python
def greet(name):
    print(f"Hello {name}")
```
````

Supported languages: `javascript`, `python`, `csharp`, `cpp`, `json`, `xml`

Example:

```javascript
async function loadPages(category) {
  const response = await fetch(`/api/pages?cat=${category}`);
  const data = await response.json();
  console.log(`Loaded: ${data.pages.length} pages`);
  return data;
}
```

## Submitting Your Page

After exporting the zip file:

1. Share it in the Discord #wiki-submissions channel, OR
2. Place the .md file and media folder into the appropriate category
   directory in the repository and commit
