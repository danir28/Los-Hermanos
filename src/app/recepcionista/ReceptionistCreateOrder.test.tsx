import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "../lib/api";
import type { Product } from "../types";
import { ReceptionistCreateOrder } from "./ReceptionistCreateOrder";

const PRODUCT: Product = {
  id: 1, name: "Empanada de carne", category: "Empanadas", price: 1500,
  description: "", images: [], optionGroups: [], featured: false, active: true, outOfStock: false,
};

afterEach(() => {
  vi.restoreAllMocks();
});

async function addProductToCart(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByTestId(`add-product-${PRODUCT.id}`));
}

async function setup() {
  vi.spyOn(api, "productsList").mockResolvedValue([PRODUCT]);
  vi.spyOn(api, "ordersSlots").mockResolvedValue([
    { time: "19:00", taken: 0, capacity: 4, tooSoon: false, available: true },
  ]);
  const onConfirm = vi.fn();
  const user = userEvent.setup();
  render(<ReceptionistCreateOrder onConfirm={onConfirm} />);
  await screen.findByText("Empanada de carne");
  return { onConfirm, user };
}

// Las cuatro condiciones (producto + nombre + teléfono + horario) son obligatorias sin
// excepción desde el cambio de la sesión anterior (antes el horario era opcional acá, con una
// excepción documentada para cuando no había turnos libres) — estos tests cubren exactamente eso.
describe("ReceptionistCreateOrder — validación obligatoria", () => {
  it("el botón de confirmar arranca disabled sin ningún dato cargado", async () => {
    await setup();
    expect(screen.getByRole("button", { name: "Confirmar Pedido" })).toBeDisabled();
  });

  it("sigue disabled con producto + nombre + teléfono pero SIN horario elegido", async () => {
    const { user } = await setup();
    await addProductToCart(user);
    await user.type(screen.getByPlaceholderText("Nombre completo"), "Juan Pérez");
    await user.type(screen.getByPlaceholderText("Teléfono"), "1122334455");

    expect(screen.getByRole("button", { name: "Confirmar Pedido" })).toBeDisabled();
  });

  it("habilita el botón recién con las 4 condiciones, y llama a onConfirm con el horario elegido", async () => {
    const { onConfirm, user } = await setup();
    await addProductToCart(user);
    await user.type(screen.getByPlaceholderText("Nombre completo"), "Juan Pérez");
    await user.type(screen.getByPlaceholderText("Teléfono"), "1122334455");

    const slotButton = await screen.findByRole("button", { name: "19:00" });
    await user.click(slotButton);

    const confirmButton = screen.getByRole("button", { name: "Confirmar Pedido" });
    expect(confirmButton).toBeEnabled();
    await user.click(confirmButton);

    // handleConfirm espera 1.2s (animación de "¡Pedido registrado!") antes de llamar a onConfirm.
    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ customer: "Juan Pérez", phone: "1122334455", estimatedTime: "19:00" })
    ), { timeout: 2000 });
  });
});
