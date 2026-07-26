import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { figmaAssetResolver, sharedConfig } from './vite.shared'

// App privada de staff (recepción/cocina/admin, detrás de login). Build y dev
// server separados de la app de cliente: al tener una sola entrada que solo
// importa (transitivamente) AppStaff, es estructuralmente imposible que este
// bundle incluya código de cliente, y viceversa — no depende de que Rollup
// optimice bien un grafo compartido.
export default defineConfig({
  ...sharedConfig,
  // Propio de esta app (no "public/" a secas, compartido con cliente): solo trae
  // _redirects, que le dice a Netlify que sirva index.staff.html para cualquier ruta —
  // sin esto, el build genera dist-staff/index.staff.html (no index.html), y Netlify
  // no encuentra nada que servir en "/" y muestra su 404 genérico.
  publicDir: 'public-staff',
  plugins: [
    figmaAssetResolver(),
    react(),
    tailwindcss(),
    {
      // Vite dev server siempre sirve index.html en "/" por default —
      // rollupOptions.input solo aplica a "vite build", no al dev server. Sin esto,
      // "npm run dev:staff" mostraría la app de cliente en la raíz y solo llegaría a
      // la de staff entrando manualmente a /index.staff.html.
      name: 'staff-dev-entry-redirect',
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          if (req.url === '/') req.url = '/index.staff.html'
          next()
        })
      },
    },
  ],
  server: {
    port: 5174,
  },
  build: {
    outDir: 'dist-staff',
    rollupOptions: {
      input: 'index.staff.html',
    },
  },
})
