import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { OrderStatus } from "../../types";
import { StatusBadge } from "./StatusBadge";

describe("StatusBadge", () => {
  it("muestra la etiqueta correspondiente a cada estado", () => {
    const statuses: OrderStatus[] = ["Programado", "En preparación", "Listo para retirar", "Entregado", "Cancelado"];
    for (const status of statuses) {
      const { unmount } = render(<StatusBadge status={status} />);
      expect(screen.getByText(status)).toBeInTheDocument();
      unmount();
    }
  });
});
