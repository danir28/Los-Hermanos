import { useEffect, useState } from "react";
import { ShoppingCart } from "lucide-react";
import type { CartItem, Order, OrderType, Product } from "./types";
import { api, type BusinessHours } from "./lib/api";
import { CustomerHome, CustomerMenu, CustomerCart, CustomerConfirmation, CustomerTracking } from "./cliente";

// ─── App pública de clientes ───────────────────────────────────────────────
// Sin login, sin selector de rol, y sin código de staff: nunca importa ./recepcionista,
// ./cocina ni ./admin — es justamente el no-importarlos lo que garantiza que ese código
// quede afuera de este bundle (ver vite.cliente.config.ts, build separado del de staff).
// A diferencia del App.tsx original, no pide GET /api/orders al montar (ese endpoint
// pasó a ser solo-staff): el pedido recién creado se guarda directo desde lo que
// devuelve api.ordersCreate(...).

export default function AppCliente() {
  const [customerView, setCustomerView] = useState("home");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);
  const [businessHours, setBusinessHours] = useState<BusinessHours | null>(null);

  // Horario de atención: se muestra en la Home y decide si se bloquea el checkout online (ver
  // CustomerCart). Se recarga al entrar al carrito además de al montar, para no quedar
  // desactualizado si el cliente dejó la pestaña abierta y el horario cambió (ej. cruzó la hora
  // de cierre) mientras navegaba el menú.
  const refreshBusinessHours = () => { api.businessHoursGet().then(setBusinessHours).catch(() => {}); };
  useEffect(refreshBusinessHours, []);
  useEffect(() => { if (customerView === "cart") refreshBusinessHours(); }, [customerView]);

  // Agrega un producto al carrito: si ya estaba, suma 1 a la cantidad existente en vez de duplicar la línea.
  const addToCart = (product: Product) => setCart(prev => {
    const ex = prev.find(i => i.id === product.id);
    if (ex) return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
    return [...prev, { id: product.id, name: product.name, price: product.price, qty: 1, image: product.image }];
  });

  // Suma/resta delta a la cantidad de un ítem del carrito y lo quita por completo si llega a 0.
  const updateCart = (id: number, delta: number) => setCart(prev =>
    prev.map(i => i.id === id ? { ...i, qty: i.qty + delta } : i).filter(i => i.qty > 0)
  );

  // Crea el pedido en el backend (checkout) y lo guarda para mostrar la confirmación y
  // precargar el seguimiento, sin necesidad de un segundo pedido al servidor. estimatedTime es
  // el turno de retiro elegido en el SlotPicker de CustomerCart — a diferencia de la carga
  // manual de staff, acá SÍ es obligatorio (el cliente no tiene forma de "avisar después" si
  // queda sin horario). Si falla (turno lleno, servidor no responde), avisa con un alert y se
  // queda en el carrito para reintentar.
  const confirmOrder = async (name: string, phone: string, estimatedTime: string) => {
    try {
      const newOrder = await api.ordersCreate({
        customer: name,
        phone,
        items: cart.map(i => ({ name: i.name, qty: i.qty, price: i.price })),
        type: "online" as OrderType,
        estimatedTime,
      });
      setConfirmedOrder(newOrder);
      setCart([]);
      setCustomerView("confirmation");
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Error al crear el pedido");
    }
  };

  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  return (
    <div className="min-h-screen bg-background" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div className="border-b border-border bg-card/95 backdrop-blur sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between py-2">
          <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest px-2">Rotisería Los Hermanos</p>
          {businessHours && (
            businessHours.isOpenNow ? (
              <div className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full font-medium">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full" /> Abierto
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-red-700 bg-red-50 border border-red-200 px-2.5 py-1 rounded-full font-medium">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full" /> Cerrado
              </div>
            )
          )}
        </div>
      </div>

      <nav className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
          <div className="flex">
            {[{ k: "home", l: "Inicio" }, { k: "menu", l: "Menú" }, { k: "tracking", l: "Seguir pedido" }].map(v => (
              <button key={v.k} onClick={() => setCustomerView(v.k)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${customerView === v.k ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
                {v.l}
              </button>
            ))}
          </div>
          <button onClick={() => setCustomerView("cart")} className="relative flex items-center gap-1.5 text-sm font-medium text-foreground hover:text-primary transition-colors py-3">
            <ShoppingCart size={17} /> Carrito
            {cartCount > 0 && (
              <span className="absolute -top-0 -right-4 w-5 h-5 bg-primary text-primary-foreground text-[10px] rounded-full flex items-center justify-center font-mono font-bold">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </nav>

      {customerView === "home"         && <CustomerHome onNavigate={setCustomerView} businessHours={businessHours} />}
      {customerView === "menu"         && <CustomerMenu cart={cart} onAddToCart={addToCart} onNavigate={setCustomerView} />}
      {customerView === "cart"         && <CustomerCart cart={cart} onUpdateCart={updateCart} onConfirm={confirmOrder} isOpenNow={businessHours ? businessHours.isOpenNow : null} />}
      {customerView === "confirmation" && confirmedOrder && <CustomerConfirmation order={confirmedOrder} onTrack={() => setCustomerView("tracking")} />}
      {customerView === "tracking"     && <CustomerTracking preloadOrder={confirmedOrder ?? undefined} />}
    </div>
  );
}
