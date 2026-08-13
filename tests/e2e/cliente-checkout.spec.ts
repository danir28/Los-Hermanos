import { expect, test } from "@playwright/test";
import { TEST_PRODUCT } from "./fixtures.js";

// Camino feliz del checkout online: menú → agregar producto → carrito → completar los 3 campos
// obligatorios (nombre + teléfono + horario, ver ReceptionistCreateOrder/CustomerCart de la
// sesión anterior) → confirmar → ver la confirmación → seguir el estado del pedido.
test("un cliente puede completar un pedido de punta a punta", async ({ page }) => {
  await page.goto("/");

  await page.getByTestId("nav-menu").click();
  await page.getByRole("button", { name: "Agregar" }).click();
  await page.getByRole("button", { name: /Ver carrito/ }).click();

  await page.getByPlaceholder("Juan García").fill("Cliente E2E");
  await page.getByPlaceholder("1123456789").fill("1155550001");

  // El primer turno HABILITADO de la grilla (no importa cuál sea exactamente — depende de la
  // hora real en que corre la suite, ver la misma lógica en server/src/orders/service.test.ts).
  const slot = page.locator("button:not([disabled])").filter({ hasText: /^\d{2}:\d{2}$/ }).first();
  await expect(slot).toBeVisible();
  await slot.click();

  await page.getByTestId("confirm-order").click();

  await expect(page.getByRole("heading", { name: "¡Pedido recibido!" })).toBeVisible();
  await expect(page.getByText(TEST_PRODUCT.name)).toBeVisible();

  await page.getByRole("button", { name: "Seguir estado del pedido" }).click();
  // CustomerTracking recibe el pedido precargado (preloadOrder) desde la confirmación, así que
  // salta directo a la vista de resultado — el <h1>Seguimiento</h1> del formulario de búsqueda
  // no llega a renderizarse en este camino.
  await expect(page.getByText("Progreso del pedido")).toBeVisible();
});
