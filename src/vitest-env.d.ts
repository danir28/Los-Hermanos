// Trae los matchers de @testing-library/jest-dom (toBeInTheDocument, toBeDisabled, etc.) al
// tipado de `expect` de Vitest para los archivos *.test.tsx bajo src/ — vitest.setup.ts hace lo
// mismo en runtime, pero vive fuera de "src" (ver tsconfig.node.json) y por eso no alcanza para
// el typecheck de este proyecto (tsconfig.json solo incluye "src").
import "@testing-library/jest-dom/vitest";
