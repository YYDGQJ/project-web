import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

export default defineConfig({
  resolve: {
    alias: {
      'lottie-web': fileURLToPath(new URL('./src/common/noop-lottie.ts', import.meta.url))
    }
  },
  plugins: [
    vue(),
    AutoImport({
      resolvers: [ElementPlusResolver()],
      dts: 'src/auto-imports.d.ts'
    }),
    Components({
      resolvers: [ElementPlusResolver()],
      dts: 'src/components.d.ts'
    })
  ],
  envPrefix: ['VITE_', 'API_'],
  build: {
    cssMinify: 'esbuild',
    chunkSizeWarningLimit: 2500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return
          }

          if (id.includes('@visactor/vtable')) {
            return 'vendor-vtable'
          }

          if (id.includes('element-plus')) {
            return 'vendor-element-plus'
          }

          if (id.includes('exceljs')) {
            return 'vendor-exceljs'
          }

          if (id.includes('sortablejs')) {
            return 'vendor-sortable'
          }

          if (id.includes('axios')) {
            return 'vendor-axios'
          }

          if (id.includes('vue-router')) {
            return 'vendor-router'
          }

          if (id.includes('/vue/') || id.includes('@vue/')) {
            return 'vendor-vue'
          }
        }
      }
    }
  },
  server: {
    host: '0.0.0.0',
    port: 4173,
    proxy: {
      '/api': {
        // target: 'http://192.168.1.105:3080',
        target: 'http://localhost:3080',
        changeOrigin: true
      }
    }
  }
})
