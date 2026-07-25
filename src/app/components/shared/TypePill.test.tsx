import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { OrderType } from "../../types";
import { TypePill } from "./TypePill";

describe("TypePill", () => {
  it("muestra el texto del canal para cada tipo de pedido", () => {
    const types: OrderType[] = ["online", "presencial", "telefónico", "whatsapp"];
    for (const type of types) {
      const { unmount } = render(<TypePill type={type} />);
      expect(screen.getByText(type)).toBeInTheDocument();
      unmount();
    }
  });
});
