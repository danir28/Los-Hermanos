import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as push from "../lib/push";
import { NotificationSetup } from "./NotificationSetup";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("NotificationSetup", () => {
  it("no renderiza nada si el navegador no soporta push", async () => {
    vi.spyOn(push, "isPushSupported").mockReturnValue(false);
    const { container } = render(<NotificationSetup token="t" />);
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  it("muestra el botón de activar cuando hay soporte pero todavía no hay suscripción", async () => {
    vi.spyOn(push, "isPushSupported").mockReturnValue(true);
    vi.spyOn(push, "getExistingSubscription").mockResolvedValue(null);
    render(<NotificationSetup token="t" />);
    expect(await screen.findByRole("button", { name: /Activar notificaciones/ })).toBeInTheDocument();
  });

  it("muestra el estado activado cuando ya existe una suscripción", async () => {
    vi.spyOn(push, "isPushSupported").mockReturnValue(true);
    vi.spyOn(push, "getExistingSubscription").mockResolvedValue({} as PushSubscription);
    render(<NotificationSetup token="t" />);
    expect(await screen.findByText("Notificaciones de pedidos activadas en este dispositivo")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Desactivar" })).toBeInTheDocument();
  });

  it("al activar con éxito, pasa a mostrar el estado activado", async () => {
    vi.spyOn(push, "isPushSupported").mockReturnValue(true);
    vi.spyOn(push, "getExistingSubscription").mockResolvedValue(null);
    const subscribeSpy = vi.spyOn(push, "subscribeToKitchenPush").mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<NotificationSetup token="token-abc" />);

    await user.click(await screen.findByRole("button", { name: /Activar notificaciones/ }));

    expect(subscribeSpy).toHaveBeenCalledWith("token-abc");
    expect(await screen.findByText("Notificaciones de pedidos activadas en este dispositivo")).toBeInTheDocument();
  });

  it("si falla la activación (ej. permiso rechazado), muestra el error y no cambia el estado", async () => {
    vi.spyOn(push, "isPushSupported").mockReturnValue(true);
    vi.spyOn(push, "getExistingSubscription").mockResolvedValue(null);
    vi.spyOn(push, "subscribeToKitchenPush").mockRejectedValue(new Error("No se otorgó el permiso de notificaciones"));
    const user = userEvent.setup();
    render(<NotificationSetup token="t" />);

    await user.click(await screen.findByRole("button", { name: /Activar notificaciones/ }));

    expect(await screen.findByText("No se otorgó el permiso de notificaciones")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Activar notificaciones/ })).toBeInTheDocument();
  });

  it("al desactivar, vuelve a mostrar el botón de activar", async () => {
    vi.spyOn(push, "isPushSupported").mockReturnValue(true);
    vi.spyOn(push, "getExistingSubscription").mockResolvedValue({} as PushSubscription);
    const unsubscribeSpy = vi.spyOn(push, "unsubscribeFromKitchenPush").mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<NotificationSetup token="token-abc" />);

    await user.click(await screen.findByRole("button", { name: "Desactivar" }));

    expect(unsubscribeSpy).toHaveBeenCalledWith("token-abc");
    expect(await screen.findByRole("button", { name: /Activar notificaciones/ })).toBeInTheDocument();
  });
});
