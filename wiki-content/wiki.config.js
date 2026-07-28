export default {
  title: "Wiki Engine",
  subtitle: "Documentation Engine",
  description: "Markdown-powered wiki engine",
  favicon: "assets/favicon.ico",

  contentDir: "pages",
  assetsDir: "assets",
  outputDir: "../docs/wiki",

  // Path prefix for all asset URLs. On GitHub Pages this is /repo-name/wiki.
  // For local testing with "npx serve ." from wiki root, set to /docs/wiki.
  baseHref: "/docs/wiki",

  wikiName: "WIKI ENGINE",
  navLinks: [
    { label: "HOME", url: "/" },
    { label: "EDITOR", url: "/editor.html" },
    { label: "GITHUB", url: "https://github.com/..." }
  ],

  searchPlaceholder: "SEARCH DOCS...",

  footerText: "WIKI ENGINE",
  footerCopyright: `\u00A9 ${new Date().getFullYear()} Wiki Engine. Website design by <a href="https://github.com/vectorcmdr">vector_cmdr</a>.`,
  footerLinks: [
    { label: "GitHub", url: "https://github.com/..." }
  ],

  theme: {}
};
