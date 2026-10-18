import { defineConfig, type HeadConfig } from "vitepress";

// Product identity in one place. The product name is a working name: change it
// here and the docs title, metadata and structured data follow.
const brand = {
  name: "Geomap",
  packageName: "@cublya/geomap",
  tagline: "React maps & globes on d3-geo",
  repository: "https://github.com/cublya/geomap",
  organization: { name: "Cublya", url: "https://www.cublya.com" },
} as const;

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
  title: brand.name,
  description: `Guides and API reference for ${brand.packageName}: composable React map and globe primitives built on d3-geo.`,
  base,
  cleanUrls: true,
  // Git timestamps feed the sitemap's <lastmod>; the Pages workflow checks out
  // full history so each page gets its own date.
  lastUpdated: true,
  sitemap: { hostname: `${origin}${base}` },
  // The docs home is README.md (readable on GitHub without frontmatter); give it
  // a descriptive <title> here instead of the generic "Documentation".
  transformPageData(pageData) {
    if (pageData.relativePath === "index.md") {
      pageData.title = `${brand.name} documentation`;
      pageData.titleTemplate = ":title: guides and API reference";
    }
  },
  transformHead({ pageData, siteData }) {
    const rel = pageData.relativePath
      .replace(/(^|\/)index\.md$/, "$1")
      .replace(/\.md$/, "");
    const canonical = `${origin}${siteData.base}${rel}`;
    const isHome = rel === "";
    const isGuide = rel.startsWith("guides/");
    const pageTitle = isHome
      ? `${pageData.title}: guides and API reference`
      : pageData.title
        ? `${pageData.title} | ${brand.name}`
        : `${brand.name} · ${brand.tagline}`;
    const description = pageData.description || siteData.description;
    const head: HeadConfig[] = [
      ["link", { rel: "canonical", href: canonical }],
      ["meta", { property: "og:type", content: isGuide ? "article" : "website" }],
      ["meta", { property: "og:site_name", content: brand.name }],
      ["meta", { property: "og:title", content: pageTitle }],
      ["meta", { property: "og:description", content: description }],
      ["meta", { property: "og:url", content: canonical }],
      ["meta", { property: "og:image", content: ogImage }],
      ["meta", { name: "twitter:card", content: "summary_large_image" }],
      ["meta", { name: "twitter:title", content: pageTitle }],
      ["meta", { name: "twitter:description", content: description }],
      ["meta", { name: "twitter:image", content: ogImage }],
    ];
    const jsonLd = structuredData({ isHome, isGuide, canonical, description, pageData });
    if (jsonLd) head.push(["script", { type: "application/ld+json" }, JSON.stringify(jsonLd)]);
    return head;
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
    siteTitle: brand.packageName,
    logo: {
      light: "/brand/icon-black.svg",
      dark: "/brand/icon-white.svg",
      alt: brand.name,
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
        text: "Guides",
        items: [
          { text: "Choosing a projection", link: "/guides/choosing-a-projection" },
          { text: "Rendering a choropleth map", link: "/guides/choropleth-map" },
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
    socialLinks: [{ icon: "github", link: brand.repository }],
    search: { provider: "local" },
    outline: { level: [2, 3] },
    footer: {
      message: "Released under the MIT License.",
      copyright: `Copyright © ${brand.organization.name}`,
    },
  },
});

interface StructuredDataInput {
  isHome: boolean;
  isGuide: boolean;
  canonical: string;
  description: string;
  pageData: { title: string; lastUpdated?: number; frontmatter: Record<string, unknown> };
}

// schema.org data for pages where it describes visible content: the package on
// the docs home, and each long-form guide as a technical article.
function structuredData({ isHome, isGuide, canonical, description, pageData }: StructuredDataInput) {
  const publisher = { "@type": "Organization", ...brand.organization };
  if (isHome) {
    return {
      "@context": "https://schema.org",
      "@type": "SoftwareSourceCode",
      name: brand.packageName,
      description,
      url: canonical,
      codeRepository: brand.repository,
      programmingLanguage: ["TypeScript", "JavaScript"],
      license: "https://opensource.org/licenses/MIT",
      author: publisher,
    };
  }
  if (isGuide) {
    return {
      "@context": "https://schema.org",
      "@type": "TechArticle",
      headline: pageData.title,
      description,
      url: canonical,
      mainEntityOfPage: canonical,
      image: ogImage,
      ...(pageData.frontmatter.date ? { datePublished: isoDate(pageData.frontmatter.date) } : {}),
      ...(pageData.lastUpdated ? { dateModified: new Date(pageData.lastUpdated).toISOString() } : {}),
      author: publisher,
      publisher,
      about: { "@type": "SoftwareSourceCode", name: brand.packageName, codeRepository: brand.repository },
    };
  }
  return undefined;
}

// YAML turns `date: 2026-10-18` into a Date, which reaches here as a Date or an
// ISO timestamp string; publish the calendar date only.
function isoDate(value: unknown): string {
  const text = value instanceof Date ? value.toISOString() : String(value);
  return /^\d{4}-\d{2}-\d{2}/.test(text) ? text.slice(0, 10) : text;
}
