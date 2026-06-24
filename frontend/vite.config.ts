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
        manualChunks(id) {
          // ONLY isolate the ~23MB India GeoJSON (pure data, no React) so it stays
          // out of the main app chunk and caches separately.
          //
          // Do NOT split vendor libs (recharts/react/dnd) into separate chunks:
          // separating React-dependent code from React breaks chunk init order and
          // throws "Cannot read properties of undefined (reading 'forwardRef')" at
          // runtime (blank page). Everything except india.json uses Vite's default
          // chunking, which keeps React and its dependents together.
          if (id.includes("assets/india.json")) return "india-geo";
          return undefined;
        },
      },
    },
  },
});

