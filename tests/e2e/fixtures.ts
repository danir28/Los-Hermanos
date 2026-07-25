// Credenciales de las cuentas de staff de test, sembradas por global-setup.ts contra
// los_hermanos_test — compartidas acá para que los specs no repitan los literales.
export const TEST_USERS = {
  recepcionista: { usuario: "recepcion_test", password: "clave-test", rol: "recepcionista" },
  cocina: { usuario: "cocina_test", password: "clave-test", rol: "cocina" },
  admin: { usuario: "admin_test", password: "clave-test", rol: "admin" },
} as const;

// Producto de catálogo sembrado por global-setup.ts — la tabla Product de los_hermanos_test
// arranca vacía (no hay fixture/seed de catálogo todavía), así que los specs que necesitan
// agregar algo al carrito dependen de que exista al menos este producto.
export const TEST_PRODUCT = {
  name: "Empanada de carne (test)",
  category: "Empanadas",
  price: 1500,
  description: "Producto sembrado para los tests E2E.",
  image: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7",
  featured: false,
  active: true,
  outOfStock: false,
};
