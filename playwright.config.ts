import { defineConfig, devices } from "@playwright/test";

// Puertos DEDICADOS a Playwright, distintos de los reales (5173/5174/4000) a propósito: si
// Playwright reusara un dev server que ya está corriendo en los puertos reales, los tests
// terminarían escribiendo en la base de datos de DESARROLLO en vez de en los_hermanos_test —
// exactamente lo que esta suite tiene que evitar. reuseExistingServer: false en los 3
// webServer de abajo refuerza lo mismo: si por algún motivo el puerto ya está ocupado por otra
// cosa, Playwright falla en vez de asumir en silencio que es "nuestro" servidor.
const BACKEND_URL = "http://localhost:4001";
const CLIENTE_URL = "http://localhost:5273";
const STAFF_URL = "http://localhost:5274";

export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: false,
  reporter: "list",
  timeout: 30_000,
  webServer: [
    {
      command: "npx dotenv -e .env.test -- npm run dev",
      cwd: "./server",
      url: `${BACKEND_URL}/api/health`,
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      command: "npm run dev -- --port 5273 --strictPort",
      url: CLIENTE_URL,
      reuseExistingServer: false,
      timeout: 30_000,
      env: { VITE_API_URL: BACKEND_URL },
    },
    {
      command: "npm run dev:staff -- --port 5274 --strictPort",
      url: STAFF_URL,
      reuseExistingServer: false,
      timeout: 30_000,
      env: { VITE_API_URL: BACKEND_URL },
    },
  ],
  projects: [
    {
      name: "cliente",
      testMatch: /cliente-.*\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], baseURL: CLIENTE_URL },
    },
    {
      name: "staff",
      testMatch: /(recepcion|cocina|admin)-.*\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], baseURL: STAFF_URL },
    },
  ],
});
