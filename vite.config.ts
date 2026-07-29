import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";

const RAZORPAY_KEY_ID =
  process.env.RAZORPAY_KEY_ID ||
  process.env.VITE_RAZORPAY_KEY_ID ||
  process.env.VITE_RAZORPAY_KEY ||
  "rzp_live_TIsdLWzr1fzNQd";

export default defineConfig({
  plugins: [
    tailwindcss(),
    tsconfigPaths({ projects: ["./tsconfig.json"] }),
    tanstackStart({
      server: { entry: "server" },
      importProtection: {
        behavior: "error",
        client: {
          files: ["**/server/**"],
          specifiers: ["server-only"],
        },
      },
    }),
    nitro({
      defaultPreset: "cloudflare-module",
    }),
    react(),
  ],
  define: {
    "process.env.RAZORPAY_KEY_ID": JSON.stringify(RAZORPAY_KEY_ID),
    "process.env.VITE_RAZORPAY_KEY_ID": JSON.stringify(RAZORPAY_KEY_ID),
    "process.env.VITE_RAZORPAY_KEY": JSON.stringify(RAZORPAY_KEY_ID),
  },
  css: {
    transformer: "lightningcss",
  },
  resolve: {
    alias: {
      "@": `${process.cwd()}/src`,
    },
    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "@tanstack/react-query",
      "@tanstack/query-core",
    ],
  },
  ssr: {
    external: ["playwright", "playwright-core", "chromium-bidi"],
  },
  build: {
    minify: false,
    sourcemap: false,
    rollupOptions: {
      external: ["playwright", "playwright-core", "chromium-bidi"],
    },
  },
  server: {
    host: "::",
    port: 8080,
  },
});
