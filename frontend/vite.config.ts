import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// In development, /api calls are forwarded to the Spring Boot backend so no CORS setup is needed.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: process.env.VITE_API_TARGET ?? "http://localhost:8080",
        changeOrigin: true,
      },
    },
  },
});
