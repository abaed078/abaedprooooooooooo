import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@workspace/api-client-react": path.resolve(import.meta.dirname, "lib/api-client-react/src/index.ts"),
    },
  },
  server: {
    port: parseInt(process.env.PORT || "5000", 10),
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
