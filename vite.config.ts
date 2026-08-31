import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ command }) => ({
  base: command === "build" ? "/dots/" : "/",
  plugins: [
    VitePWA({
      registerType: "prompt",
      includeAssets: ["icon.svg", "pwa-192.png", "apple-touch-icon.png"],
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
            src: "pwa-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any maskable"
          }
        ]
      },
      workbox: {
        cleanupOutdatedCaches: true,
        navigateFallback: "index.html",
        globPatterns: ["**/*.{js,css,html,png,svg,webp}"]
      }
    })
  ]
}));
