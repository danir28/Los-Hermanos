import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api, type SlotAvailability } from "../../lib/api";
import { SlotPicker } from "./SlotPicker";

afterEach(() => {
  vi.restoreAllMocks();
});

function makeSlots(overrides: Partial<SlotAvailability>[]): SlotAvailability[] {
  return overrides.map((o, i) => ({
    time: `19:${String(i * 5).padStart(2, "0")}`,
    taken: 0,
    capacity: 4,
    tooSoon: false,
    available: true,
    ...o,
  }));
}

describe("SlotPicker", () => {
  it("muestra el estado de carga mientras espera la respuesta del backend", () => {
    vi.spyOn(api, "ordersSlots").mockReturnValue(new Promise(() => {})); // nunca resuelve
    render(<SlotPicker value={null} onChange={() => {}} />);
    expect(screen.getByText(/Cargando horarios/i)).toBeInTheDocument();
  });

  it("muestra un error si falla la carga de disponibilidad", async () => {
    vi.spyOn(api, "ordersSlots").mockRejectedValue(new Error("network error"));
    render(<SlotPicker value={null} onChange={() => {}} />);
    expect(await screen.findByText(/No se pudo cargar la disponibilidad/i)).toBeInTheDocument();
  });

  it("deshabilita los turnos sin cupo y deja elegibles los disponibles", async () => {
    const slots = makeSlots([
      { time: "19:00", available: true },
      { time: "19:05", available: false, taken: 4, capacity: 4 },
    ]);
    vi.spyOn(api, "ordersSlots").mockResolvedValue(slots);
    render(<SlotPicker value={null} onChange={() => {}} />);

    const available = await screen.findByRole("button", { name: "19:00" });
    const full = screen.getByRole("button", { name: "19:05" });
    expect(available).not.toBeDisabled();
    expect(full).toBeDisabled();
  });

  it("llama a onChange con el horario elegido al clickear un turno disponible", async () => {
    const user = userEvent.setup();
    const slots = makeSlots([{ time: "19:00", available: true }]);
    vi.spyOn(api, "ordersSlots").mockResolvedValue(slots);
    const onChange = vi.fn();
    render(<SlotPicker value={null} onChange={onChange} />);

    const button = await screen.findByRole("button", { name: "19:00" });
    await user.click(button);
    expect(onChange).toHaveBeenCalledWith("19:00");
  });

  it('muestra "Elegí un horario para continuar" cuando es obligatorio y no hay valor elegido', async () => {
    vi.spyOn(api, "ordersSlots").mockResolvedValue(makeSlots([{ time: "19:00" }]));
    render(<SlotPicker value={null} onChange={() => {}} required />);
    await waitFor(() => expect(screen.getByText(/Elegí un horario/i)).toBeInTheDocument());
  });

  it("no muestra el mensaje de obligatoriedad cuando required es false", async () => {
    vi.spyOn(api, "ordersSlots").mockResolvedValue(makeSlots([{ time: "19:00" }]));
    render(<SlotPicker value={null} onChange={() => {}} required={false} />);
    await screen.findByRole("button", { name: "19:00" });
    expect(screen.queryByText(/Elegí un horario/i)).not.toBeInTheDocument();
  });

  it("vuelve a pedir disponibilidad cuando cambia refreshSignal", async () => {
    const spy = vi.spyOn(api, "ordersSlots").mockResolvedValue(makeSlots([{ time: "19:00" }]));
    const { rerender } = render(<SlotPicker value={null} onChange={() => {}} refreshSignal={1} />);
    await screen.findByRole("button", { name: "19:00" });
    expect(spy).toHaveBeenCalledTimes(1);

    rerender(<SlotPicker value={null} onChange={() => {}} refreshSignal={2} />);
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(2));
  });
});
