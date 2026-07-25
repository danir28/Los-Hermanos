import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";

// Sin esto, cada render() dentro de un it() se acumula en document.body en vez de
// desmontarse — no usamos `test.globals: true` (los archivos importan describe/it/expect
// explícitamente de "vitest"), así que Testing Library no engancha su propio afterEach solo.
afterEach(() => {
  cleanup();
});
