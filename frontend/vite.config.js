import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, configDefaults } from 'vitest/config'
import sitio from './vite-plugin-sitio'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), sitio()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
    css: false,
    exclude: [...configDefaults.exclude, 'e2e/**'], // las pruebas de punta a punta las corre Playwright
  },
})
