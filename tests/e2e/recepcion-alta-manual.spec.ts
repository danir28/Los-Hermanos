import { expect, test } from "@playwright/test";
import { TEST_USERS } from "./fixtures.js";

// Camino feliz de la carga manual de recepción: login → Nuevo Pedido → confirmar sin horario
// debe seguir disabled (la regla "sí o sí horario + nombre + teléfono" de la sesión anterior,
// ver ReceptionistCreateOrder.tsx) → completar y confirmar → el pedido aparece en Lista de Pedidos.
test("recepción puede cargar un pedido manual completo y lo ve en la lista", async ({ page }) => {
  const phone = `115550${Date.now().toString().slice(-4)}`;
  const customer = "Cliente Alta Manual E2E";

  await page.goto("/");
  await page.locator('input[type="text"]').fill(TEST_USERS.recepcionista.usuario);
  await page.locator('input[type="password"]').fill(TEST_USERS.recepcionista.password);
  await page.getByRole("button", { name: "Ingresar" }).click();

  await expect(page.getByRole("heading", { name: "Bienvenida" })).toBeVisible();

  await page.getByTestId("nav-tab-create").click();
  await page.locator('[data-testid^="add-product-"]').first().click();
  await page.getByPlaceholder("Nombre completo").fill(customer);
  await page.getByPlaceholder("Teléfono").fill(phone);

  const confirmButton = page.getByTestId("confirm-order");
  await expect(confirmButton).toBeDisabled();

  const slot = page.locator("button:not([disabled])").filter({ hasText: /^\d{2}:\d{2}$/ }).first();
  await expect(slot).toBeVisible();
  await slot.click();
  await expect(confirmButton).toBeEnabled();

  await confirmButton.click();
  // handleConfirm espera 1.2s (animación de "¡Pedido registrado!") y recién ahí vuelve al dashboard.
  await expect(page.getByRole("heading", { name: "Bienvenida" })).toBeVisible({ timeout: 5_000 });

  await page.getByTestId("nav-tab-orders").click();
  // El teléfono es único por corrida (Date.now()), el nombre no — si la suite ya corrió antes
  // hoy, puede haber otra fila con el mismo "customer". Se scopea por teléfono para no chocar
  // con un "strict mode violation" de Playwright ante múltiples matches del nombre.
  const row = page.getByRole("row").filter({ hasText: phone });
  await expect(row).toBeVisible();
  await expect(row.getByText(customer)).toBeVisible();
});
