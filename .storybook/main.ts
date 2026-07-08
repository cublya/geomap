import { fileURLToPath } from "node:url";
import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  framework: "@storybook/react-vite",
  stories: ["../stories/**/*.stories.tsx", "../stories/**/*.mdx"],
  addons: ["@storybook/addon-a11y", "@storybook/addon-docs"],
  staticDirs: [],
  async viteFinal(viteConfig) {
    viteConfig.resolve ??= {};
    // Stories import the package by its public name; alias it to the source so
    // the demo site always tracks the working tree (same public surface).
    viteConfig.resolve.alias = [
      {
        find: /^@cublya\/geomap\/styles\.css$/,
        replacement: fileURLToPath(new URL("../src/styles.css", import.meta.url)),
      },
      {
        find: /^@cublya\/geomap$/,
        replacement: fileURLToPath(new URL("../src/index.ts", import.meta.url)),
      },
    ];
    return viteConfig;
  },
};

export default config;
