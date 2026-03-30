import path from "path";
import fs from "fs";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

/**
 * Copies Cloudflare Pages config files (_redirects, _headers)
 * into the build output directory so they're deployed with the site.
 */
function cloudflarePagesCopy(): Plugin {
  return {
    name: "cloudflare-pages-copy",
    closeBundle() {
      const distDir = path.resolve(__dirname, "dist");
      for (const file of ["_redirects", "_headers"]) {
        const src = path.resolve(__dirname, file);
        const dest = path.resolve(distDir, file);
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, dest);
        }
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), cloudflarePagesCopy()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      lexical: path.resolve(__dirname, "./node_modules/lexical/Lexical.mjs"),
    },
  },
  build: {
    outDir: "dist",
    sourcemap: false,
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3100",
        ws: true,
      },
    },
  },
});
