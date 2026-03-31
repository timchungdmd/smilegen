import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return undefined;
          }

          if (id.includes("/three/examples/")) {
            return "vendor-three-examples";
          }

          if (id.includes("/three/")) {
            return "vendor-three-core";
          }

          if (
            id.includes("/@react-three/fiber/") ||
            id.includes("/@react-three/drei/") ||
            id.includes("/react-reconciler/")
          ) {
            return "vendor-react-three";
          }

          return undefined;
        }
      }
    }
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.ts"
  }
});
