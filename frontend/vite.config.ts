import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Split heavy, independent pieces into their own chunks so the main app
        // bundle is smaller and each piece caches independently between deploys.
        manualChunks(id) {
          // The India GeoJSON is ~23MB on its own; isolate it so it never bloats
          // the main app chunk and is cached separately from app code.
          if (id.includes("assets/india.json")) return "india-geo";
          if (id.includes("node_modules")) {
            if (id.includes("recharts") || id.includes("/d3-")) return "charts";
            if (id.includes("@dnd-kit")) return "dnd";
            // Keep the whole React ecosystem together so there is exactly one
            // React/context instance — splitting these risks runtime errors.
            if (
              /[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|react-redux|@reduxjs[\\/]toolkit|scheduler|redux)[\\/]/.test(
                id,
              )
            ) {
              return "react-vendor";
            }
          }
          return undefined;
        },
      },
    },
  },
});

