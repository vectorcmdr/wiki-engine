// Custom markdown-it TOC plugin - generates table of contents

export function tocPlugin(md, opts = {}) {
  const slugify = opts.slugify || ((s) =>
    s.toLowerCase().replace(/[^\w]+/g, "-").replace(/(^-|-$)/g, "")
  );
  const minLevel = (opts.level && opts.level[0]) || 1;
  const maxLevel = (opts.level && opts.level[1]) || 3;

  md.core.ruler.push("toc", function (state) {
    const tokens = state.tokens;
    const headings = [];
    let tocPosition = -1;

    // Collect headings and find [TOC] marker
    for (let i = 0; i < tokens.length; i++) {
      // Find [TOC] marker in paragraph tokens
      if (tokens[i].type === "paragraph_open" && tocPosition === -1) {
        const inline = tokens[i + 1];
        if (inline && inline.type === "inline" && inline.content.trim() === "[TOC]") {
          tocPosition = i;
        }
      }

      if (tokens[i].type !== "heading_open") continue;

      const level = parseInt(tokens[i].tag.slice(1), 10);
      if (level < minLevel || level > maxLevel) continue;

      const inline = tokens[i + 1];
      if (!inline || inline.type !== "inline") continue;

      let text = "";
      if (inline.children) {
        for (const child of inline.children) {
          if (child.type === "text") text += child.content;
          else if (child.type === "softbreak") text += " ";
        }
      }

      const slug = slugify(text);
      headings.push({ level, text, slug });
    }

    if (headings.length === 0) return;

    // Build TOC HTML
    const tocHtml = buildTocHtml(headings, minLevel);

    // Replace [TOC] marker with actual TOC
    if (tocPosition !== -1) {
      // Remove the paragraph_open, inline, and paragraph_close tokens
      const tocToken = new state.Token("html_block", "", 0);
      tocToken.content = tocHtml;
      tocToken.map = [tocPosition, tocPosition + 3];

      // Replace 3 tokens (paragraph_open, inline, paragraph_close) with 1 html_block
      tokens.splice(tocPosition, 3, tocToken);
    }
  });
}

function buildTocHtml(headings, minLevel) {
  let html = '<nav class="table-of-contents">\n';
  html += '<div class="toc-title">Table of Contents</div>\n';
  html += '<ul class="toc-list">\n';

  let prevLevel = minLevel;

  for (const heading of headings) {
    const level = heading.level;

    // Close lists if going down levels
    while (prevLevel > level) {
      html += '</ul>\n';
      prevLevel--;
    }

    // Open lists if going down levels
    while (prevLevel < level) {
      html += '<ul class="toc-list">\n';
      prevLevel++;
    }

    html += `<li class="toc-item toc-level-${level}">`;
    html += `<a href="#${heading.slug}">${heading.text}</a>`;
    html += '</li>\n';
  }

  // Close remaining lists
  while (prevLevel >= minLevel) {
    html += '</ul>\n';
    if (prevLevel === minLevel) break;
    prevLevel--;
  }

  html += '</nav>\n';
  return html;
}

export default tocPlugin;
