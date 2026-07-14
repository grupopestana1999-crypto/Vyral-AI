import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { writeFileSync } from 'node:fs'

// E65 dia 5: pinar o timestamp do build tanto no bundle (via `define`) quanto
// num arquivo estático (public/version.json — atualizado no bundle final via
// hook writeBundle). Frontend usa isso pra detectar quando a aba do user tá
// rodando bundle antigo depois de um deploy Railway.
const BUILD_TS = Date.now()

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'vyral-version-json',
      apply: 'build',
      writeBundle(_opts, _bundle) {
        const outDir = _opts.dir ?? 'dist'
        writeFileSync(
          path.join(outDir, 'version.json'),
          JSON.stringify({ ts: BUILD_TS }, null, 2),
        )
      },
    },
  ],
  define: {
    __BUILD_TS__: JSON.stringify(BUILD_TS),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
