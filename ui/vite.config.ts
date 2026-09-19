import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'node:fs'
import path from 'node:path'

// The backend serves assets at /assets/<file> from public/assets/<file>.
// With base '/assets/' and vite's default assetsDir ('assets') emitted URLs would be
// /assets/assets/<file>, which the PHP router cannot serve. Build flat (assetsDir '')
// so index.html references /assets/<file>, then relocate the emitted JS/CSS from the
// outDir root into <outDir>/assets. index.php and other backend files are untouched.
function relocateAssets(): Plugin {
  return {
    name: 'relocate-assets',
    apply: 'build',
    writeBundle(options, bundle) {
      if (!options.dir) return
      for (const [fileName, item] of Object.entries(bundle)) {
        if (item.type === 'chunk' || item.type === 'asset') {
          if (fileName.endsWith('.html')) continue
          const from = path.resolve(options.dir, fileName)
          const to = path.join(path.resolve(options.dir, 'assets'), path.basename(fileName))
          fs.mkdirSync(path.dirname(to), { recursive: true })
          fs.renameSync(from, to)
        }
      }
    },
  }
}

export default defineConfig({
  base: '/assets/',
  plugins: [react(), tailwindcss(), relocateAssets()],
  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname,
    },
  },
  build: {
    assetsDir: '',
    outDir: '../public',
    emptyOutDir: false,
  },
  publicDir: false,
  server: {
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
})
