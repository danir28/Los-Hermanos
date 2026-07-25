import { defineConfig } from "vitest/config";

// Config de Vitest para el backend. environment "node" (no hay DOM acá). testTimeout más
// alto que el default (5s) porque los tests de concurrencia de createOrder (orders/service)
// disparan varios requests en paralelo contra Postgres real. DATABASE_URL/JWT_SECRET/etc. ya
// tienen que estar en process.env antes de que arranque Vitest — ver el script "test" en
// package.json, que los inyecta con dotenv-cli desde .env.test antes de invocar este binario.
// fileParallelism: false porque varios archivos de test comparten la misma base de test y se
// truncan tablas (Order/OrderCounter) en afterEach — si Vitest corriera dos archivos en
// paralelo, el afterEach de uno podría borrar datos que el otro todavía está usando.
export default defineConfig({
  test: {
    environment: "node",
    testTimeout: 15_000,
    hookTimeout: 15_000,
    fileParallelism: false,
  },
});
