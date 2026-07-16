import { useState } from "react";
import {
  ShoppingCart, Clock, LayoutDashboard, ClipboardList, PlusCircle,
  ChefHat, BarChart3, Tag, ShoppingBag, Plug,
} from "lucide-react";
import type { CartItem, Order, OrderStatus, Product } from "./types";
import { SAMPLE_ORDERS } from "./data/sampleOrders";
import { CustomerHome, CustomerMenu, CustomerCart, CustomerConfirmation, CustomerTracking } from "./cliente";
import { ReceptionistDashboard, ReceptionistOrders, ReceptionistCreateOrder } from "./recepcionista";
import { KitchenPanel, KitchenAssign, KitchenKanban } from "./cocina";
import { AdminDashboard, AdminProducts, AdminCategories, AdminIntegrations } from "./admin";
import { RoleNavTabs, type NavTab } from "./components/shared";

// ─── Main App ──────────────────────────────────────────────────────────────────

type Role = "cliente" | "recepcionista" | "cocina" | "admin";

export default function App() {
  const [role, setRole]               = useState<Role>("cliente");
  const [customerView, setCustomerView] = useState("home");
  const [staffView, setStaffView]     = useState("dashboard");
  const [cart, setCart]               = useState<CartItem[]>([]);
  const [orders, setOrders]           = useState<Order[]>(SAMPLE_ORDERS);
  const [confirmedId, setConfirmedId] = useState("001");
  const [preselectedAssignId, setPreselectedAssignId] = useState<string | null>(null);

  const addToCart = (product: Product) => setCart(prev => {
    const ex = prev.find(i => i.id === product.id);
    if (ex) return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
    return [...prev, { id: product.id, name: product.name, price: product.price, qty: 1, image: product.image }];
  });

  const updateCart = (id: number, delta: number) => setCart(prev =>
    prev.map(i => i.id === id ? { ...i, qty: i.qty + delta } : i).filter(i => i.qty > 0)
  );

  const confirmOrder = (name: string, phone: string) => {
    const newOrder: Order = {
      id: String(orders.length + 1).padStart(3, "0"),
      customer: name, phone,
      items: cart.map(i => ({ name: i.name, qty: i.qty, price: i.price })),
      status: "Pendiente",
      createdAt: new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }),
      estimatedTime: null,
      total: cart.reduce((s, i) => s + i.price * i.qty, 0),
      type: "online",
    };
    setOrders(prev => [newOrder, ...prev]);
    setConfirmedId(newOrder.id);
    setCart([]);
    setCustomerView("confirmation");
  };

  const updateStatus = (id: string, status: OrderStatus) =>
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));

  const assignTime = (id: string, time: string) =>
    setOrders(prev => prev.map(o => o.id === id ? { ...o, estimatedTime: time, status: "Programado" as OrderStatus } : o));

  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  const ROLE_TABS: { key: Role; label: string; emoji: string }[] = [
    { key: "cliente",       label: "Cliente",        emoji: "👤" },
    { key: "recepcionista", label: "Recepcionista",  emoji: "📋" },
    { key: "cocina",        label: "Cocina",         emoji: "👨‍🍳" },
    { key: "admin",         label: "Administración", emoji: "⚙️"  },
  ];

  const RECEPTIONIST_TABS: NavTab[] = [
    { key: "dashboard", label: "Dashboard",        Icon: LayoutDashboard },
    { key: "orders",    label: "Lista de Pedidos", Icon: ClipboardList   },
    { key: "create",    label: "Nuevo Pedido",     Icon: PlusCircle      },
  ];

  const KITCHEN_TABS: NavTab[] = [
    { key: "panel",  label: "Panel",            Icon: ChefHat         },
    { key: "assign", label: "Asignar Horarios", Icon: Clock           },
    { key: "kanban", label: "Tablero",          Icon: LayoutDashboard },
  ];

  const ADMIN_TABS: NavTab[] = [
    { key: "dashboard",     label: "Dashboard",    Icon: BarChart3   },
    { key: "products",      label: "Productos",    Icon: ShoppingBag },
    { key: "categories",    label: "Categorías",   Icon: Tag         },
    { key: "integraciones", label: "Integraciones",Icon: Plug        },
  ];

  return (
    <div className="min-h-screen bg-background" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Role selector */}
      <div className="border-b border-border bg-card/95 backdrop-blur sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center overflow-x-auto scrollbar-hide">
            {ROLE_TABS.map(r => (
              <button key={r.key} onClick={() => { setRole(r.key); setStaffView("dashboard"); }}
                className={`flex items-center gap-2 px-4 py-3.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${role === r.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
                <span>{r.emoji}</span>{r.label}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-2 py-2 pl-4 shrink-0">
              <div className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full font-medium">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full" /> Abierto
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── CLIENTE ── */}
      {role === "cliente" && (
        <>
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
          {customerView === "home"         && <CustomerHome onNavigate={setCustomerView} />}
          {customerView === "menu"         && <CustomerMenu cart={cart} onAddToCart={addToCart} onNavigate={setCustomerView} />}
          {customerView === "cart"         && <CustomerCart cart={cart} onUpdateCart={updateCart} onConfirm={confirmOrder} />}
          {customerView === "confirmation" && <CustomerConfirmation orderId={confirmedId} orders={orders} onTrack={() => setCustomerView("tracking")} />}
          {customerView === "tracking"     && <CustomerTracking orders={orders} preloadOrderId={customerView === "tracking" && confirmedId !== "001" ? confirmedId : undefined} />}
        </>
      )}

      {/* ── RECEPCIONISTA ── */}
      {role === "recepcionista" && (
        <>
          <RoleNavTabs tabs={RECEPTIONIST_TABS} active={staffView} onSelect={setStaffView} />
          {staffView === "dashboard" && <ReceptionistDashboard orders={orders} onNavigate={setStaffView} />}
          {staffView === "orders"    && <ReceptionistOrders orders={orders} />}
          {staffView === "create"    && <ReceptionistCreateOrder onConfirm={() => setStaffView("dashboard")} />}
        </>
      )}

      {/* ── COCINA ── */}
      {role === "cocina" && (
        <>
          <RoleNavTabs tabs={KITCHEN_TABS} active={staffView} onSelect={setStaffView} />
          {staffView === "panel"  && <KitchenPanel orders={orders} onGoAssign={id => { setPreselectedAssignId(id); setStaffView("assign"); }} />}
          {staffView === "assign" && <KitchenAssign orders={orders} onAssigned={assignTime} preselectedId={preselectedAssignId} />}
          {staffView === "kanban" && <KitchenKanban orders={orders} onUpdateStatus={updateStatus} />}
        </>
      )}

      {/* ── ADMIN ── */}
      {role === "admin" && (
        <>
          <RoleNavTabs tabs={ADMIN_TABS} active={staffView} onSelect={setStaffView} />
          {staffView === "dashboard"     && <AdminDashboard orders={orders} />}
          {staffView === "products"      && <AdminProducts />}
          {staffView === "categories"    && <AdminCategories />}
          {staffView === "integraciones" && <AdminIntegrations />}
        </>
      )}
    </div>
  );
}
