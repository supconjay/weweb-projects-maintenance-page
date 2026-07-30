import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// Paths are resolved from this file's own location, so the repo works wherever
// it is cloned. Alias targets must be absolute (Vite resolves a bare relative
// alias against the importer, not the config), hence fileURLToPath.
const here = (p) => fileURLToPath(new URL(p, import.meta.url))

export default defineConfig({
  plugins: [vue()],
  resolve: { alias: {
    '@pl-section': here('./src/wwSection.vue'),
    '@pl-config': here('./ww-config.js'),
  } },
  // server.fs.allow resolves relative entries against the Vite root (this folder);
  // '..' keeps sibling component folders reachable.
  server: { port: 5205, fs: { allow: ['..', '.'] } }
})
