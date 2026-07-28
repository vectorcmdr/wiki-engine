---
title: "Getting Started"
category: "guides"
description: "How to get started with the wiki engine"
tags: ["guide", "intro"]
order: 1
---

# Getting Started

Welcome to Wiki Engine

Wiki Engine is a markdown-powered static site generator designed for documentation wikis. It turns plain markdown files into a fully functional wiki with search, navigation, and a built-in editor.

## Features

| Feature            | Description |
|--------------------|-------------|
| Markdown parsing   | Full markdown with extensions |
| Client search      | Instant full-text search |
| WYSIWYG editor     | Browser-based page editor |
| Customisable theme | MGS-inspired terminal aesthetic |

## Quick Start

Create a markdown file in the `pages` directory with frontmatter:

```markdown
---
title: "My Page"
category: "general"
description: "A short description"
tags: ["tag1", "tag2"]
order: 1
---

# My Page

Content goes here.
```

Run the build script:

```bash
node build.js
```

Your wiki is now ready at `docs/wiki/`.

> [!TIP]
> Use the Editor button to create and preview pages without touching the command line.
