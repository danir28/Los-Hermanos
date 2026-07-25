import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Config de Vitest para tests de componentes (Testing Library) de las dos apps de frontend.
// environment "jsdom" porque estos tests renderizan componentes React de verdad. Mismo plugin
// de React que usan vite.cliente.config.ts/vite.staff.config.ts (vía vite.shared.ts), para que
// el JSX se transforme igual acá que en dev/build. Replica también el alias "@" → "./src".
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    // Sin esto, Vitest también recorre server/ (que tiene sus propios *.test.ts, pensados para
    // correr con la config y el DATABASE_URL de server/vitest.config.ts, no con esta).
    include: ["src/**/*.test.{ts,tsx}"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
