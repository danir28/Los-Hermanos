import { useEffect, useState } from "react";
import {
  ShoppingCart, Clock, LayoutDashboard, ClipboardList, PlusCircle,
  ChefHat, BarChart3, Plug, FileBarChart,
} from "lucide-react";
import type { CartItem, Order, OrderStatus, OrderType, Product } from "./types";
import { api } from "./lib/api";
import { CustomerHome, CustomerMenu, CustomerCart, CustomerConfirmation, CustomerTracking } from "./cliente";
import { ReceptionistDashboard, ReceptionistOrders, ReceptionistCreateOrder } from "./recepcionista";
import { KitchenPanel, KitchenAssign, KitchenKanban } from "./cocina";
import { AdminDashboard, AdminIntegrations, AdminReports } from "./admin";
import { RoleNavTabs, type NavTab } from "./components/shared";

// ─── Main App ──────────────────────────────────────────────────────────────────

type Role = "cliente" | "recepcionista" | "cocina" | "admin";

export default function App() {
  const [role, setRole]               = useState<Role>("cliente");
  const [customerView, setCustomerView] = useState("home");
  const [staffView, setStaffView]     = useState("dashboard");
  const [cart, setCart]               = useState<CartItem[]>([]);
  const [orders, setOrders]           = useState<Order[]>([]);
  const [confirmedId, setConfirmedId] = useState<string | null>(null);
  const [preselectedAssignId, setPreselectedAssignId] = useState<string | null>(null);

  // Carga los pedidos reales desde el backend al montar la app.
  useEffect(() => {
    api.ordersList()
      .then(setOrders)
      .catch(e => window.alert(e instanceof Error ? e.message : "Error al cargar los pedidos"));
  }, []);

  const addToCart = (product: Product) => setCart(prev => {
    const ex = prev.find(i => i.id === product.id);
    if (ex) return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
    return [...prev, { id: product.id, name: product.name, price: product.price, qty: 1, image: product.image }];
  });

  const updateCart = (id: number, delta: number) => setCart(prev =>
    prev.map(i => i.id === id ? { ...i, qty: i.qty + delta } : i).filter(i => i.qty > 0)
  );

  // Crea un pedido nuevo en el backend y lo agrega al estado compartido de orders, para que
  // aparezca en recepción, cocina y admin. Devuelve el pedido creado (con su id asignado).
  // Si falla la creación (ej. el servidor no responde), avisa con un alert y relanza el error
  // para que quien llamó (confirmOrder, createReceptionistOrder) no avance de pantalla.
  const createOrder = async (input: { customer: string; phone: string; items: CartItem[]; type: OrderType }): Promise<Order> => {
    try {
      const newOrder = await api.ordersCreate({
        customer: input.customer,
        phone: input.phone,
        items: input.items.map(i => ({ name: i.name, qty: i.qty, price: i.price })),
        type: input.type,
      });
      setOrders(prev => [newOrder, ...prev]);
      return newOrder;
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Error al crear el pedido");
      throw e;
    }
  };

  const confirmOrder = async (name: string, phone: string) => {
    try {
      const newOrder = await createOrder({ customer: name, phone, items: cart, type: "online" });
      setConfirmedId(newOrder.id);
      setCart([]);
      setCustomerView("confirmation");
    } catch {
      // El error ya se avisó en createOrder; nos quedamos en el carrito para reintentar.
    }
  };

  // Pedido cargado manualmente por recepción (presencial, telefónico o whatsapp): se agrega a
  // orders igual que uno online, y después vuelve al dashboard de recepción.
  const createReceptionistOrder = async (input: { customer: string; phone: string; items: CartItem[]; type: OrderType }) => {
    try {
      await createOrder(input);
      setStaffView("dashboard");
    } catch {
      // El error ya se avisó en createOrder; nos quedamos en el formulario para reintentar.
    }
  };

  const updateStatus = async (id: string, status: OrderStatus) => {
    try {
      const updated = await api.ordersUpdate(id, { status });
      setOrders(prev => prev.map(o => o.id === id ? updated : o));
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Error al actualizar el pedido");
    }
  };

  const assignTime = async (id: string, time: string) => {
    try {
      const updated = await api.ordersUpdate(id, { estimatedTime: time });
      setOrders(prev => prev.map(o => o.id === id ? updated : o));
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Error al asignar el horario");
    }
  };

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
    { key: "dashboard",     label: "Dashboard",    Icon: BarChart3    },
    { key: "reportes",      label: "Reportes",     Icon: FileBarChart },
    { key: "integraciones", label: "Integraciones",Icon: Plug         },
  ];

  // Vista inicial de staffView al entrar a cada rol de staff (la primera pestaña de cada uno).
  // Cocina no tiene una vista "dashboard" como recepción y admin, así que no puede
  // hardcodearse un único valor para los tres roles.
  const STAFF_DEFAULT_VIEW: Record<Exclude<Role, "cliente">, string> = {
    recepcionista: RECEPTIONIST_TABS[0].key,
    cocina: KITCHEN_TABS[0].key,
    admin: ADMIN_TABS[0].key,
  };

  return (
    <div className="min-h-screen bg-background" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Role selector */}
      <div className="border-b border-border bg-card/95 backdrop-blur sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center overflow-x-auto scrollbar-hide">
            {ROLE_TABS.map(r => (
              <button key={r.key} onClick={() => { setRole(r.key); if (r.key !== "cliente") setStaffView(STAFF_DEFAULT_VIEW[r.key]); }}
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
          {customerView === "confirmation" && confirmedId && <CustomerConfirmation orderId={confirmedId} orders={orders} onTrack={() => setCustomerView("tracking")} />}
          {customerView === "tracking"     && <CustomerTracking orders={orders} preloadOrderId={customerView === "tracking" && confirmedId !== null ? confirmedId : undefined} />}
        </>
      )}

      {/* ── RECEPCIONISTA ── */}
      {role === "recepcionista" && (
        <>
          <RoleNavTabs tabs={RECEPTIONIST_TABS} active={staffView} onSelect={setStaffView} />
          {staffView === "dashboard" && <ReceptionistDashboard orders={orders} onNavigate={setStaffView} onUpdateStatus={updateStatus} />}
          {staffView === "orders"    && <ReceptionistOrders orders={orders} onUpdateStatus={updateStatus} />}
          {staffView === "create"    && <ReceptionistCreateOrder onConfirm={createReceptionistOrder} />}
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
          {staffView === "reportes"      && <AdminReports />}
          {staffView === "integraciones" && <AdminIntegrations />}
        </>
      )}
    </div>
  );
}
