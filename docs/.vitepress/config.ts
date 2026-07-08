import { defineConfig } from "vitepress";

const base = process.env.DOCS_BASE ?? "/docs/";
const storybookUrl = process.env.STORYBOOK_URL ?? "http://localhost:6006/";

export default defineConfig({
  title: "Geomap",
  description: "Project and API documentation for @cublya/geomap",
  base,
  cleanUrls: true,
  rewrites: {
    "README.md": "index.md",
  },
  markdown: {
    // Vue treats `{{ ... }}` in text as template interpolation. JSX examples
    // naturally contain adjacent braces for object-valued props, so mark code
    // output as literal content rather than forcing every example to be escaped.
    config(md) {
      const fence = md.renderer.rules.fence;
      const codeInline = md.renderer.rules.code_inline;
      if (fence) {
        md.renderer.rules.fence = (...args) => `<div v-pre>${fence(...args)}</div>`;
      }
      if (codeInline) {
        md.renderer.rules.code_inline = (...args) =>
          codeInline(...args).replace("<code>", "<code v-pre>");
      }
    },
  },
  // VitePress does not rewrite `head` URLs, so the base must be spelled out.
  head: [
    ["link", { rel: "icon", type: "image/svg+xml", href: `${base}favicon.svg` }],
    ["link", { rel: "icon", href: `${base}favicon.ico`, sizes: "32x32" }],
    ["meta", { name: "theme-color", content: "#17211b" }],
  ],
  themeConfig: {
    siteTitle: "@cublya/geomap",
    logo: {
      light: "/brand/icon-black.svg",
      dark: "/brand/icon-white.svg",
      alt: "Geomap",
    },
    nav: [
      { text: "Guide", link: "/getting-started" },
      { text: "API", link: "/api-reference" },
      { text: "Storybook", link: storybookUrl },
    ],
    sidebar: [
      {
        text: "Using geomap",
        items: [
          { text: "Overview", link: "/" },
          { text: "Getting started", link: "/getting-started" },
          { text: "API reference", link: "/api-reference" },
          { text: "Data and rendering", link: "/data-and-rendering" },
          { text: "Theming and accessibility", link: "/theming-and-accessibility" },
          { text: "Troubleshooting", link: "/troubleshooting" },
        ],
      },
      {
        text: "Project internals",
        items: [
          { text: "Architecture", link: "/architecture" },
          { text: "Testing and releases", link: "/testing-and-releases" },
          { text: "API design notes", link: "/api-design" },
          { text: "Basemap coverage", link: "/basemap-coverage" },
        ],
      },
    ],
    socialLinks: [{ icon: "github", link: "https://github.com/cublya/geomap" }],
    search: { provider: "local" },
    outline: { level: [2, 3] },
    footer: {
      message: "Released under the MIT License.",
      copyright: "Copyright © Cublya",
    },
  },
});
