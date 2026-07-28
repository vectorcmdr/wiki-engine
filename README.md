# Wiki Engine

Markdown-powered static wiki engine. Write pages in markdown, build to HTML, deploy anywhere.

## Quick Start

```bash
cd wiki-content
npm install
npm run build
```

Serve locally:

```bash
npx serve docs/
```

Open `http://localhost:3000/`. (The `baseHref` in the config is set for GitHub Pages deployment. For local testing, change it to `/docs/wiki` in `wiki-content/wiki.config.js`.)

## Structure

```
wiki-content/
  pages/          -- Markdown source files with frontmatter
  css/            -- Theme stylesheet
  js/             -- Client-side search script
  editor/         -- Standalone WYSIWYG editor source
  lib/            -- Custom markdown plugins
  assets/         -- Images, favicon, etc.
  build.js        -- Build script
  wiki.config.js  -- Configuration

docs/
  index.html      -- Landing page
  wiki/           -- Build output (gitignored)
```

## Configuration

Edit `wiki-content/wiki.config.js` to set site title, nav links, footer text, and base path.

## Pages

Create a markdown file in `pages/` with frontmatter:

```markdown
---
title: "Page Title"
category: "category-name"
description: "Short description"
tags: ["tag1", "tag2"]
order: 1
---

# Content
```

Categories appear as sidebar sections. Pages are ordered by the `order` field.

## Landing Page

The landing page at `docs/index.html` is standalone. Update it with your own logo and links.

## Deployment

The `.github/workflows/deploy-wiki.yml` workflow builds and deploys to GitHub Pages on push to main. The built artifact includes both the landing page and the wiki.
