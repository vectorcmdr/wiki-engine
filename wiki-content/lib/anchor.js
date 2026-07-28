// Custom markdown-it anchor plugin - adds id to headings

export function anchorPlugin(md, opts = {}) {
  const slugify = opts.slugify || ((s) =>
    s.toLowerCase().replace(/[^\w]+/g, "-").replace(/(^-|-$)/g, "")
  );

  function addAnchor(state) {
    const tokens = state.tokens;
    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i].type !== "heading_open") continue;

      const headingOpen = tokens[i];
      const headingInline = tokens[i + 1];
      if (!headingInline || headingInline.type !== "inline") continue;

      // Extract text content from inline children
      let text = "";
      if (headingInline.children) {
        for (const child of headingInline.children) {
          if (child.type === "text") text += child.content;
          else if (child.type === "softbreak") text += " ";
        }
      }

      const slug = slugify(text);
      headingOpen.attrSet("id", slug);
    }
  }

  md.core.ruler.push("anchor", addAnchor);
}

export default anchorPlugin;
