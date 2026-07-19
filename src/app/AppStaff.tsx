import { useEffect, useState } from "react";
import {
  Clock, LayoutDashboard, ClipboardList, PlusCircle,
  ChefHat, BarChart3, Plug, FileBarChart, LogOut,
} from "lucide-react";
import type { CartItem, Order, OrderStatus, OrderType } from "./types";
import { api, type UserRole } from "./lib/api";
import { AuthProvider, LoginScreen, useAuth } from "./auth";
import { ReceptionistDashboard, ReceptionistOrders, ReceptionistCreateOrder } from "./recepcionista";
import { KitchenPanel, KitchenAssign, KitchenKanban } from "./cocina";
import { AdminBusinessHours, AdminDashboard, AdminIntegrations, AdminReports } from "./admin";
import { RoleNavTabs, type NavTab } from "./components/shared";

// ─── App privada de staff ───────────────────────────────────────────────────
// Recepción/cocina/admin, siempre detrás de login (ver ./auth/AuthContext). Nunca
// importa ./cliente — build separado del de la app pública (vite.staff.config.ts).
// Cada cuenta ve únicamente su propia sección, sin excepción — el admin NO ve las
// tres (decisión explícita del dueño del proyecto): una cuenta de administrador
// solo administra, no supervisa recepción/cocina desde ahí.

const SECTION_LABEL: Record<UserRole, { label: string; emoji: string }> = {
  recepcionista: { label: "Recepcionista",  emoji: "📋" },
  cocina:        { label: "Cocina",         emoji: "👨‍🍳" },
  admin:         { label: "Administración", emoji: "⚙️"  },
};

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
  { key: "horarios",      label: "Horario",      Icon: Clock        },
  { key: "integraciones", label: "Integraciones",Icon: Plug         },
];

// Vista inicial de staffView al entrar a cada sección (la primera pestaña de cada una).
// Cocina no tiene una vista "dashboard" como recepción y admin, así que no puede
// hardcodearse un único valor para las tres.
const STAFF_DEFAULT_VIEW: Record<UserRole, string> = {
  recepcionista: RECEPTIONIST_TABS[0].key,
  cocina: KITCHEN_TABS[0].key,
  admin: ADMIN_TABS[0].key,
};

// Punto de entrada de la app de staff: solo envuelve todo en AuthProvider para que
// AppStaffContent (y todo lo que cuelga de ella) tenga acceso a la sesión vía useAuth().
export default function AppStaff() {
  return (
    <AuthProvider>
      <AppStaffContent />
    </AuthProvider>
  );
}

// Contenido real de la app de staff, ya con sesión resuelta (o mostrando el login si no la hay).
// Dueña del estado de pedidos y de la vista activa dentro de la sección fija del usuario logueado
// (recepción/cocina/admin, ver SECTION_LABEL/STAFF_DEFAULT_VIEW arriba).
function AppStaffContent() {
  const { user, token, loading, logout } = useAuth();

  const [staffView, setStaffView] = useState("dashboard");
  const [orders, setOrders] = useState<Order[]>([]);
  const [preselectedAssignId, setPreselectedAssignId] = useState<string | null>(null);

  // Al loguearse (o al validar el token guardado contra /me), arranca en la primera
  // vista de la sección del usuario. La sección en sí no es un estado propio: es
  // siempre user.rol, no algo que se pueda cambiar desde la UI.
  useEffect(() => {
    if (!user) return;
    setStaffView(STAFF_DEFAULT_VIEW[user.rol]);
  }, [user]);

  // Carga los pedidos reales desde el backend una vez que hay sesión (GET /api/orders
  // pasó a ser solo-staff, necesita el token).
  useEffect(() => {
    if (!token) return;
    api.ordersList(token)
      .then(setOrders)
      .catch(e => window.alert(e instanceof Error ? e.message : "Error al cargar los pedidos"));
  }, [token]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">Cargando…</div>;
  }
  if (!user || !token) {
    return <LoginScreen />;
  }

  // Pedido cargado manualmente por recepción (presencial, telefónico o whatsapp).
  const createReceptionistOrder = async (input: { customer: string; phone: string; items: CartItem[]; type: OrderType }) => {
    try {
      const newOrder = await api.ordersCreate({
        customer: input.customer,
        phone: input.phone,
        items: input.items.map(i => ({ name: i.name, qty: i.qty, price: i.price })),
        type: input.type,
      });
      setOrders(prev => [newOrder, ...prev]);
      setStaffView("dashboard");
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Error al crear el pedido");
    }
  };

  // Cambia el estado de un pedido puntual (por id, no por orderNumber) y refleja el resultado
  // que devuelve el backend en el estado local, en vez de asumir el cambio optimísticamente.
  const updateStatus = async (id: string, status: OrderStatus) => {
    try {
      const updated = await api.ordersUpdate(token, id, { status });
      setOrders(prev => prev.map(o => o.id === id ? updated : o));
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Error al actualizar el pedido");
    }
  };

  // Asigna (o reprograma) el horario estimado de retiro de un pedido; el backend es quien pasa
  // el estado a "Programado" como efecto de este cambio (ver updateOrder en server/src/orders).
  const assignTime = async (id: string, time: string) => {
    try {
      const updated = await api.ordersUpdate(token, id, { estimatedTime: time });
      setOrders(prev => prev.map(o => o.id === id ? updated : o));
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Error al asignar el horario");
    }
  };

  const section = SECTION_LABEL[user.rol];

  return (
    <div className="min-h-screen bg-background" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div className="border-b border-border bg-card/95 backdrop-blur sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between py-2.5">
          <span className="flex items-center gap-2 text-sm font-medium">
            <span>{section.emoji}</span>{section.label}
          </span>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground hidden sm:inline">{user.nombre}</span>
            <button onClick={logout}
              className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-red-600 border border-border hover:border-red-200 px-2.5 py-1.5 rounded-full transition-colors">
              <LogOut size={13} /> Cerrar sesión
            </button>
          </div>
        </div>
      </div>

      {user.rol === "recepcionista" && (
        <>
          <RoleNavTabs tabs={RECEPTIONIST_TABS} active={staffView} onSelect={setStaffView} />
          {staffView === "dashboard" && <ReceptionistDashboard orders={orders} onNavigate={setStaffView} onUpdateStatus={updateStatus} />}
          {staffView === "orders"    && <ReceptionistOrders orders={orders} onUpdateStatus={updateStatus} />}
          {staffView === "create"    && <ReceptionistCreateOrder onConfirm={createReceptionistOrder} />}
        </>
      )}

      {user.rol === "cocina" && (
        <>
          <RoleNavTabs tabs={KITCHEN_TABS} active={staffView} onSelect={setStaffView} />
          {staffView === "panel"  && <KitchenPanel orders={orders} onGoAssign={id => { setPreselectedAssignId(id); setStaffView("assign"); }} />}
          {staffView === "assign" && <KitchenAssign orders={orders} onAssigned={assignTime} preselectedId={preselectedAssignId} />}
          {staffView === "kanban" && <KitchenKanban orders={orders} onUpdateStatus={updateStatus} />}
        </>
      )}

      {user.rol === "admin" && (
        <>
          <RoleNavTabs tabs={ADMIN_TABS} active={staffView} onSelect={setStaffView} />
          {staffView === "dashboard"     && <AdminDashboard orders={orders} />}
          {staffView === "reportes"      && <AdminReports />}
          {staffView === "horarios"      && <AdminBusinessHours />}
          {staffView === "integraciones" && <AdminIntegrations />}
        </>
      )}
    </div>
  );
}
