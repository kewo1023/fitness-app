import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // host: true expone el servidor a la red local. Sin esto, el Android
    // no puede abrir la app que corre en el Mac: "localhost" para el
    // celular significa el celular mismo, no este computador.
    host: true,
    port: 5173
  }
})
