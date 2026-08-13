import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "../lib/api";
import type { CartItem } from "../types";
import { CustomerCart } from "./CustomerCart";

const CART: CartItem[] = [{ id: "1", productId: 1, name: "Empanada de carne", price: 1500, qty: 2, image: "" }];

afterEach(() => {
  vi.restoreAllMocks();
});

async function setup(isOpenNow: boolean | null = true) {
  vi.spyOn(api, "ordersSlots").mockResolvedValue([
    { time: "19:00", taken: 0, capacity: 4, tooSoon: false, available: true },
  ]);
  // CustomerCart ahora consulta el catálogo (useProducts) para calcular descuentos por paquete
  // (ver computeBundleDiscounts) — vacío acá porque ninguno de estos tests ejercita esa regla.
  vi.spyOn(api, "productsList").mockResolvedValue([]);
  const onConfirm = vi.fn();
  const onUpdateCart = vi.fn();
  const onUpdateNotes = vi.fn();
  const user = userEvent.setup();
  render(<CustomerCart cart={CART} onUpdateCart={onUpdateCart} onUpdateNotes={onUpdateNotes} onConfirm={onConfirm} isOpenNow={isOpenNow} />);
  await screen.findByRole("button", { name: "19:00" });
  return { onConfirm, onUpdateCart, onUpdateNotes, user };
}

// Las tres condiciones (nombre + teléfono + horario) ya eran obligatorias acá desde antes de
// esta sesión (a diferencia de la carga manual de recepción/cocina, que se alineó recién ahora)
// — este test confirma que ese comportamiento existente sigue intacto.
describe("CustomerCart — validación obligatoria", () => {
  it("el botón de confirmar arranca disabled sin nombre/teléfono/horario", async () => {
    await setup();
    expect(screen.getByRole("button", { name: "Confirmar Pedido" })).toBeDisabled();
  });

  it("sigue disabled con nombre + teléfono pero sin horario elegido", async () => {
    const { user } = await setup();
    await user.type(screen.getByPlaceholderText("Juan García"), "María López");
    await user.type(screen.getByPlaceholderText("1123456789"), "1155667788");
    expect(screen.getByRole("button", { name: "Confirmar Pedido" })).toBeDisabled();
  });

  it("habilita el botón con las 3 condiciones y llama a onConfirm con los datos", async () => {
    const { onConfirm, user } = await setup();
    await user.type(screen.getByPlaceholderText("Juan García"), "María López");
    await user.type(screen.getByPlaceholderText("1123456789"), "1155667788");
    await user.click(screen.getByRole("button", { name: "19:00" }));

    const confirmButton = screen.getByRole("button", { name: "Confirmar Pedido" });
    expect(confirmButton).toBeEnabled();
    await user.click(confirmButton);

    expect(onConfirm).toHaveBeenCalledWith("María López", "1155667788", "19:00", []);
  });

  it("queda disabled si el local está cerrado, aunque los 3 campos estén completos", async () => {
    const { user } = await setup(false);
    await user.type(screen.getByPlaceholderText("Juan García"), "María López");
    await user.type(screen.getByPlaceholderText("1123456789"), "1155667788");
    await user.click(screen.getByRole("button", { name: "19:00" }));

    expect(screen.getByRole("button", { name: "Local cerrado" })).toBeDisabled();
  });
});
