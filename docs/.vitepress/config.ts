import { defineConfig } from "vitepress";

const base = process.env.DOCS_BASE ?? "/docs/";
const storybookUrl = process.env.STORYBOOK_URL ?? "http://localhost:6006/";

// Origin the docs are published under. The sitemap library resolves each page
// URL against `hostname`, dropping VitePress' `base`, so the hostname has to
// carry the full base path for the generated URLs to be correct.
const origin = process.env.DOCS_ORIGIN ?? "https://cublya.github.io";
// Landing-page asset used as the social preview image. `base` ends in `docs/`;
// the shared assets live one level up at the site root.
const siteRoot = `${origin}${base.replace(/docs\/$/, "")}`;
const ogImage = `${siteRoot}assets/og-image.png`;

export default defineConfig({
  lang: "en-US",
  title: "Geomap",
  description:
    "Guides and API reference for @cublya/geomap — composable React map and globe primitives built on d3-geo.",
  base,
  cleanUrls: true,
  sitemap: { hostname: `${origin}${base}` },
  transformHead({ pageData, siteData }) {
    const rel = pageData.relativePath
      .replace(/(^|\/)index\.md$/, "$1")
      .replace(/\.md$/, "");
    const canonical = `${origin}${siteData.base}${rel}`;
    const pageTitle = pageData.title
      ? `${pageData.title} | Geomap`
      : "Geomap · React maps & globes on d3-geo";
    const description = pageData.description || siteData.description;
    return [
      ["link", { rel: "canonical", href: canonical }],
      ["meta", { property: "og:type", content: "website" }],
      ["meta", { property: "og:site_name", content: "Geomap" }],
      ["meta", { property: "og:title", content: pageTitle }],
      ["meta", { property: "og:description", content: description }],
      ["meta", { property: "og:url", content: canonical }],
      ["meta", { property: "og:image", content: ogImage }],
      ["meta", { name: "twitter:card", content: "summary_large_image" }],
      ["meta", { name: "twitter:title", content: pageTitle }],
      ["meta", { name: "twitter:description", content: description }],
      ["meta", { name: "twitter:image", content: ogImage }],
    ];
  },
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
