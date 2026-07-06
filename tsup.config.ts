import { copyFileSync } from "node:fs";
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  external: ["react", "react-dom", "react/jsx-runtime"],
  // The optional stylesheet ships verbatim (exports["./styles.css"]).
  onSuccess: async () => {
    copyFileSync("src/styles.css", "dist/styles.css");
  },
});
