import { resolve, dirname, basename, extname, join, relative } from "path";
import { fileURLToPath, pathToFileURL } from "url";
import {
  readFileSync, readdirSync, statSync, mkdirSync,
  writeFileSync, existsSync, cpSync, rmSync
} from "fs";
import matter from "./lib/frontmatter.js";
import MarkdownIt from "markdown-it";
import anchorPlugin from "./lib/anchor.js";
import tocPlugin from "./lib/toc.js";
import taskListsPlugin from "./lib/task-lists.js";
import highlight from "./lib/highlight.js";
import { EMOJI_MAP } from "./lib/emoji-map.js";
import footnotesPlugin from "./lib/footnotes.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// --- Config ---

async function loadConfig() {
  const configPath = resolve(__dirname, "wiki.config.js");
  const mod = await import(pathToFileURL(configPath).href);
  return mod.default;
}

// --- Utilities ---

function ensureDir(dirPath) {
  mkdirSync(dirPath, { recursive: true });
}

function slugify(s) {
  return s.toLowerCase().replace(/[^\w]+/g, "-").replace(/(^-|-$)/g, "");
}

// --- Page Discovery ---

function discoverPages(contentDir) {
  const pages = [];
  const entries = readdirSync(contentDir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(contentDir, entry.name);
    if (entry.isDirectory()) {
      pages.push(...discoverPages(fullPath));
    } else if (entry.isFile() && extname(entry.name) === ".md") {
      pages.push(fullPath);
    }
  }
  return pages;
}

// --- Front Matter Parsing (without rendering) ---

function parseFrontMatter(filePath, contentDir) {
  const raw = readFileSync(filePath, "utf-8");
  const { data } = matter(raw);
  const slug = basename(filePath, ".md");
  const relativePath = relative(contentDir, filePath);
  const catDir = dirname(relativePath);
  const category = catDir === "." ? "uncategorized" : catDir;

  return {
    slug,
    category,
    filePath,
    relativePath,
    frontMatter: {
      title: data.title || slug,
      category: data.category || category,
      description: data.description || "",
      tags: data.tags || [],
      order: data.order ?? 999,
      image: data.image || "",
      draft: data.draft || false
    }
  };
}

// --- Markdown Instance ---

function createMarkdownInstance(pagesMap, baseHref) {
  const md = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: false,
    highlight: function (str, lang) {
      if (lang) {
        return highlight(str, lang);
      }
      return "";
    }
  });

  md.use(anchorPlugin, {
    slugify: slugify
  });
  md.use(tocPlugin, {
    level: [1, 2, 3],
    listType: "ul",
    slugify: slugify
  });
  md.use(taskListsPlugin);

  // Footnotes plugin - supports [^label] references
  md.use(footnotesPlugin);

  // Wiki-style [[link]] plugin
  if (pagesMap) {
    md.use(wikiLinkPlugin, pagesMap, baseHref);
  }

  // Admonition plugin
  md.use(admonitionPlugin);

  // Monochrome emoji plugin - :b:smile: renders as monochrome via Noto Emoji font
  md.use(monotoneEmojiPlugin);

  return md;
}

// --- Wiki Link Plugin ---

function wikiLinkPlugin(md, pagesMap, baseHref) {
  const WIKI_LINK_RE = /\[\[([^\]]+)\]\]/;

  function wikiLink(state, silent) {
    if (state.src.charCodeAt(state.pos) !== 0x5B) return false;
    if (state.src.charCodeAt(state.pos + 1) !== 0x5B) return false;

    const match = state.src.slice(state.pos).match(WIKI_LINK_RE);
    if (!match) return false;

    const linkText = match[1];
    const target = pagesMap.get(linkText.toLowerCase());

    if (silent) return true;

    const token = state.push("wiki_link", "a", 0);
    token.content = linkText;
    token.meta = { target };
    state.pos += match[0].length;
    return true;
  }

  md.inline.ruler.before("link", "wiki_link", wikiLink);

  md.renderer.rules.wiki_link = function (tokens, idx) {
    const token = tokens[idx];
    const target = token.meta.target;
    if (target) {
      return `<a href="${baseHref}/pages/${target.category}/${target.slug}.html">${token.content}</a>`;
    }
    return `<span style="color: var(--accent-red); text-decoration: underline dotted;">${token.content}</span>`;
  };
}

// --- Monochrome Emoji Plugin ---

function monotoneEmojiPlugin(md) {
  const EMOJI_RE = /:m:([a-z0-9_+-]+):/g;

  md.core.ruler.after("inline", "monotone-emoji", function (state) {
    const blocks = state.tokens;
    for (let i = 0; i < blocks.length; i++) {
      if (blocks[i].type !== "inline") continue;
      const inline = blocks[i];
      if (!inline.children) continue;
      const tokens = inline.children;
      for (let j = 0; j < tokens.length; j++) {
        if (tokens[j].type !== "text") continue;
        const text = tokens[j].content;
        if (!EMOJI_RE.test(text)) continue;
        EMOJI_RE.lastIndex = 0;
        const parts = text.split(/:(m:[a-z0-9_+-]+):/);
        const newTokens = [];
        for (let k = 0; k < parts.length; k++) {
          if (k % 2 === 0) {
            if (parts[k]) {
              const t = new state.Token("text", "", 0);
              t.content = parts[k];
              newTokens.push(t);
            }
          } else {
            const match = parts[k].match(/^m:([a-z0-9_+-]+)$/);
            if (match) {
              const emojiChar = emojiShortcodeToChar(match[1]);
              const t = new state.Token("html_inline", "", 0);
              t.content = '<span class="emoji-black">' + emojiChar + '</span>';
              newTokens.push(t);
            }
          }
        }
        inline.children = tokens.slice(0, j).concat(newTokens, tokens.slice(j + 1));
        j += newTokens.length - 1;
      }
    }
  });
}

function emojiShortcodeToChar(code) {
  return EMOJI_MAP[code] || "\u{2753}";
}

// --- Admonition Plugin ---

function admonitionPlugin(md) {
  const ADMONITION_RE = /^\s*>\s*\[!(NOTE|WARNING|TIP|DANGER)\]\s*$/;

  function admonitionRule(state, startLine, endLine, silent) {
    const startPos = state.bMarks[startLine] + state.tShift[startLine];
    const maxPos = state.eMarks[startLine];
    const lineText = state.src.slice(startPos, maxPos);
    const match = lineText.match(ADMONITION_RE);
    if (!match) return false;
    if (silent) return true;

    const type = match[1].toLowerCase();
    let nextLine = startLine + 1;
    const contentLines = [];

    while (nextLine < endLine) {
      const lineStart = state.bMarks[nextLine] + state.tShift[nextLine];
      const lineEnd = state.eMarks[nextLine];
      const line = state.src.slice(lineStart, lineEnd);
      if (line.match(/^\s*>\s?/)) {
        contentLines.push(line.replace(/^\s*>\s?/, ""));
        nextLine++;
      } else {
        break;
      }
    }

    const content = contentLines.join("\n");
    const token = state.push("admonition", "div", 0);
    token.content = content;
    token.meta = { type };
    token.map = [startLine, nextLine];
    state.line = nextLine;
    return true;
  }

  md.block.ruler.before("blockquote", "admonition", admonitionRule, {
    alt: ["paragraph", "reference", "blockquote", "list"]
  });

  md.renderer.rules.admonition = function (tokens, idx) {
    const token = tokens[idx];
    const innerHtml = md.render(token.content);
    return `<div class="admonition admonition--${token.meta.type}">\n` +
      `<div class="admonition-title">${token.meta.type}</div>\n` +
      `<div class="admonition-body">${innerHtml}</div>\n` +
      `</div>\n`;
  };
}

// --- Page Rendering ---

function processPage(filePath, md, contentDir, pagesMap) {
  const raw = readFileSync(filePath, "utf-8");
  const { data: frontMatter, content: markdownBody } = matter(raw);

  const slug = basename(filePath, ".md");
  const relativePath = relative(contentDir, filePath);
  const catDir = dirname(relativePath);
  const category = catDir === "." ? "uncategorized" : catDir;

  const htmlContent = md.render(markdownBody);

  return {
    slug,
    category,
    filePath,
    relativePath,
    frontMatter: {
      title: frontMatter.title || slug,
      category: frontMatter.category || category,
      description: frontMatter.description || "",
      tags: frontMatter.tags || [],
      order: frontMatter.order ?? 999,
      image: frontMatter.image || "",
      draft: frontMatter.draft || false
    },
    htmlContent,
    rawMarkdown: markdownBody
  };
}

// --- Sidebar ---

function buildSidebar(pages, config, currentSlug) {
  const base = config.baseHref || "";
  const categories = {};
  for (const page of pages) {
    const cat = page.category;
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(page);
  }

  let html = '<nav class="sidebar-nav">\n';
  for (const [cat, catPages] of Object.entries(categories)) {
    const displayName = cat.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    const isActive = catPages.some((p) => p.slug === currentSlug);
    html += `  <div class="sidebar-category${isActive ? " sidebar-category--active" : ""}">\n`;
    html += `    <div class="sidebar-category-header" data-category="${cat}">${displayName}</div>\n`;
    html += `    <ul class="sidebar-pages">\n`;
    for (const page of catPages) {
      const activeClass = page.slug === currentSlug ? " sidebar-page--active" : "";
      html += `      <li><a href="${base}/pages/${page.category}/${page.slug}.html" class="sidebar-page-link${activeClass}">${page.frontMatter.title}</a></li>\n`;
    }
    html += `    </ul>\n`;
    html += `  </div>\n`;
  }
  html += "</nav>\n";
  return html;
}

// --- TOC Extraction ---

function extractToc(htmlContent) {
  const match = htmlContent.match(/<nav class="table-of-contents">[\s\S]*?<\/nav>/);
  return match ? match[0] : "";
}

function removeTocFromContent(htmlContent) {
  return htmlContent.replace(/<nav class="table-of-contents">[\s\S]*?<\/nav>/, "").trim();
}

// --- HTML Template ---

function getBaseTemplate(config, { pageTitle, breadcrumbs, sidebarHtml, contentHtml, tocHtml, prevPage, nextPage }) {
  const base = config.baseHref || "";
  const navLinksHtml = config.navLinks
    .map((link) => {
      const url = link.url.startsWith("/") ? base + link.url : link.url;
      return `<a href="${url}" class="nav-link">${link.label}</a>`;
    })
    .join("\n            ");

  const breadcrumbHtml = breadcrumbs
    .map((b) => b.url !== null ? `<a href="${base}${b.url}">${b.label}</a>` : `<span>${b.label}</span>`)
    .join(' <span class="breadcrumb-sep">/</span> ');

  const footerLinksHtml = config.footerLinks
    .map((l) => `<a href="${l.url}">${l.label}</a>`)
    .join(" | ");

  const prevLink = prevPage
    ? `<a href="${base}/pages/${prevPage.category}/${prevPage.slug}.html" class="page-nav-link">&laquo; ${prevPage.frontMatter.title}</a>`
    : `<span class="page-nav-link page-nav-empty">&laquo; Previous</span>`;

  const nextLink = nextPage
    ? `<a href="${base}/pages/${nextPage.category}/${nextPage.slug}.html" class="page-nav-link">${nextPage.frontMatter.title} &raquo;</a>`
    : `<span class="page-nav-link page-nav-empty">Next &raquo;</span>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${pageTitle} - ${config.title}</title>
  <meta name="description" content="${config.description}">
  <link rel="icon" href="${base}/${config.favicon}" type="image/x-icon">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:ital,wght@0,400;0,500;0,700;1,400&family=Noto+Emoji&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="${base}/css/wiki.css">
</head>
<body>
  <header class="topbar">
    <div class="topbar-left">
      <button class="sidebar-toggle" id="sidebarToggle">&#9776;</button>
      <a href="${base}/" class="topbar-brand">
        <img src="${base}/assets/logo_small.png" alt="" class="topbar-avatar" onerror="this.style.display='none'">
        <span>${config.wikiName}</span>
      </a>
    </div>
    <div class="topbar-right">
      <div class="topbar-search">
        <input type="text" id="wikiSearch" class="search-input" placeholder="${config.searchPlaceholder}" autocomplete="off">
        <div id="searchResults" class="search-results hidden"></div>
      </div>
      <nav class="topbar-nav">
        ${navLinksHtml}
      </nav>
    </div>
  </header>

  <div class="wiki-layout">
    <aside class="sidebar" id="sidebar">
      ${sidebarHtml}
    </aside>

    <main class="wiki-content">
      <nav class="breadcrumbs">${breadcrumbHtml}</nav>
      <article class="page-body">
        ${contentHtml}
      </article>
      <nav class="page-navigation">
        ${prevLink}
        ${nextLink}
      </nav>
    </main>

    <aside class="toc-rail" id="tocRail">
      ${tocHtml}
    </aside>
  </div>

  <footer class="wiki-footer">
    <span class="footer-left">${config.footerText}</span>
    <span class="footer-center">${config.footerCopyright || ""}</span>
    <span class="footer-links">${footerLinksHtml}</span>
  </footer>

  <div class="pulse-widget" aria-hidden="true">
    <div class="pulse-grid">
      <div class="pulse-square" style="--i:0"><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div>
      <div class="pulse-square" style="--i:1"><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div>
      <div class="pulse-square" style="--i:2"><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div>
      <div class="pulse-square" style="--i:3"><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div>
    </div>
  </div>

  <script src="${base}/js/wiki.js"></script>
</body>
</html>`;
}

// --- Homepage Template ---

function writeHomepage(pages, config) {
  const outputDir = resolve(__dirname, config.outputDir);
  ensureDir(outputDir);

  const categories = {};
  for (const page of pages) {
    const cat = page.category;
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(page);
  }

  const base = config.baseHref || "";
  let contentHtml = `<h1>${config.title}</h1>\n`;
  if (config.subtitle) contentHtml += `<p style="color: var(--text-muted); margin-bottom: 2rem;">${config.subtitle}</p>\n`;

  for (const [cat, catPages] of Object.entries(categories)) {
    const displayName = cat.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    contentHtml += `<h2>${displayName}</h2>\n<ul>\n`;
    for (const page of catPages) {
      contentHtml += `  <li><a href="${base}/pages/${page.category}/${page.slug}.html">${page.frontMatter.title}</a>`;
      if (page.frontMatter.description) {
        contentHtml += ` - <span style="color: var(--text-muted)">${page.frontMatter.description}</span>`;
      }
      contentHtml += `</li>\n`;
    }
    contentHtml += `</ul>\n`;
  }

  const sidebarHtml = buildSidebar(pages, config, null);

  const html = getBaseTemplate(config, {
    pageTitle: config.title,
    breadcrumbs: [{ label: "Home", url: null }],
    sidebarHtml,
    contentHtml,
    tocHtml: "",
    prevPage: null,
    nextPage: null,
    rootPath: "./"
  });

  const outPath = resolve(outputDir, "index.html");
  writeFileSync(outPath, html, "utf-8");
  console.log("  wrote: index.html");
}

// --- Page File Writer ---

function writePageFile(page, config, pages) {
  const outputDir = resolve(__dirname, config.outputDir);
  const pageDir = resolve(outputDir, "pages", page.category);
  ensureDir(pageDir);

  const tocHtml = extractToc(page.htmlContent);
  const cleanContent = removeTocFromContent(page.htmlContent);
  const sidebarHtml = buildSidebar(pages, config, page.slug);

  const catPages = pages.filter((p) => p.category === page.category);
  const idx = catPages.findIndex((p) => p.slug === page.slug);
  const prevPage = idx > 0 ? catPages[idx - 1] : null;
  const nextPage = idx < catPages.length - 1 ? catPages[idx + 1] : null;

  const breadcrumbs = [
    { label: "Home", url: "/" },
    { label: page.frontMatter.category.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()), url: null },
    { label: page.frontMatter.title, url: null }
  ];

  const html = getBaseTemplate(config, {
    pageTitle: page.frontMatter.title,
    breadcrumbs,
    sidebarHtml,
    contentHtml: cleanContent,
    tocHtml,
    prevPage,
    nextPage,
    rootPath: "../../"
  });

  const outPath = resolve(pageDir, `${page.slug}.html`);
  writeFileSync(outPath, html, "utf-8");
  console.log(`  wrote: pages/${page.category}/${page.slug}.html`);
}

// --- Search Index ---

function buildSearchIndex(pages, config) {
  const indexData = pages.map((page) => {
    const plainText = page.htmlContent
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    return {
      slug: page.slug,
      category: page.category,
      title: page.frontMatter.title,
      description: page.frontMatter.description,
      tags: page.frontMatter.tags,
      text: plainText
    };
  });

  const outputDir = resolve(__dirname, config.outputDir);
  const outPath = resolve(outputDir, "search-index.json");
  writeFileSync(outPath, JSON.stringify(indexData, null, 2), "utf-8");
  console.log("  wrote: search-index.json");
}

// --- Media Copying ---

function copyMedia(pages, config) {
  const contentDir = resolve(__dirname, config.contentDir);
  const outputDir = resolve(__dirname, config.outputDir);

  for (const page of pages) {
    const pageDir = dirname(page.filePath);
    const pageName = basename(page.filePath, ".md");
    const mediaDir = join(pageDir, pageName);

    if (existsSync(mediaDir) && statSync(mediaDir).isDirectory()) {
      const destDir = resolve(outputDir, "pages", page.category, pageName);
      cpSync(mediaDir, destDir, { recursive: true });
      console.log(`  copied media: pages/${page.category}/${pageName}/`);
    }
  }

  const assetsDir = resolve(__dirname, config.assetsDir);
  const assetsDest = resolve(outputDir, "assets");
  if (existsSync(assetsDir)) {
    cpSync(assetsDir, assetsDest, { recursive: true });
    console.log("  copied: assets/");
  }
}

// --- Theme Overrides ---

function writeThemeOverrides(config) {
  const overrides = config.theme;
  if (!overrides || Object.keys(overrides).length === 0) return;

  let css = ":root {\n";
  for (const [key, value] of Object.entries(overrides)) {
    css += `  ${key}: ${value};\n`;
  }
  css += "}\n";

  const outputDir = resolve(__dirname, config.outputDir);
  const outPath = resolve(outputDir, "css", "theme-overrides.css");
  writeFileSync(outPath, css, "utf-8");
  console.log("  wrote: css/theme-overrides.css");
}

// --- Main Build ---

async function main() {
  const config = await loadConfig();
  const contentDir = resolve(__dirname, config.contentDir);
  const outputDir = resolve(__dirname, config.outputDir);

  console.log(`Building wiki: ${config.title}`);

  // Clean output
  if (existsSync(outputDir)) {
    rmSync(outputDir, { recursive: true });
  }
  ensureDir(outputDir);

  // Discover and parse front matter
  const pageFiles = discoverPages(contentDir);
  const pageInfoList = pageFiles
    .map((f) => parseFrontMatter(f, contentDir))
    .filter((p) => !p.frontMatter.draft);

  pageInfoList.sort((a, b) => {
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    return a.frontMatter.order - b.frontMatter.order;
  });

  // Build pagesMap for wiki links
  const pagesMap = new Map();
  for (const p of pageInfoList) {
    pagesMap.set(p.frontMatter.title.toLowerCase(), p);
  }

  // Create markdown instance with wiki link support
  const md = createMarkdownInstance(pagesMap, config.baseHref || "");

  // Render all pages
  const pages = pageInfoList.map((p) => processPage(p.filePath, md, contentDir, pagesMap));
  pages.sort((a, b) => {
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    return a.frontMatter.order - b.frontMatter.order;
  });

  console.log(`Processed ${pages.length} pages`);

  // Write pages
  for (const page of pages) {
    writePageFile(page, config, pages);
  }

  // Write homepage
  writeHomepage(pages, config);

  // Build search index
  buildSearchIndex(pages, config);

  // Copy media and assets
  copyMedia(pages, config);

  // Copy CSS
  const cssSource = resolve(__dirname, "css");
  const cssDest = resolve(outputDir, "css");
  if (existsSync(cssSource)) {
    cpSync(cssSource, cssDest, { recursive: true });
    console.log("  copied: css/");
  }

  // Copy JS
  const jsSource = resolve(__dirname, "js");
  const jsDest = resolve(outputDir, "js");
  if (existsSync(jsSource)) {
    cpSync(jsSource, jsDest, { recursive: true });
    console.log("  copied: js/");
  }

  // Copy editor with emoji map and baseHref injected
  const editorSource = resolve(__dirname, "editor", "index.html");
  const editorDest = resolve(outputDir, "editor.html");
  if (existsSync(editorSource)) {
    let editorHtml = readFileSync(editorSource, "utf-8");
    editorHtml = editorHtml.replace(/\{BASE_HREF\}/g, config.baseHref || "");
    // Read and inject the emoji map
    const emojiMapPath = resolve(__dirname, "lib", "emoji-map-embed.js");
    if (existsSync(emojiMapPath)) {
      const emojiMapJs = readFileSync(emojiMapPath, "utf-8");
      editorHtml = editorHtml.replace("{EMOJI_MAP_PLACEHOLDER}", emojiMapJs);
    }
    writeFileSync(editorDest, editorHtml, "utf-8");
    console.log("  copied: editor.html");
  }

  // Theme overrides
  writeThemeOverrides(config);

  console.log("Build complete.");
}

main().catch(console.error);
