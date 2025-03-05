import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    port: 8083,
    host: true,
    strictPort: true,
    watch: {
      usePolling: true
    }
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    exclude: ['batch', 'emitter']
  },
  build: {
    rollupOptions: {
      external: ['batch', 'emitter']
    }
  },
  define: {
    'process.env': {},
    global: {},
  },
});
