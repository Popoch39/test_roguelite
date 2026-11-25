import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  build: {
    // The Rapier build that loads everywhere carries its WebAssembly inline, about 3.4 MB.
    chunkSizeWarningLimit: 5000,
  },
});
