import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const environment = (globalThis as {
  process?: { env?: Record<string, string | undefined> };
}).process?.env;
const isTauriBuild = Boolean(environment?.TAURI_ENV_PLATFORM);
const isTestBuild = Boolean(environment?.VITEST);
const source = (path: string): string =>
  decodeURIComponent(new URL(path, import.meta.url).pathname).replace(/^\/([A-Za-z]:\/)/, "$1");

export default defineConfig(({ command }) => ({
  base: isTauriBuild ? "./" : command === "build" ? "/dots/" : "/",
  define: {
    __NATIVE_GAME_CORE__: JSON.stringify(isTauriBuild)
  },
  resolve: {
    alias: {
      "#game-core-backend": source(
        isTestBuild ? "./src/game/core-test.ts" : isTauriBuild ? "./src/game/core-native.ts" : "./src/game/core-web.ts"
      ),
      "#game-core-wasm": source("./src/wasm/game_core.js")
    }
  },
  build: {
    minify: "esbuild",
    sourcemap: false,
    target: "es2022"
  },
  worker: {
    format: "es"
  },
  plugins: [
    VitePWA({
      disable: isTauriBuild,
      registerType: "prompt",
      includeAssets: ["favicon-32.png", "icon-192.png", "icon-512.png", "icon-maskable-512.png", "apple-touch-icon.png"],
      manifest: {
        id: ".",
        name: "Dots",
        short_name: "Dots",
        description: "Classic Dots / Tochki surround-and-capture strategy game",
        theme_color: "#f4efe5",
        background_color: "#f4efe5",
        display: "standalone",
        orientation: "any",
        scope: ".",
        start_url: ".",
        categories: ["games"],
        icons: [
          {
            src: "icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "icon-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable"
          }
        ]
      },
      workbox: {
        cleanupOutdatedCaches: true,
        navigateFallback: "index.html",
        globPatterns: ["**/*.{js,css,html,png,svg,webp,wasm}"]
      }
    })
  ]
}));
