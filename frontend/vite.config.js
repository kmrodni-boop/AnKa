import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true, // lytt på alle nettverksgrensesnitt, ikke bare localhost - nødvendig for å teste fra mobil på samme nettverk
    proxy: {
      '/api': 'http://localhost:5000'
    }
  }
})
