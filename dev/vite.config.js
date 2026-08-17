import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// The harness lives in dev/ so that none of its tooling ends up in the root
// package.json — WeWeb's importer installs the root devDependencies and only
// accepts @weweb/cli there. Paths resolve from this file's own location, so the
// repo works wherever it is cloned. Alias targets must be absolute (Vite resolves
// a bare relative alias against the importer, not the config), hence fileURLToPath.
const here = (p) => fileURLToPath(new URL(p, import.meta.url))

export default defineConfig({
  root: here('.'),
  plugins: [vue()],
  resolve: { alias: {
    '@pl-section': here('../src/wwSection.vue'),
    '@pl-config': here('../ww-config.js'),
  } },
  // The section source sits one level up, so the dev server must be allowed to
  // read outside its root.
  server: { port: 5205, fs: { allow: [here('..')] } },
})
