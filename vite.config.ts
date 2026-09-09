import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const apiPort = process.env.VITE_API_PORT || "4000";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: { "/api": `http://127.0.0.1:${apiPort}` },
  },
});
