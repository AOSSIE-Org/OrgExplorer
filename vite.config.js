import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { vitest } from "vitest";
import svgr from "vite-plugin-svgr";

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), svgr()],
  base: "/",
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test/setup.js",
  },
}));
