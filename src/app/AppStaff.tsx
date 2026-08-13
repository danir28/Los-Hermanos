import { useEffect, useRef, useState } from "react";
import {
  Clock, LayoutDashboard, ClipboardList, PlusCircle,
  ChefHat, BarChart3, FileBarChart, LogOut, UtensilsCrossed, CalendarClock,
} from "lucide-react";
import type { CartItem, Order, OrderStatus, OrderType } from "./types";
import type { DiscountLine } from "./lib/bundleDiscounts";
import { api, type BusinessHours, type UserRole } from "./lib/api";
import { AuthProvider, LoginScreen, useAuth } from "./auth";
import { ReceptionistDashboard, ReceptionistOrders, ReceptionistCreateOrder } from "./recepcionista";
import { KitchenPanel, KitchenAssign, KitchenSlotWindows } from "./cocina";
import { AdminBusinessHours, AdminDashboard, AdminProducts, AdminReports } from "./admin";
import { OrderTicket, RoleNavTabs, type NavTab } from "./components/shared";
import { playNewOrderBeep, unlockAudio } from "./lib/sound";
import logo from "../assets/logo.png";

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

// Sin Tablero: desde que el horario se elige al crear el pedido y los estados avanzan solos
// según el reloj (ver advanceScheduledOrders en el backend), no hace falta una pantalla para
// avanzar pedidos a mano de un estado al siguiente.
const KITCHEN_TABS: NavTab[] = [
  { key: "panel",        label: "Panel",        Icon: ChefHat         },
  { key: "create",       label: "Nuevo Pedido", Icon: PlusCircle      },
  { key: "reprogramar",  label: "Reprogramar",  Icon: Clock           },
  { key: "horarios",     label: "Horarios",     Icon: CalendarClock   },
];

// Sin "Integraciones": FUDO no hace falta para este sistema (reunión con el cliente del
// 24/7/2026 — ver memoria de proyecto). Su backend queda intacto por si se retoma en un
// proyecto futuro y separado, pero no tiene sentido mostrárselo al cliente acá. El bot de
// WhatsApp directamente se sacó del proyecto (29/7/2026): el cliente resuelve la derivación
// a la web con la respuesta automática nativa de WhatsApp Business, sin backend de por medio.
const ADMIN_TABS: NavTab[] = [
  { key: "dashboard",     label: "Dashboard",    Icon: BarChart3        },
  { key: "reportes",      label: "Reportes",     Icon: FileBarChart     },
  { key: "horarios",      label: "Horario",      Icon: Clock            },
  { key: "productos",     label: "Productos",    Icon: UtensilsCrossed  },
];

// Vista inicial de staffView al entrar a cada sección (la primera pestaña de cada una).
// Cocina no tiene una vista "dashboard" como recepción y admin, así que no puede
// hardcodearse un único valor para las tres.
const STAFF_DEFAULT_VIEW: Record<UserRole, string> = {
  recepcionista: RECEPTIONIST_TABS[0].key,
  cocina: KITCHEN_TABS[0].key,
  admin: ADMIN_TABS[0].key,
};

// Vista a la que vuelve el formulario de carga manual de pedidos al confirmar, por rol —
// "dashboard" no es una vista válida para cocina (no tiene esa key en KITCHEN_TABS).
const CREATE_ORDER_RETURN_VIEW: Record<UserRole, string> = {
  recepcionista: "dashboard",
  cocina: "panel",
  admin: "dashboard",
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
  // Pedido a imprimir: se setea al crear un pedido manual y dispara window.print() (ver
  // OrderTicket más abajo). Vive acá (no en ReceptionistCreateOrder) porque el ticket tiene
  // que montarse en el DOM de AppStaff para que @media print lo encuentre al imprimir.
  const [printOrder, setPrintOrder] = useState<Order | null>(null);
  // IDs de pedidos ya vistos, para que el polling de más abajo pueda notar cuándo aparece uno
  // nuevo y sonar el beep (ver src/app/lib/sound.ts) — null hasta el primer fetch, así el primer
  // refreshOrders() de la sesión completa la lista sin sonar por todos los pedidos preexistentes.
  const knownOrderIds = useRef<Set<string> | null>(null);
  // Horario de atención: decide si se bloquea la carga manual de pedidos en "Nuevo Pedido" (ver
  // ReceptionistCreateOrder más abajo) — recepción y cocina quedan sujetas a la misma regla que
  // el checkout online del cliente (ver AppCliente.tsx), sin excepción (decisión explícita del
  // dueño del proyecto). Se refresca al montar y cada vez que se entra a "create", por si el
  // horario cambió (ej. cruzó la hora de cierre) mientras se estaba en otra vista.
  const [businessHours, setBusinessHours] = useState<BusinessHours | null>(null);
  const refreshBusinessHours = () => { api.businessHoursGet().then(setBusinessHours).catch(() => {}); };
  useEffect(refreshBusinessHours, []);
  useEffect(() => { if (staffView === "create") refreshBusinessHours(); }, [staffView]);

  // Al loguearse (o al validar el token guardado contra /me), arranca en la primera
  // vista de la sección del usuario. La sección en sí no es un estado propio: es
  // siempre user.rol, no algo que se pueda cambiar desde la UI.
  useEffect(() => {
    if (!user) return;
    setStaffView(STAFF_DEFAULT_VIEW[user.rol]);
  }, [user]);

  // Dispara la impresión de la comanda: al crear un pedido manualmente (ver createManualOrder)
  // o al tocar "Imprimir ticket" en un pedido online desde el Panel de cocina (ver printOrderTicket
  // más abajo). El setTimeout(0) asegura que el <OrderTicket> ya se haya montado en el DOM (ver
  // el render al final de este componente) antes de invocar el diálogo de impresión del
  // navegador — sin esto, @media print podría no encontrar el nodo todavía. Vuelve a limpiar
  // printOrder a null después de imprimir: si no, tocar "Imprimir ticket" dos veces seguidas
  // sobre el mismo pedido no dispararía una segunda impresión (mismo objeto, React no vuelve a
  // correr el efecto si el estado "cambia" al mismo valor).
  useEffect(() => {
    if (!printOrder) return;
    const timer = setTimeout(() => {
      window.print();
      setPrintOrder(null);
    }, 0);
    return () => clearTimeout(timer);
  }, [printOrder]);

  // Trae los pedidos del backend y actualiza el estado. La comparten la carga inicial de sesión,
  // el polling de fondo de más abajo, y el botón del header que vuelve a la vista principal de
  // la sección (ver goToSectionHome) — todos necesitan el mismo fetch, solo cambia si avisan con
  // un alert cuando falla.
  const refreshOrders = () => {
    if (!token) return Promise.resolve();
    return api.ordersList(token).then(fetched => {
      // Red de contención del beep sonoro: si el push llegó antes (ver el listener de mensajes
      // del Service Worker más abajo), este mismo pedido ya sonó y el debounce de
      // playNewOrderBeep() evita que suene dos veces; si el push no llegó (permiso no otorgado,
      // sin conexión al momento del push), este polling de 10s es lo que igual lo hace sonar,
      // aunque con más demora. Solo para cocina: es el único rol con este aviso (ver
      // "Aviso push a cocina" en CLAUDE.md).
      if (user?.rol === "cocina") {
        if (knownOrderIds.current && fetched.some(o => !knownOrderIds.current!.has(o.id))) {
          playNewOrderBeep();
        }
        knownOrderIds.current = new Set(fetched.map(o => o.id));
      }
      setOrders(fetched);
    });
  };

  // Carga los pedidos una vez que hay sesión y los vuelve a pedir cada 10s. Antes alcanzaba con
  // cargarlos una sola vez al loguearse porque todo cambio de estado era manual (alguien lo
  // hacía clickeando acá mismo, así que el estado local ya quedaba al día). Desde que los
  // pedidos avanzan de estado solos según el reloj (ver advanceScheduledOrders en el backend),
  // sin este refresco periódico cocina vería el Panel desactualizado hasta recargar la página a
  // mano — el polling es lo que hace que la automatización se note en pantalla.
  useEffect(() => {
    if (!token) return;
    // Solo la primera carga avisa con un alert si falla — un refresco de fondo que falla (ej.
    // un corte de red momentáneo) se reintenta solo en el próximo ciclo de 10s, sin interrumpir
    // a quien esté trabajando con un alert cada 10 segundos.
    refreshOrders().catch(e => window.alert(e instanceof Error ? e.message : "Error al cargar los pedidos"));
    const interval = setInterval(() => { refreshOrders().catch(() => {}); }, 10_000);
    return () => clearInterval(interval);
  }, [token]);

  // Desbloquea el AudioContext del beep (ver src/app/lib/sound.ts) en el primer toque/click a la
  // app. Los navegadores no dejan reproducir audio sin un gesto previo del usuario — no hace falta
  // que ese gesto tenga nada que ver con sonido, cualquier interacción real alcanza.
  useEffect(() => {
    const handler = () => unlockAudio();
    window.addEventListener("pointerdown", handler, { once: true });
    return () => window.removeEventListener("pointerdown", handler);
  }, []);

  // Beep instantáneo y refresco al toque: cuando llega un push de "pedido nuevo" con la pestaña
  // abierta, sw-push.js le manda este mensaje a todos los clientes (además de mostrar la
  // notificación del sistema, que no puede llevar sonido propio — ver sound.ts). Antes esto solo
  // sonaba el beep y el pedido nuevo no se veía en el Panel hasta el próximo ciclo del polling de
  // 10s (más abajo) — ahora también llama a refreshOrders(), así aparece en pantalla en el mismo
  // instante que suena. Solo tiene efecto para cocina, el único rol suscripto a este push.
  useEffect(() => {
    if (!user || user.rol !== "cocina" || !("serviceWorker" in navigator)) return;
    const handler = (event: MessageEvent) => {
      if (event.data?.type === "nuevo-pedido-push") {
        playNewOrderBeep();
        refreshOrders().catch(() => {});
      }
    };
    navigator.serviceWorker.addEventListener("message", handler);
    return () => navigator.serviceWorker.removeEventListener("message", handler);
  }, [user]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">Cargando…</div>;
  }
  if (!user || !token) {
    return <LoginScreen />;
  }

  // Pedido cargado manualmente por recepción o cocina (presencial o telefónico) — la usan ambos
  // roles, por eso la vista a la que vuelve al terminar depende de cuál esté logueado
  // (cocina no tiene una vista "dashboard" como recepción y admin). discounts ya llega calculado
  // desde ReceptionistCreateOrder (ver computeBundleDiscounts) — acá solo se agregan como ítems
  // más del pedido, con precio negativo, mismo criterio que confirmOrder en AppCliente.tsx.
  const createManualOrder = async (input: { customer: string; phone: string; items: CartItem[]; discounts: DiscountLine[]; type: OrderType; estimatedTime: string }) => {
    try {
      const newOrder = await api.ordersCreate({
        customer: input.customer,
        phone: input.phone,
        items: [
          ...input.items.map(i => ({ name: i.name, qty: i.qty, price: i.price, notes: i.notes })),
          ...input.discounts.map(d => ({ name: d.name, qty: d.qty, price: d.price })),
        ],
        type: input.type,
        estimatedTime: input.estimatedTime,
      });
      setOrders(prev => [newOrder, ...prev]);
      setPrintOrder(newOrder);
      setStaffView(CREATE_ORDER_RETURN_VIEW[user.rol]);
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

  // Tocar el logo/nombre de la sección en el header vuelve a la vista principal de esa sección
  // (dashboard para recepción/admin, panel para cocina — ver STAFF_DEFAULT_VIEW) y refresca los
  // pedidos al toque, en vez de esperar hasta 10s del polling de fondo.
  const goToSectionHome = () => {
    setStaffView(STAFF_DEFAULT_VIEW[user.rol]);
    refreshOrders().catch(e => window.alert(e instanceof Error ? e.message : "Error al actualizar los pedidos"));
  };

  const section = SECTION_LABEL[user.rol];

  // El ticket (más abajo) tiene que quedar FUERA de este div al imprimir: si quedara adentro,
  // ocultar este div con display:none también se lo llevaría puesto a él (los hijos de un
  // elemento display:none ni siquiera se renderizan). Por eso son hermanos dentro de un
  // Fragment, y este div se esconde entero con "print:hidden" (Tailwind) — a diferencia del
  // enfoque anterior (ocultar todo por visibility, dejando el ticket visible por encima), que
  // generaba páginas en blanco de más: visibility:hidden no saca los elementos del flujo, así
  // que el alto real de toda la app (mucho más que una hoja) igual se paginaba al imprimir.
  return (
    <>
    <div className="min-h-screen bg-background print:hidden" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div className="border-b border-border bg-card/95 backdrop-blur sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between py-2.5">
          <button onClick={goToSectionHome} data-testid="header-home" className="flex items-center gap-2.5 text-sm font-medium hover:opacity-80 transition-opacity">
            <img src={logo} alt="" className="w-8 h-8 object-contain" />
            <span>{section.emoji}</span>{section.label}
          </button>
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
          {staffView === "create"    && <ReceptionistCreateOrder onConfirm={createManualOrder} isOpenNow={businessHours ? businessHours.isOpenNow : null} />}
        </>
      )}

      {user.rol === "cocina" && (
        <>
          <RoleNavTabs tabs={KITCHEN_TABS} active={staffView} onSelect={setStaffView} />
          {staffView === "panel"       && <KitchenPanel orders={orders} token={token} onGoAssign={id => { setPreselectedAssignId(id); setStaffView("reprogramar"); }} onPrint={setPrintOrder} onUpdateStatus={updateStatus} />}
          {staffView === "create"      && <ReceptionistCreateOrder onConfirm={createManualOrder} isOpenNow={businessHours ? businessHours.isOpenNow : null} />}
          {staffView === "reprogramar" && <KitchenAssign orders={orders} onAssigned={assignTime} preselectedId={preselectedAssignId} />}
          {staffView === "horarios"    && <KitchenSlotWindows />}
        </>
      )}

      {user.rol === "admin" && (
        <>
          <RoleNavTabs tabs={ADMIN_TABS} active={staffView} onSelect={setStaffView} />
          {staffView === "dashboard"     && <AdminDashboard orders={orders} />}
          {staffView === "reportes"      && <AdminReports />}
          {staffView === "horarios"      && <AdminBusinessHours />}
          {staffView === "productos"     && <AdminProducts />}
        </>
      )}

    </div>
    {printOrder && <OrderTicket order={printOrder} />}
    </>
  );
}
