import path from 'path'

// Resuelve los imports "figma:asset/*" que vinieron del export de Figma Make a
// src/assets/*. Extraído acá porque lo necesitan las dos apps (cliente y staff).
export function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id: string) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

// Config común a las dos apps: alias "@" y los tipos de archivo habilitados para
// imports "raw". Nunca agregar .css/.tsx/.ts a assetsInclude.
export const sharedConfig = {
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  assetsInclude: ['**/*.svg', '**/*.csv'],
}
