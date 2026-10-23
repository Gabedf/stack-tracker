/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { jsonStoragePlugin } from './server/jsonStoragePlugin'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), jsonStoragePlugin()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
})
