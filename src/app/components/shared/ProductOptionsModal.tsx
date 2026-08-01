import { useState } from "react";
import { Minus, Plus, X } from "lucide-react";
import type { CartItem, Product, ProductOptionGroup } from "../../types";
import { formatCurrency } from "../../lib/format";

// Estado de selección de un grupo — se usa el campo que corresponde a su selectionType nada más
// (single/multiple/quantity), los otros dos quedan en su valor inicial sin uso.
type GroupSelection = { singleId: number | null; multipleIds: number[]; quantities: Record<number, number> };

function emptySelection(): GroupSelection {
  return { singleId: null, multipleIds: [], quantities: {} };
}

// Cuánto suma (o resta) al precio base del producto lo elegido en un grupo puntual — en un grupo
// "quantity", el priceDelta de cada opción se multiplica por la cantidad elegida de esa opción.
function groupPriceDelta(group: ProductOptionGroup, sel: GroupSelection): number {
  if (group.selectionType === "single") {
    return group.options.find(o => o.id === sel.singleId)?.priceDelta ?? 0;
  }
  if (group.selectionType === "multiple") {
    return group.options.filter(o => sel.multipleIds.includes(o.id)).reduce((s, o) => s + o.priceDelta, 0);
  }
  return group.options.reduce((s, o) => s + o.priceDelta * (sel.quantities[o.id] ?? 0), 0);
}

// Descripción legible de lo elegido en un grupo, para armar el nombre final del ítem del
// carrito (ej. "Napolitana" o "6 Pollo, 6 Carne dulce"). Vacío si no se eligió nada (grupo
// opcional sin marcar).
function groupLabel(group: ProductOptionGroup, sel: GroupSelection): string {
  if (group.selectionType === "single") {
    return group.options.find(o => o.id === sel.singleId)?.name ?? "";
  }
  if (group.selectionType === "multiple") {
    return group.options.filter(o => sel.multipleIds.includes(o.id)).map(o => o.name).join(", ");
  }
  return group.options
    .filter(o => (sel.quantities[o.id] ?? 0) > 0)
    .map(o => `${sel.quantities[o.id]} ${o.name}`)
    .join(", ");
}

// Un grupo está resuelto cuando se puede confirmar el pedido: un "quantity" siempre tiene que
// repartir exacto su quantityTarget (tenga o no marcado `required` — no tiene sentido dejarlo a
// medias); "single"/"multiple" solo bloquean si son `required` y no hay nada elegido.
function isGroupValid(group: ProductOptionGroup, sel: GroupSelection): boolean {
  if (group.selectionType === "quantity") {
    const total = group.options.reduce((s, o) => s + (sel.quantities[o.id] ?? 0), 0);
    return total === (group.quantityTarget ?? 0);
  }
  if (!group.required) return true;
  return group.selectionType === "single" ? sel.singleId !== null : sel.multipleIds.length > 0;
}

// Modal para resolver las opciones de un producto (sabor, agregados, reparto de cantidad, etc.)
// antes de agregarlo al carrito. Responsabilidad única: a partir de un Product con
// optionGroups, arma la CartItem final (nombre con el detalle elegido + precio unitario ya con
// los priceDelta sumados) — no sabe nada de cómo se guarda el pedido ni de la lógica del
// carrito, eso lo maneja quien la invoca (CustomerMenu / ReceptionistCreateOrder) al recibir
// onConfirm.
export function ProductOptionsModal({ product, onConfirm, onClose }: {
  product: Product;
  onConfirm: (line: CartItem) => void;
  onClose: () => void;
}) {
  const [selections, setSelections] = useState<Record<number, GroupSelection>>(() =>
    Object.fromEntries(product.optionGroups.map(g => [g.id, emptySelection()]))
  );

  const updateGroup = (groupId: number, patch: Partial<GroupSelection>) =>
    setSelections(prev => ({ ...prev, [groupId]: { ...prev[groupId], ...patch } }));

  const allValid = product.optionGroups.every(g => isGroupValid(g, selections[g.id]));
  const extra = product.optionGroups.reduce((s, g) => s + groupPriceDelta(g, selections[g.id]), 0);
  const unitPrice = product.price + extra;

  const handleConfirm = () => {
    if (!allValid) return;
    const labels = product.optionGroups.map(g => groupLabel(g, selections[g.id])).filter(Boolean);
    const name = labels.length ? `${product.name} (${labels.join(", ")})` : product.name;
    onConfirm({
      id: crypto.randomUUID(),
      productId: product.id,
      name,
      price: unitPrice,
      qty: 1,
      image: product.images[0]?.url ?? "",
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-5 pb-3 sticky top-0 bg-card">
          <div>
            <h2 className="font-display font-bold text-xl">{product.name}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">{formatCurrency(product.price)}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground" data-testid="options-modal-close">
            <X size={20} />
          </button>
        </div>

        <div className="px-5 space-y-5">
          {product.optionGroups.map(group => {
            const sel = selections[group.id];
            return (
              <div key={group.id}>
                <p className="text-sm font-semibold mb-2">
                  {group.name}
                  {group.required && <span className="text-destructive"> *</span>}
                  {group.selectionType === "quantity" && (
                    <span className="text-xs font-normal text-muted-foreground ml-2">
                      {group.options.reduce((s, o) => s + (sel.quantities[o.id] ?? 0), 0)} / {group.quantityTarget}
                    </span>
                  )}
                </p>

                {group.selectionType === "single" && (
                  <div className="space-y-1.5">
                    {group.options.map(opt => (
                      <label key={opt.id} className={`flex items-center justify-between gap-3 p-2.5 rounded-xl border cursor-pointer transition-all ${sel.singleId === opt.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}>
                        <span className="flex items-center gap-2.5">
                          <input type="radio" name={`group-${group.id}`} checked={sel.singleId === opt.id}
                            onChange={() => updateGroup(group.id, { singleId: opt.id })} className="accent-primary" />
                          <span className="text-sm">{opt.name}</span>
                        </span>
                        {opt.priceDelta !== 0 && <span className="text-xs font-mono text-muted-foreground">+{formatCurrency(opt.priceDelta)}</span>}
                      </label>
                    ))}
                  </div>
                )}

                {group.selectionType === "multiple" && (
                  <div className="space-y-1.5">
                    {group.options.map(opt => {
                      const checked = sel.multipleIds.includes(opt.id);
                      return (
                        <label key={opt.id} className={`flex items-center justify-between gap-3 p-2.5 rounded-xl border cursor-pointer transition-all ${checked ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}>
                          <span className="flex items-center gap-2.5">
                            <input type="checkbox" checked={checked}
                              onChange={() => updateGroup(group.id, { multipleIds: checked ? sel.multipleIds.filter(id => id !== opt.id) : [...sel.multipleIds, opt.id] })}
                              className="accent-primary" />
                            <span className="text-sm">{opt.name}</span>
                          </span>
                          {opt.priceDelta !== 0 && <span className="text-xs font-mono text-muted-foreground">+{formatCurrency(opt.priceDelta)}</span>}
                        </label>
                      );
                    })}
                  </div>
                )}

                {group.selectionType === "quantity" && (
                  <div className="space-y-1.5">
                    {group.options.map(opt => {
                      const qty = sel.quantities[opt.id] ?? 0;
                      const total = group.options.reduce((s, o) => s + (sel.quantities[o.id] ?? 0), 0);
                      const atTarget = total >= (group.quantityTarget ?? 0);
                      return (
                        <div key={opt.id} className="flex items-center justify-between gap-3 p-2.5 rounded-xl border border-border">
                          <span className="text-sm">{opt.name}</span>
                          <div className="flex items-center gap-2">
                            <button type="button" disabled={qty === 0} data-testid={`qty-decrease-option-${opt.id}`}
                              onClick={() => updateGroup(group.id, { quantities: { ...sel.quantities, [opt.id]: qty - 1 } })}
                              className="w-7 h-7 rounded-full border border-border flex items-center justify-center hover:bg-muted disabled:opacity-30 disabled:hover:bg-transparent">
                              <Minus size={12} />
                            </button>
                            <span className="w-5 text-center font-mono font-bold text-sm">{qty}</span>
                            <button type="button" disabled={atTarget} data-testid={`qty-increase-option-${opt.id}`}
                              onClick={() => updateGroup(group.id, { quantities: { ...sel.quantities, [opt.id]: qty + 1 } })}
                              className="w-7 h-7 rounded-full border border-border flex items-center justify-center hover:bg-muted disabled:opacity-30 disabled:hover:bg-transparent">
                              <Plus size={12} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="p-5 pt-4 sticky bottom-0 bg-card border-t border-border mt-5">
          <button onClick={handleConfirm} disabled={!allValid} data-testid="options-modal-confirm"
            className="w-full bg-primary text-primary-foreground py-3.5 rounded-2xl font-bold hover:bg-primary/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md">
            Agregar · {formatCurrency(unitPrice)}
          </button>
        </div>
      </div>
    </div>
  );
}
