import { useState } from "react";
import { Search, CheckCircle, Plus, Minus, X } from "lucide-react";
import type { CartItem, OrderType, Product } from "../types";
import { useProducts } from "../lib/useProducts";
import { formatCurrency } from "../lib/format";
import { ConfirmDialog, SlotPicker } from "../components/shared";

// Datos del pedido que arma este formulario, para que AppStaff.tsx lo cree en el estado
// compartido de orders. estimatedTime es opcional: si todos los turnos visibles están llenos,
// se puede confirmar igual sin horario (cocina lo reprograma después, ver KitchenAssign).
type NewReceptionistOrder = { customer: string; phone: string; items: CartItem[]; type: OrderType; estimatedTime: string | null };

// Formulario de carga manual de pedidos por parte de recepción o cocina (pedidos telefónicos o
// presenciales) — 100% agnóstico de rol, solo recibe onConfirm, por eso lo reusa también cocina.
export function ReceptionistCreateOrder({ onConfirm }: { onConfirm: (order: NewReceptionistOrder) => void }) {
  const { products, categories } = useProducts();
  const [orderCart, setOrderCart] = useState<CartItem[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [orderType, setOrderType] = useState<"presencial" | "telefónico">("presencial");
  const [time, setTime] = useState<string | null>(null);
  const [refreshSignal, setRefreshSignal] = useState(0);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Todos");
  const [confirmed, setConfirmed] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const filtered = products.filter(p => {
    if (!p.active || p.outOfStock) return false;
    if (category !== "Todos" && p.category !== category) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Agrega un producto al pedido en carga: si ya estaba, suma 1 a la cantidad existente en vez de duplicar la línea.
  const addItem = (p: Product) => setOrderCart(prev => {
    const ex = prev.find(i => i.id === p.id);
    if (ex) return prev.map(i => i.id === p.id ? { ...i, qty: i.qty + 1 } : i);
    return [...prev, { id: p.id, name: p.name, price: p.price, qty: 1, image: p.image }];
  });

  // Suma/resta delta a la cantidad de un ítem y lo quita del pedido si llega a 0.
  const updateQty = (id: number, delta: number) => setOrderCart(prev =>
    prev.map(i => i.id === id ? { ...i, qty: i.qty + delta } : i).filter(i => i.qty > 0)
  );

  const total = orderCart.reduce((s, i) => s + i.price * i.qty, 0);

  // Valida que haya productos y datos del cliente cargados, muestra el cartel de "registrado"
  // y recién después de una breve animación (1.2s) llama a onConfirm con el pedido armado —
  // así AppStaff.tsx lo crea en el backend sin que se sienta instantáneo/brusco para quien lo
  // carga. El horario NO es obligatorio acá (a diferencia del checkout online del cliente): si
  // todos los turnos visibles están llenos, igual se puede cargar el pedido sin horario y
  // reprogramarlo después desde cocina (ver KitchenAssign) — quien atiende el teléfono no
  // debería quedar trabado si la grilla está completa.
  const handleConfirm = () => {
    if (!orderCart.length || !name || !phone) return;
    setConfirmed(true);
    setTimeout(() => {
      setConfirmed(false);
      onConfirm({ customer: name, phone, items: orderCart, type: orderType, estimatedTime: time });
      setRefreshSignal(s => s + 1);
    }, 1200);
  };

  // Descarta el pedido en carga: vacía carrito, datos del cliente, horario, y cierra el diálogo de confirmación.
  const handleCancel = () => {
    setOrderCart([]); setName(""); setPhone(""); setTime(null); setShowCancelConfirm(false);
  };

  const CHANNEL_OPTIONS: { key: "presencial" | "telefónico"; label: string; emoji: string }[] = [
    { key: "presencial",  label: "Presencial",  emoji: "🏠" },
    { key: "telefónico",  label: "Telefónico",  emoji: "📞" },
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="font-display text-4xl font-bold">Nuevo Pedido</h1>
        {(orderCart.length > 0 || name || phone) && (
          <button onClick={() => setShowCancelConfirm(true)}
            className="flex items-center gap-1.5 text-sm text-destructive border border-red-200 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-xl transition-colors font-medium">
            <X size={15} /> Cancelar pedido
          </button>
        )}
      </div>

      {/* Cancel confirm dialog */}
      {showCancelConfirm && (
        <ConfirmDialog
          title="¿Cancelar pedido?"
          description="Se perderán todos los datos ingresados hasta ahora."
          confirmLabel="Sí, cancelar"
          onCancel={() => setShowCancelConfirm(false)}
          onConfirm={handleCancel}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Product selector */}
        <div className="lg:col-span-3">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={15} />
            <input type="text" placeholder="Buscar productos..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 border border-border rounded-xl bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm placeholder:text-muted-foreground" />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
            {categories.map(c => (
              <button key={c} onClick={() => setCategory(c)}
                className={`whitespace-nowrap px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${category === c ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:border-primary/40"}`}>
                {c}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {filtered.map(p => {
              const inCart = orderCart.find(i => i.id === p.id);
              return (
                <div key={p.id} className={`bg-card border rounded-xl p-3 flex gap-3 items-center transition-all ${inCart ? "border-primary/40 bg-primary/5" : "border-border hover:border-primary/30"}`}>
                  <div className="w-14 h-14 rounded-lg overflow-hidden bg-muted shrink-0">
                    <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm leading-tight">{p.name}</p>
                    <p className="font-mono text-primary text-sm font-bold mt-0.5">{formatCurrency(p.price)}</p>
                  </div>
                  {inCart ? (
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => updateQty(p.id, -1)} className="w-7 h-7 rounded-full border border-border flex items-center justify-center hover:bg-muted">
                        <Minus size={11} />
                      </button>
                      <span className="w-5 text-center font-mono font-bold text-sm">{inCart.qty}</span>
                      <button onClick={() => updateQty(p.id, 1)} className="w-7 h-7 rounded-full border border-border flex items-center justify-center hover:bg-muted">
                        <Plus size={11} />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => addItem(p)} className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors shrink-0">
                      <Plus size={15} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Summary panel */}
        <div className="lg:col-span-2 space-y-4">
          {/* Channel selector */}
          <div className="bg-card border border-border rounded-2xl p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Canal de origen</p>
            <div className="space-y-2">
              {CHANNEL_OPTIONS.map(ch => (
                <label key={ch.key} className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition-all ${orderType === ch.key ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}>
                  <input type="radio" name="channel" value={ch.key} checked={orderType === ch.key} onChange={() => setOrderType(ch.key)} className="accent-primary" />
                  <span className="text-base">{ch.emoji}</span>
                  <span className="text-sm font-medium">{ch.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Time slot */}
          <div className="bg-card border border-border rounded-2xl p-4">
            <SlotPicker value={time} onChange={setTime} refreshSignal={refreshSignal} required={false} />
            {!time && <p className="text-xs text-muted-foreground mt-1">Opcional: si no hay turnos libres, se puede cargar igual y reprogramar después.</p>}
          </div>

          {/* Customer data */}
          <div className="bg-card border border-border rounded-2xl p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Datos del cliente</p>
            <div className="space-y-2.5">
              <input type="text" placeholder="Nombre completo" value={name} onChange={e => setName(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm placeholder:text-muted-foreground" />
              <input type="tel" placeholder="Teléfono" value={phone} onChange={e => setPhone(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm placeholder:text-muted-foreground" />
            </div>
          </div>

          {/* Cart summary */}
          <div className="bg-card border border-border rounded-2xl p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Productos</p>
            {orderCart.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Ningún producto agregado aún</p>
            ) : (
              <div className="space-y-2">
                {orderCart.map(item => (
                  <div key={item.id} className="flex justify-between items-center text-sm">
                    <span>{item.name} <span className="text-muted-foreground font-mono">×{item.qty}</span></span>
                    <span className="font-mono font-semibold">{formatCurrency(item.price * item.qty)}</span>
                  </div>
                ))}
                <div className="border-t border-border pt-2 mt-1 flex justify-between font-bold text-sm">
                  <span>Total</span>
                  <span className="font-mono text-primary">{formatCurrency(total)}</span>
                </div>
              </div>
            )}
          </div>

          {confirmed ? (
            <div className="w-full py-4 rounded-2xl bg-green-500 text-white font-bold flex items-center justify-center gap-2">
              <CheckCircle size={18} /> ¡Pedido registrado!
            </div>
          ) : (
            <button onClick={handleConfirm} disabled={!orderCart.length || !name || !phone}
              className="w-full bg-primary text-primary-foreground py-4 rounded-2xl font-bold hover:bg-primary/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md">
              Confirmar Pedido
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
