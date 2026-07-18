import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { figmaAssetResolver, sharedConfig } from './vite.shared'

// App pública de clientes (sin login, sin código de staff). Sin overrides de
// entrada/salida: se comporta exactamente igual que el vite.config.ts original,
// para que el sitio de Netlify ya desplegado no necesite ningún cambio de
// configuración en su dashboard.
export default defineConfig({
  ...sharedConfig,
  plugins: [
    figmaAssetResolver(),
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
})
