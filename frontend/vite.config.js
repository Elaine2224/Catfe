import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// El "proxy" hace que las llamadas a /api desde React lleguen al backend (puerto 5000)
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:5000",
    },
  },
});
