// Custom markdown-it footnotes plugin
// Supports [^label] references and [^label]: definition syntax

export function footnotesPlugin(md) {
  const FOOTNOTE_REF_RE = /\[\^([a-zA-Z0-9_-]+)\]/g;
  const FOOTNOTE_DEF_RE = /^\[\^([a-zA-Z0-9_-]+)\]:\s+(.*)$/;

  // Single core rule: collect definitions, then render references, then append footer
  md.core.ruler.push("footnotes", function (state) {
    const tokens = state.tokens;
    const definitions = new Map();

    // Phase 1: Collect footnote definitions from inline tokens and remove them
    const toRemove = [];
    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i].type !== "inline") continue;

      const content = tokens[i].content;
      const lines = content.split("\n");
      const keptLines = [];
      let hasDef = false;

      for (const line of lines) {
        const match = line.trim().match(FOOTNOTE_DEF_RE);
        if (match) {
          definitions.set(match[1], match[2]);
          hasDef = true;
        } else {
          keptLines.push(line);
        }
      }

      if (hasDef) {
        const newContent = keptLines.join("\n").trim();
        if (newContent) {
          tokens[i].content = newContent;
        } else {
          // Remove the entire paragraph
          let openIdx = i - 1;
          while (openIdx >= 0 && tokens[openIdx].type !== "paragraph_open") openIdx--;
          if (openIdx >= 0) toRemove.push(openIdx, i, i + 1);
        }
      }
    }

    // Remove tokens in reverse order
    for (let i = toRemove.length - 1; i >= 0; i--) {
      if (toRemove[i] < tokens.length) tokens.splice(toRemove[i], 1);
    }

    // Phase 2: Replace [^label] inline references with superscript links
    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i].type !== "inline") continue;
      if (!tokens[i].children) continue;

      const inline = tokens[i];
      const children = inline.children;

      for (let j = 0; j < children.length; j++) {
        if (children[j].type !== "text") continue;
        const text = children[j].content;
        if (!FOOTNOTE_REF_RE.test(text)) continue;

        FOOTNOTE_REF_RE.lastIndex = 0;
        const parts = text.split(/(\[\^[a-zA-Z0-9_-]+\])/);
        const newTokens = [];

        for (const part of parts) {
          const refMatch = part.match(/^\[\^([a-zA-Z0-9_-]+)\]$/);
          if (refMatch) {
            const label = refMatch[1];
            const keys = Array.from(definitions.keys());
            const idx = keys.indexOf(label);
            const num = idx !== -1 ? idx + 1 : label;
            const t = new state.Token("html_inline", "", 0);
            t.content = `<sup class="footnote-ref"><a href="#fn-${label}" id="fnref-${label}">${num}</a></sup>`;
            newTokens.push(t);
          } else if (part) {
            const t = new state.Token("text", "", 0);
            t.content = part;
            newTokens.push(t);
          }
        }

        inline.children = children.slice(0, j).concat(newTokens, children.slice(j + 1));
        j += newTokens.length - 1;
      }
    }

    // Phase 3: Append footnotes section at the end
    if (definitions.size > 0) {
      let html = '<section class="footnotes">\n';
      html += '<hr class="footnotes-sep">\n';
      html += '<ol class="footnotes-list">\n';
      for (const [label, text] of definitions) {
        html += `<li id="fn-${label}">`;
        html += `${text} `;
        html += `<a href="#fnref-${label}" class="footnote-backref" title="Back to reference">\u21A9</a>`;
        html += `</li>\n`;
      }
      html += '</ol>\n';
      html += '</section>\n';

      const footerToken = new state.Token("html_block", "", 0);
      footerToken.content = html;
      tokens.push(footerToken);
    }
  });
}

export default footnotesPlugin;
