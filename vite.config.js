import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { vitest } from "vitest";
import svgr from "vite-plugin-svgr";
import { copyFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

/**
 * GitHub Pages serves static files only — it has no rewrite rule to map client-side
 * routes back to the app shell. So a direct visit to (or a reload of) a route such as
 * /overview or /contributors requests a file that does not exist on disk and Pages
 * returns its default "File not found" page instead of the app.
 *
 * Emitting 404.html as a copy of index.html is the documented workaround: Pages serves
 * that file for any unmatched path, the app boots, and React Router resolves the route
 * from window.location. The URL is preserved, so there is no redirect and no flash.
 */
function spaDeepLinkFallback() {
  let outDir;

  return {
    name: "spa-deep-link-fallback",
    apply: "build",
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      const indexHtml = resolve(outDir, "index.html");
      if (existsSync(indexHtml)) {
        copyFileSync(indexHtml, resolve(outDir, "404.html"));
      }
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), svgr(), spaDeepLinkFallback()],
  base: "/",
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test/setup.js",
  },
}));
