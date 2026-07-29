import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const RAZORPAY_KEY_ID =
  process.env.RAZORPAY_KEY_ID ||
  process.env.VITE_RAZORPAY_KEY_ID ||
  process.env.VITE_RAZORPAY_KEY ||
  "rzp_live_TIsdLWzr1fzNQd";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    define: {
      "process.env.RAZORPAY_KEY_ID": JSON.stringify(RAZORPAY_KEY_ID),
      "process.env.VITE_RAZORPAY_KEY_ID": JSON.stringify(RAZORPAY_KEY_ID),
      "process.env.VITE_RAZORPAY_KEY": JSON.stringify(RAZORPAY_KEY_ID),
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
  },
});
