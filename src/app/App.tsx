import { useState } from "react";
import {
  ShoppingCart, Search, Clock, CheckCircle, Package, Plus, Minus,
  Trash2, Phone, User, LayoutDashboard, ClipboardList, PlusCircle,
  ChefHat, BarChart3, Tag, Edit, Eye, EyeOff, Check, Calendar,
  TrendingUp, ShoppingBag, Flame, X, AlertCircle, RefreshCw,
  MessageCircle, Ban,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type CartItem = { id: number; name: string; price: number; qty: number; image: string };
type OrderStatus = "Pendiente" | "Programado" | "En preparación" | "Listo para retirar" | "Entregado" | "Cancelado";
type OrderType = "online" | "presencial" | "telefónico" | "whatsapp";
type Order = {
  id: string; customer: string; phone: string;
  items: { name: string; qty: number; price: number }[];
  status: OrderStatus; createdAt: string; estimatedTime: string | null;
  total: number; type: OrderType;
};
type Product = { id: number; name: string; category: string; price: number; description: string; image: string; featured: boolean; active: boolean; outOfStock: boolean };

// ─── Static Data ──────────────────────────────────────────────────────────────

const PRODUCTS: Product[] = [
  { id: 1,  name: "Pollo Entero",        category: "Pollo",       price: 4500, description: "Pollo a la brasa marinado con chimichurri casero y especias criollas",              image: "https://images.unsplash.com/photo-1598103442097-8b74394b95c2?w=400&h=300&fit=crop&auto=format", featured: true,  active: true,  outOfStock: false },
  { id: 2,  name: "Medio Pollo",         category: "Pollo",       price: 2400, description: "Mitad de pollo a la brasa, dorado y jugoso por dentro",                             image: "https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=400&h=300&fit=crop&auto=format", featured: true,  active: true,  outOfStock: false },
  { id: 3,  name: "Cuarto de Pollo",     category: "Pollo",       price: 1300, description: "Cuarto de pollo con salsa criolla incluida",                                        image: "https://images.unsplash.com/photo-1574672280600-4accfa5b6f98?w=400&h=300&fit=crop&auto=format", featured: false, active: true,  outOfStock: false },
  { id: 4,  name: "Ensalada Mixta",      category: "Ensaladas",   price: 800,  description: "Lechuga, tomate, zanahoria rallada y aderezo de la casa",                          image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop&auto=format", featured: false, active: true,  outOfStock: false },
  { id: 5,  name: "Papas Fritas",        category: "Guarniciones", price: 700,  description: "Papas fritas crocantes con sal marina gruesa",                                     image: "https://images.unsplash.com/photo-1573080496219-bb964701c394?w=400&h=300&fit=crop&auto=format", featured: true,  active: true,  outOfStock: false },
  { id: 6,  name: "Empanada de Carne",   category: "Empanadas",   price: 380,  description: "Carne cortada a cuchillo con huevo duro, aceitunas y cebolla",                     image: "https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=400&h=300&fit=crop&auto=format", featured: false, active: true,  outOfStock: false },
  { id: 7,  name: "Empanada de Pollo",   category: "Empanadas",   price: 380,  description: "Pollo desmenuzado con morrón, cebolla y especias seleccionadas",                   image: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400&h=300&fit=crop&auto=format", featured: false, active: true,  outOfStock: false },
  { id: 8,  name: "Milanesa Napolitana", category: "Especiales",  price: 3200, description: "Milanesa de ternera con salsa de tomate, jamón y mozzarella gratinada",            image: "https://images.unsplash.com/photo-1585703900468-13b01e9f8b94?w=400&h=300&fit=crop&auto=format", featured: true,  active: true,  outOfStock: false },
  { id: 9,  name: "Provoleta",           category: "Especiales",  price: 1200, description: "Provolone a la plancha con orégano y aceite de oliva extra virgen",                image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&h=300&fit=crop&auto=format", featured: false, active: true,  outOfStock: true  },
  { id: 10, name: "Ensalada César",      category: "Ensaladas",   price: 1100, description: "Lechuga romana, crutones artesanales, parmesano y aderezo césar",                  image: "https://images.unsplash.com/photo-1550304943-4f24f54ddde9?w=400&h=300&fit=crop&auto=format", featured: false, active: false, outOfStock: false },
];

const CATEGORIES = ["Todos", "Pollo", "Ensaladas", "Guarniciones", "Empanadas", "Especiales"];

const SAMPLE_ORDERS: Order[] = [
  { id: "001", customer: "María González",  phone: "11-4521-8890", items: [{ name: "Pollo Entero",        qty: 1, price: 4500 }, { name: "Papas Fritas",       qty: 2, price: 700  }], status: "Pendiente",          createdAt: "10:23", estimatedTime: null,    total: 5900, type: "online"     },
  { id: "002", customer: "Carlos Pérez",    phone: "11-3312-7654", items: [{ name: "Medio Pollo",         qty: 2, price: 2400 }, { name: "Ensalada Mixta",     qty: 1, price: 800  }], status: "Programado",         createdAt: "10:45", estimatedTime: "12:30", total: 5600, type: "online"     },
  { id: "003", customer: "Ana Rodríguez",   phone: "11-5567-2341", items: [{ name: "Cuarto de Pollo",     qty: 4, price: 1300 }, { name: "Empanada de Carne",  qty: 6, price: 380  }], status: "En preparación",     createdAt: "09:55", estimatedTime: "12:00", total: 7480, type: "telefónico" },
  { id: "004", customer: "Roberto Silva",   phone: "11-6789-4523", items: [{ name: "Milanesa Napolitana", qty: 2, price: 3200 }],                                                        status: "Listo para retirar", createdAt: "09:30", estimatedTime: "11:30", total: 6400, type: "presencial" },
  { id: "005", customer: "Lucía Fernández", phone: "11-9923-1122", items: [{ name: "Pollo Entero",        qty: 1, price: 4500 }, { name: "Empanada de Pollo",  qty: 4, price: 380  }], status: "Entregado",          createdAt: "09:10", estimatedTime: "11:00", total: 6020, type: "online"     },
  { id: "006", customer: "Diego Martínez",  phone: "11-7734-5512", items: [{ name: "Medio Pollo",         qty: 1, price: 2400 }, { name: "Papas Fritas",       qty: 1, price: 700  }, { name: "Provoleta", qty: 1, price: 1200 }], status: "Pendiente", createdAt: "11:02", estimatedTime: null, total: 4300, type: "online" },
  { id: "007", customer: "Valentina Torres",phone: "11-8812-3340", items: [{ name: "Pollo Entero",        qty: 2, price: 4500 }, { name: "Ensalada Mixta",     qty: 2, price: 800  }], status: "Cancelado",          createdAt: "10:05", estimatedTime: null,    total: 10600,type: "whatsapp"   },
  { id: "008", customer: "Sebastián Ruiz",  phone: "11-6623-9901", items: [{ name: "Milanesa Napolitana", qty: 1, price: 3200 }, { name: "Empanada de Carne",  qty: 3, price: 380  }], status: "Programado",         createdAt: "11:15", estimatedTime: "13:00", total: 4340, type: "whatsapp"   },
];

// ─── Utilities ────────────────────────────────────────────────────────────────

function formatCurrency(n: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);
}

function timeAgo(createdAt: string): { label: string; minutes: number } {
  const [h, m] = createdAt.split(":").map(Number);
  const now = new Date();
  const created = new Date();
  created.setHours(h, m, 0, 0);
  const diff = Math.max(1, Math.floor((now.getTime() - created.getTime()) / 60000));
  let label = "";
  if (diff < 60) label = `Hace ${diff} min`;
  else {
    const hrs = Math.floor(diff / 60);
    const mins = diff % 60;
    label = mins > 0 ? `Hace ${hrs} h ${mins} min` : `Hace ${hrs} h`;
  }
  return { label, minutes: diff };
}

const REPROG_REASONS = ["Alta demanda", "Falta de stock", "Demora en cocina", "Otro"];

type StatusCfg = { dot: string; badge: string; label: string; Icon: any };
const STATUS: Record<OrderStatus, StatusCfg> = {
  "Pendiente":          { dot: "bg-amber-400",  badge: "bg-amber-50 border-amber-300 text-amber-700",   label: "Pendiente",          Icon: Clock        },
  "Programado":         { dot: "bg-blue-400",   badge: "bg-blue-50 border-blue-300 text-blue-700",      label: "Programado",         Icon: Calendar     },
  "En preparación":     { dot: "bg-orange-400", badge: "bg-orange-50 border-orange-300 text-orange-700",label: "En preparación",     Icon: Flame        },
  "Listo para retirar": { dot: "bg-green-500",  badge: "bg-green-50 border-green-300 text-green-700",   label: "Listo para retirar", Icon: CheckCircle  },
  "Entregado":          { dot: "bg-gray-400",   badge: "bg-gray-50 border-gray-200 text-gray-600",      label: "Entregado",          Icon: Package      },
  "Cancelado":          { dot: "bg-red-400",    badge: "bg-red-50 border-red-300 text-red-700",         label: "Cancelado",          Icon: Ban          },
};

const STATUS_MESSAGES: Record<OrderStatus, string> = {
  "Pendiente":          "Tu pedido fue recibido. La cocina lo revisará a la brevedad y asignará un horario de retiro.",
  "Programado":         "La cocina revisó tu pedido y asignó un horario de retiro. ¡Pronto comenzarán a prepararlo!",
  "En preparación":     "¡Tu pedido está siendo preparado ahora mismo! En breve estará listo.",
  "Listo para retirar": "¡Tu pedido está listo! Podés pasar a retirarlo cuando quieras.",
  "Entregado":          "El pedido fue entregado correctamente. ¡Gracias por elegirnos!",
  "Cancelado":          "Este pedido fue cancelado. Si tenés alguna consulta, llamanos al 4521-8800.",
};

function StatusBadge({ status }: { status: OrderStatus }) {
  const { badge, label, Icon } = STATUS[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${badge}`}>
      <Icon size={11} />
      {label}
    </span>
  );
}

function TypePill({ type }: { type: OrderType }) {
  const colors: Record<OrderType, string> = {
    online:      "bg-violet-50 border-violet-200 text-violet-700",
    presencial:  "bg-teal-50 border-teal-200 text-teal-700",
    telefónico:  "bg-sky-50 border-sky-200 text-sky-700",
    whatsapp:    "bg-emerald-50 border-emerald-200 text-emerald-700",
  };
  const icons: Record<OrderType, string> = { online: "🌐", presencial: "🏠", telefónico: "📞", whatsapp: "💬" };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border capitalize ${colors[type]}`}>
      <span className="text-[10px]">{icons[type]}</span>{type}
    </span>
  );
}

// ─── Customer: Home ────────────────────────────────────────────────────────────

function CustomerHome({ onNavigate }: { onNavigate: (v: string) => void }) {
  const featured = PRODUCTS.filter(p => p.featured && p.active && !p.outOfStock);
  return (
    <div>
      <div className="relative h-[500px] overflow-hidden">
        <img src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1400&h=600&fit=crop&auto=format" alt="Rotisería Los Hermanos" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/45 to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-center px-8 md:px-16 max-w-2xl">
          <div className="flex items-center gap-2 mb-5">
            <Flame size={16} className="text-amber-400" />
            <span className="text-amber-400 font-mono text-xs tracking-[0.2em] uppercase">Rotisería desde 1998</span>
          </div>
          <h1 className="font-display text-white text-5xl md:text-7xl font-bold leading-none mb-5">Los<br />Hermanos</h1>
          <p className="text-white/80 text-base md:text-lg leading-relaxed mb-8 max-w-md">
            Pollos a la brasa, milanesas y empanadas caseras. Preparamos todo con ingredientes frescos, todos los días.
          </p>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => onNavigate("menu")} className="bg-primary text-primary-foreground px-7 py-3.5 rounded-xl font-semibold hover:bg-primary/90 transition-colors flex items-center gap-2 shadow-lg">
              <ShoppingCart size={18} /> Hacer un pedido
            </button>
          </div>
        </div>
      </div>

      <div className="bg-primary text-primary-foreground">
        <div className="max-w-6xl mx-auto px-6 py-3 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-sm">
          <div className="flex items-center gap-2"><Clock size={14} /><span className="opacity-80">Lun–Vie</span><span className="font-semibold">10:00 – 21:00</span></div>
          <div className="hidden md:block w-px h-4 bg-white/25" />
          <div className="flex items-center gap-2"><Clock size={14} /><span className="opacity-80">Sábado</span><span className="font-semibold">10:00 – 22:00</span></div>
          <div className="hidden md:block w-px h-4 bg-white/25" />
          <div className="flex items-center gap-2"><Clock size={14} /><span className="opacity-80">Domingo</span><span className="font-semibold">11:00 – 20:00</span></div>
          <div className="hidden md:block w-px h-4 bg-white/25" />
          <div className="flex items-center gap-2"><Phone size={14} /><span className="font-semibold">4521-8800</span></div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-14">
        <div className="mb-12">
          <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-2">Nuestras especialidades</p>
          <h2 className="font-display text-4xl font-bold">¿Qué te provoca hoy?</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
          {[
            { name: "Pollo a la Brasa", emoji: "🍗", desc: "El clásico de la casa" },
            { name: "Milanesas",        emoji: "🥩", desc: "Caseras y jugosas"     },
            { name: "Empanadas",        emoji: "🫓", desc: "Horneadas al momento"  },
            { name: "Guarniciones",     emoji: "🥗", desc: "Siempre frescas"       },
          ].map(cat => (
            <button key={cat.name} onClick={() => onNavigate("menu")} className="group bg-card border border-border rounded-2xl p-6 text-center hover:border-primary/50 hover:shadow-lg transition-all duration-200">
              <div className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-200">{cat.emoji}</div>
              <div className="font-semibold text-foreground group-hover:text-primary transition-colors text-sm">{cat.name}</div>
              <div className="text-xs text-muted-foreground mt-1">{cat.desc}</div>
            </button>
          ))}
        </div>
        <div className="mb-6 flex items-end justify-between">
          <div>
            <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-1">Hoy en el menú</p>
            <h2 className="font-display text-4xl font-bold">Destacados del día</h2>
          </div>
          <button onClick={() => onNavigate("menu")} className="text-sm text-primary font-medium hover:underline hidden md:block">Ver todo el menú →</button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {featured.map(product => (
            <div key={product.id} className="group bg-card border border-border rounded-2xl overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className="h-44 overflow-hidden bg-muted">
                <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              </div>
              <div className="p-4">
                <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1">{product.category}</p>
                <h3 className="font-semibold text-foreground mb-1">{product.name}</h3>
                <p className="text-xs text-muted-foreground mb-4 leading-relaxed line-clamp-2">{product.description}</p>
                <div className="flex items-center justify-between">
                  <span className="font-display font-bold text-primary text-xl">{formatCurrency(product.price)}</span>
                  <button onClick={() => onNavigate("menu")} className="text-xs bg-primary/10 text-primary px-3 py-1.5 rounded-lg hover:bg-primary hover:text-primary-foreground transition-colors font-semibold">
                    Agregar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Customer: Menu ────────────────────────────────────────────────────────────

function CustomerMenu({ cart, onAddToCart, onNavigate }: { cart: CartItem[]; onAddToCart: (p: Product) => void; onNavigate: (v: string) => void }) {
  const [category, setCategory] = useState("Todos");
  const [search, setSearch] = useState("");

  const filtered = PRODUCTS.filter(p => {
    if (!p.active) return false;
    if (category !== "Todos" && p.category !== category) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
        <div>
          <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-1">Rotisería Los Hermanos</p>
          <h1 className="font-display text-4xl font-bold">Nuestro Menú</h1>
        </div>
        {cartCount > 0 && (
          <button onClick={() => onNavigate("cart")} className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-3 rounded-xl font-semibold hover:bg-primary/90 transition-colors shadow-md">
            <ShoppingCart size={18} /> Ver carrito ({cartCount})
          </button>
        )}
      </div>
      <div className="relative mb-4">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={17} />
        <input type="text" placeholder="Buscar productos..." value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-11 pr-4 py-3 border border-border rounded-xl bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground placeholder:text-muted-foreground" />
      </div>
      <div className="flex gap-2 overflow-x-auto pb-2 mb-8 scrollbar-hide">
        {CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setCategory(cat)}
            className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium border transition-all ${category === cat ? "bg-primary text-primary-foreground border-primary shadow-sm" : "bg-card border-border text-foreground hover:border-primary/40"}`}>
            {cat}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map(product => {
          const inCart = cart.find(i => i.id === product.id);
          return (
            <div key={product.id} className={`bg-card border rounded-2xl overflow-hidden transition-all ${product.outOfStock ? "border-border opacity-70" : "border-border hover:shadow-lg"}`}>
              <div className="h-48 overflow-hidden bg-muted relative">
                <img src={product.image} alt={product.name} className={`w-full h-full object-cover ${product.outOfStock ? "grayscale" : ""}`} />
                {product.outOfStock && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <span className="bg-white text-gray-800 font-bold text-sm px-4 py-1.5 rounded-full shadow">Sin stock</span>
                  </div>
                )}
              </div>
              <div className="p-5">
                <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-1">{product.category}</p>
                <h3 className="font-semibold text-lg text-foreground mb-1">{product.name}</h3>
                <p className="text-sm text-muted-foreground mb-5 leading-relaxed">{product.description}</p>
                <div className="flex items-center justify-between">
                  <span className="font-display font-bold text-primary text-2xl">{formatCurrency(product.price)}</span>
                  {product.outOfStock ? (
                    <span className="text-xs text-muted-foreground border border-border px-3 py-2 rounded-xl">No disponible</span>
                  ) : (
                    <button onClick={() => onAddToCart(product)}
                      className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${inCart ? "bg-primary text-primary-foreground shadow-md" : "bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground"}`}>
                      <Plus size={15} />
                      {inCart ? `(${inCart.qty}) Agregar más` : "Agregar"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Customer: Cart ────────────────────────────────────────────────────────────

function CustomerCart({ cart, onUpdateCart, onConfirm }: { cart: CartItem[]; onUpdateCart: (id: number, delta: number) => void; onConfirm: (name: string, phone: string) => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);

  if (cart.length === 0) {
    return (
      <div className="max-w-lg mx-auto px-6 py-20 text-center">
        <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
          <ShoppingCart size={32} className="text-muted-foreground" />
        </div>
        <h2 className="font-display text-2xl font-bold mb-2">Tu carrito está vacío</h2>
        <p className="text-muted-foreground text-sm">Explorá el menú y agregá lo que te guste.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="font-display text-4xl font-bold mb-8">Tu Pedido</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-3">
          {cart.map(item => (
            <div key={item.id} className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl overflow-hidden bg-muted shrink-0">
                <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground">{item.name}</h3>
                <span className="text-sm text-muted-foreground font-mono">{formatCurrency(item.price)} c/u</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => onUpdateCart(item.id, -1)} className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors">
                  {item.qty === 1 ? <Trash2 size={13} className="text-destructive" /> : <Minus size={13} />}
                </button>
                <span className="w-7 text-center font-mono font-bold">{item.qty}</span>
                <button onClick={() => onUpdateCart(item.id, 1)} className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors">
                  <Plus size={13} />
                </button>
              </div>
              <span className="font-mono font-bold text-foreground w-24 text-right">{formatCurrency(item.price * item.qty)}</span>
            </div>
          ))}
        </div>
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-2xl p-5">
            <h2 className="font-semibold text-lg mb-4">Resumen</h2>
            <div className="space-y-2 mb-4">
              {cart.map(item => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{item.name} ×{item.qty}</span>
                  <span className="font-mono">{formatCurrency(item.price * item.qty)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-border pt-3 flex justify-between items-center">
              <span className="font-bold">Total</span>
              <span className="font-display font-bold text-primary text-2xl">{formatCurrency(total)}</span>
            </div>
          </div>
          <div className="bg-card border border-border rounded-2xl p-5">
            <h2 className="font-semibold text-lg mb-4">Tus datos</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Nombre completo</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={15} />
                  <input type="text" placeholder="Juan García" value={name} onChange={e => setName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm placeholder:text-muted-foreground" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Teléfono</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={15} />
                  <input type="tel" placeholder="11-1234-5678" value={phone} onChange={e => setPhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm placeholder:text-muted-foreground" />
                </div>
              </div>
            </div>
            <div className="mt-4 p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex gap-2.5 leading-relaxed">
              <Clock size={14} className="shrink-0 mt-0.5 text-amber-600" />
              <span>La cocina asignará el horario estimado de retiro. No seleccionás la hora — ellos te la informan.</span>
            </div>
          </div>
          <button onClick={() => name.trim() && phone.trim() && onConfirm(name.trim(), phone.trim())}
            disabled={!name.trim() || !phone.trim()}
            className="w-full bg-primary text-primary-foreground py-4 rounded-2xl font-bold text-lg hover:bg-primary/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg">
            Confirmar Pedido
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Customer: Confirmation ────────────────────────────────────────────────────

function CustomerConfirmation({ orderId, orders, onTrack }: { orderId: string; orders: Order[]; onTrack: () => void }) {
  const order = orders.find(o => o.id === orderId);
  return (
    <div className="max-w-lg mx-auto px-6 py-14 text-center">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-100">
        <CheckCircle size={38} className="text-green-600" />
      </div>
      <h1 className="font-display text-4xl font-bold mb-2">¡Pedido recibido!</h1>
      <p className="text-muted-foreground mb-8">Tu pedido fue registrado y está siendo revisado por la cocina.</p>
      <div className="bg-card border border-border rounded-2xl p-6 text-left mb-6">
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-border">
          <span className="text-sm text-muted-foreground">Número de pedido</span>
          <span className="font-mono font-bold text-2xl text-primary">#{orderId}</span>
        </div>
        <div className="mb-4"><StatusBadge status="Pendiente" /></div>
        {order && (
          <div className="space-y-1.5 mb-4">
            {order.items.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{item.name} ×{item.qty}</span>
                <span className="font-mono">{formatCurrency(item.price * item.qty)}</span>
              </div>
            ))}
            <div className="pt-2 border-t border-border flex justify-between font-bold text-sm">
              <span>Total</span>
              <span className="font-mono text-primary">{formatCurrency(order.total)}</span>
            </div>
          </div>
        )}
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 flex gap-3 leading-relaxed">
          <Clock size={16} className="shrink-0 mt-0.5 text-amber-600" />
          <span>La cocina asignará el horario estimado de retiro. Podés seguir el estado de tu pedido en cualquier momento.</span>
        </div>
      </div>
      <button onClick={onTrack} className="w-full bg-primary text-primary-foreground py-4 rounded-2xl font-bold hover:bg-primary/90 transition-colors shadow-lg">
        Seguir estado del pedido
      </button>
    </div>
  );
}

// ─── Customer: Tracking ────────────────────────────────────────────────────────

function CustomerTracking({ orders, preloadOrderId }: { orders: Order[]; preloadOrderId?: string }) {
  const [searchType, setSearchType] = useState<"numero" | "telefono">("numero");
  const [query, setQuery] = useState(preloadOrderId ?? "");
  const [searched, setSearched] = useState(!!preloadOrderId);
  const [result, setResult] = useState<Order | "not-found" | null>(() => {
    if (preloadOrderId) {
      return orders.find(o => o.id === preloadOrderId) ?? "not-found";
    }
    return null;
  });

  const handleSearch = () => {
    const q = query.trim().replace(/\D/g, "");
    let found: Order | undefined;
    if (searchType === "numero") {
      found = orders.find(o => o.id === query.trim() || o.id === query.trim().padStart(3, "0"));
    } else {
      found = orders.find(o => o.phone.replace(/\D/g, "").includes(q));
    }
    setResult(found ?? "not-found");
    setSearched(true);
  };

  const statuses: OrderStatus[] = ["Pendiente", "Programado", "En preparación", "Listo para retirar", "Entregado"];

  const SearchForm = (
    <div className="max-w-lg mx-auto px-6 py-12">
      <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-2">Rotisería Los Hermanos</p>
      <h1 className="font-display text-4xl font-bold mb-2">Seguimiento</h1>
      <p className="text-muted-foreground mb-8">Consultá el estado de tu pedido con el número de pedido o tu teléfono.</p>

      <div className="bg-card border border-border rounded-2xl p-6">
        {/* Toggle */}
        <div className="grid grid-cols-2 gap-2 mb-5 p-1 bg-muted rounded-xl">
          <button onClick={() => setSearchType("numero")}
            className={`py-2 rounded-lg text-sm font-semibold transition-all ${searchType === "numero" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground"}`}>
            Nº de Pedido
          </button>
          <button onClick={() => setSearchType("telefono")}
            className={`py-2 rounded-lg text-sm font-semibold transition-all ${searchType === "telefono" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground"}`}>
            Teléfono
          </button>
        </div>

        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-2">
          {searchType === "numero" ? "Número de pedido" : "Número de teléfono"}
        </label>
        <div className="relative mb-4">
          {searchType === "numero"
            ? <ClipboardList className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            : <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          }
          <input
            type="text"
            placeholder={searchType === "numero" ? "Ej: 001" : "Ej: 11-4521-8890"}
            value={query}
            onChange={e => { setQuery(e.target.value); setSearched(false); setResult(null); }}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
            className="w-full pl-9 pr-4 py-3 border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 text-base placeholder:text-muted-foreground"
          />
        </div>

        {searched && result === "not-found" && (
          <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-xl flex gap-2.5 text-sm text-red-700">
            <AlertCircle size={15} className="shrink-0 mt-0.5" />
            <span>No encontramos ningún pedido con ese dato. Verificá el número o teléfono ingresado.</span>
          </div>
        )}

        <button onClick={handleSearch} disabled={!query.trim()}
          className="w-full bg-primary text-primary-foreground py-3.5 rounded-xl font-bold hover:bg-primary/90 transition-colors disabled:opacity-40 flex items-center justify-center gap-2">
          <Search size={17} /> Consultar estado
        </button>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Pedidos de muestra: <button onClick={() => { setQuery("001"); setSearchType("numero"); }} className="underline text-primary">001</button>,{" "}
          <button onClick={() => { setQuery("002"); setSearchType("numero"); }} className="underline text-primary">002</button>,{" "}
          <button onClick={() => { setQuery("11-4521-8890"); setSearchType("telefono"); }} className="underline text-primary">11-4521-8890</button>
        </p>
      </div>
    </div>
  );

  if (!searched || result === null) return SearchForm;
  if (result === "not-found") return SearchForm;

  const order = result;
  const currentIndex = order.status === "Cancelado" ? -1 : statuses.indexOf(order.status);

  return (
    <div className="max-w-xl mx-auto px-6 py-10">
      <button onClick={() => { setResult(null); setSearched(false); setQuery(""); }}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        ← Buscar otro pedido
      </button>

      <div className="bg-card border border-border rounded-2xl p-5 mb-6">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Pedido</p>
            <p className="font-mono font-bold text-3xl text-primary">#{order.id}</p>
          </div>
          <StatusBadge status={order.status} />
        </div>

        <div className="flex items-center gap-2 mb-1 text-sm">
          <User size={13} className="text-muted-foreground" />
          <span className="font-semibold">{order.customer}</span>
        </div>
        <div className="flex items-center gap-2 mb-4 text-xs text-muted-foreground">
          <Clock size={12} />
          <span>Ingresó a las {order.createdAt} hs</span>
          <span>·</span>
          <TypePill type={order.type} />
        </div>

        {/* Estimated time */}
        {order.estimatedTime && order.status !== "Cancelado" ? (
          <div className="flex items-center gap-4 p-4 bg-primary/5 border border-primary/20 rounded-xl mb-4">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shrink-0">
              <Clock size={18} className="text-primary-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Horario estimado de retiro</p>
              <p className="font-mono font-bold text-2xl text-foreground">{order.estimatedTime} hs</p>
            </div>
          </div>
        ) : order.status !== "Cancelado" && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 flex gap-3 mb-4 leading-relaxed">
            <Clock size={16} className="shrink-0 mt-0.5 text-amber-600" />
            <span>La cocina aún no asignó un horario de retiro. Te notificaremos cuando esté listo.</span>
          </div>
        )}

        {/* Status message */}
        <div className={`p-3.5 rounded-xl text-sm leading-relaxed flex gap-2.5 ${order.status === "Cancelado" ? "bg-red-50 border border-red-200 text-red-800" : "bg-secondary border border-border text-foreground"}`}>
          {order.status === "Cancelado" ? <Ban size={15} className="shrink-0 mt-0.5 text-red-600" /> : <CheckCircle size={15} className="shrink-0 mt-0.5 text-primary" />}
          <span>{STATUS_MESSAGES[order.status]}</span>
        </div>
      </div>

      {/* Timeline (only for non-cancelled) */}
      {order.status !== "Cancelado" ? (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">Progreso del pedido</p>
          <div className="space-y-0">
            {statuses.map((status, i) => {
              const done = i < currentIndex;
              const current = i === currentIndex;
              const pending = i > currentIndex;
              const { Icon } = STATUS[status];
              return (
                <div key={status} className="flex items-start gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`w-9 h-9 rounded-full border-2 flex items-center justify-center transition-all ${done ? "bg-green-500 border-green-500" : current ? "bg-primary border-primary" : "bg-card border-border"}`}>
                      {done ? <Check size={15} className="text-white" /> : <Icon size={15} className={pending ? "text-muted-foreground" : "text-white"} />}
                    </div>
                    {i < statuses.length - 1 && <div className={`w-0.5 h-8 mt-1 ${done ? "bg-green-400" : "bg-border"}`} />}
                  </div>
                  <div className="pb-6 pt-1">
                    <p className={`font-medium text-sm ${pending ? "text-muted-foreground" : "text-foreground"}`}>{STATUS[status].label}</p>
                    {current && <p className="text-xs text-primary mt-0.5 font-medium">← Estado actual</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-center">
          <Ban size={32} className="text-red-400 mx-auto mb-3" />
          <p className="font-semibold text-red-800 mb-1">Pedido cancelado</p>
          <p className="text-sm text-red-700">Si tenés alguna consulta, llamanos al <span className="font-mono font-bold">4521-8800</span></p>
        </div>
      )}
    </div>
  );
}

// ─── Receptionist: Dashboard ───────────────────────────────────────────────────

function ReceptionistDashboard({ orders, onNavigate }: { orders: Order[]; onNavigate: (v: string) => void }) {
  const pending    = orders.filter(o => o.status === "Pendiente");
  const programmed = orders.filter(o => o.status === "Programado");
  const ready      = orders.filter(o => o.status === "Listo para retirar");
  const delivered  = orders.filter(o => o.status === "Entregado");

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-1">Panel de recepción</p>
          <h1 className="font-display text-4xl font-bold">Bienvenida</h1>
          <p className="text-muted-foreground mt-1 text-sm">{new Date().toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}</p>
        </div>
        <button onClick={() => onNavigate("create")} className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-3 rounded-xl font-semibold hover:bg-primary/90 transition-colors shadow-md">
          <PlusCircle size={18} /> Nuevo Pedido
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {[
          { label: "Pendientes",         value: pending.length,    color: "text-amber-600",  bg: "bg-amber-50 border-amber-200",  Icon: Clock        },
          { label: "Programados",        value: programmed.length, color: "text-blue-600",   bg: "bg-blue-50 border-blue-200",    Icon: Calendar     },
          { label: "Listos para retirar",value: ready.length,      color: "text-green-600",  bg: "bg-green-50 border-green-200",  Icon: CheckCircle  },
          { label: "Entregados hoy",     value: delivered.length,  color: "text-gray-500",   bg: "bg-gray-50 border-gray-200",    Icon: Package      },
        ].map(stat => (
          <div key={stat.label} className={`rounded-2xl border p-5 ${stat.bg}`}>
            <stat.Icon size={22} className={stat.color} />
            <p className={`font-mono font-bold text-4xl mt-3 mb-1 ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-muted-foreground leading-snug">{stat.label}</p>
          </div>
        ))}
      </div>

      <h2 className="font-semibold text-base mb-3 flex items-center gap-2">
        <span className="w-2 h-2 bg-amber-400 rounded-full" /> Pedidos Pendientes
      </h2>
      <div className="space-y-2 mb-10">
        {pending.length === 0 && <p className="text-muted-foreground text-sm py-4 text-center bg-card border border-dashed border-border rounded-xl">No hay pedidos pendientes en este momento</p>}
        {pending.map(order => (
          <div key={order.id} className="bg-card border border-amber-200 rounded-2xl p-4 flex items-center gap-4 hover:shadow-sm transition-shadow">
            <div className="w-1 self-stretch bg-amber-400 rounded-full shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="font-mono text-xs text-muted-foreground">#{order.id}</span>
                <span className="font-semibold text-sm">{order.customer}</span>
                <TypePill type={order.type} />
              </div>
              <p className="text-xs text-muted-foreground truncate">{order.items.map(i => `${i.name} ×${i.qty}`).join(" · ")}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-mono font-bold">{formatCurrency(order.total)}</p>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">{order.createdAt} hs</p>
            </div>
          </div>
        ))}
      </div>

      <h2 className="font-semibold text-base mb-3 flex items-center gap-2">
        <span className="w-2 h-2 bg-green-500 rounded-full" /> Listos para retirar
      </h2>
      <div className="space-y-2">
        {ready.length === 0 && <p className="text-muted-foreground text-sm py-4 text-center bg-card border border-dashed border-border rounded-xl">No hay pedidos listos en este momento</p>}
        {ready.map(order => (
          <div key={order.id} className="bg-card border border-green-200 rounded-2xl p-4 flex items-center gap-4">
            <div className="w-1 self-stretch bg-green-500 rounded-full shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="font-mono text-xs text-muted-foreground">#{order.id}</span>
                <span className="font-semibold text-sm">{order.customer}</span>
                <Phone size={12} className="text-muted-foreground" />
                <span className="text-xs text-muted-foreground font-mono">{order.phone}</span>
              </div>
              <p className="text-xs text-muted-foreground">{order.items.map(i => `${i.name} ×${i.qty}`).join(" · ")}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-semibold text-green-700">Retiro: {order.estimatedTime} hs</p>
              <button className="mt-1.5 text-xs bg-green-500 text-white px-3 py-1 rounded-full hover:bg-green-600 transition-colors font-medium">
                ✓ Marcar entregado
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Receptionist: Orders List ─────────────────────────────────────────────────

function ReceptionistOrders({ orders }: { orders: Order[] }) {
  const [filter, setFilter] = useState("Todos");
  const tabs: { key: string; label: string }[] = [
    { key: "Todos",                label: "Todos"                },
    { key: "Pendiente",            label: "Pendiente"            },
    { key: "Programado",           label: "Programado"           },
    { key: "En preparación",       label: "En preparación"       },
    { key: "Listo para retirar",   label: "Listo para retirar"   },
    { key: "Entregado",            label: "Entregado"            },
    { key: "Cancelado",            label: "Cancelado"            },
  ];
  const filtered = filter === "Todos" ? orders : orders.filter(o => o.status === filter);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <h1 className="font-display text-4xl font-bold mb-6">Lista de Pedidos</h1>
      <div className="flex gap-2 flex-wrap mb-5">
        {tabs.map(t => {
          const count = t.key === "Todos" ? orders.length : orders.filter(o => o.status === t.key).length;
          return (
            <button key={t.key} onClick={() => setFilter(t.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors flex items-center gap-1.5 ${filter === t.key ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:border-primary/40"}`}>
              {t.label}
              <span className={`font-mono ${filter === t.key ? "bg-white/20" : "bg-muted"} px-1.5 py-0.5 rounded-full`}>{count}</span>
            </button>
          );
        })}
      </div>
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-secondary border-b border-border">
                {["#", "Cliente", "Teléfono", "Productos", "Total", "Estado", "Horario", "Ingreso", "Canal"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(order => (
                <tr key={order.id} className={`transition-colors hover:bg-secondary/40 ${order.status === "Cancelado" ? "opacity-60" : ""}`}>
                  <td className="px-4 py-3 font-mono font-bold text-primary">#{order.id}</td>
                  <td className="px-4 py-3 font-semibold whitespace-nowrap">{order.customer}</td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{order.phone}</td>
                  <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">{order.items.map(i => `${i.name} ×${i.qty}`).join(", ")}</td>
                  <td className="px-4 py-3 font-mono font-bold whitespace-nowrap">{formatCurrency(order.total)}</td>
                  <td className="px-4 py-3 whitespace-nowrap"><StatusBadge status={order.status} /></td>
                  <td className="px-4 py-3 font-mono text-sm whitespace-nowrap">
                    {order.estimatedTime ? `${order.estimatedTime} hs` : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">{order.createdAt} hs</td>
                  <td className="px-4 py-3"><TypePill type={order.type} /></td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground text-sm">Sin pedidos en este estado</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Receptionist: Create Order ────────────────────────────────────────────────

function ReceptionistCreateOrder({ onConfirm }: { onConfirm: () => void }) {
  const [orderCart, setOrderCart] = useState<CartItem[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [orderType, setOrderType] = useState<"presencial" | "telefónico" | "whatsapp">("presencial");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Todos");
  const [confirmed, setConfirmed] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const filtered = PRODUCTS.filter(p => {
    if (!p.active || p.outOfStock) return false;
    if (category !== "Todos" && p.category !== category) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const addItem = (p: Product) => setOrderCart(prev => {
    const ex = prev.find(i => i.id === p.id);
    if (ex) return prev.map(i => i.id === p.id ? { ...i, qty: i.qty + 1 } : i);
    return [...prev, { id: p.id, name: p.name, price: p.price, qty: 1, image: p.image }];
  });

  const updateQty = (id: number, delta: number) => setOrderCart(prev =>
    prev.map(i => i.id === id ? { ...i, qty: i.qty + delta } : i).filter(i => i.qty > 0)
  );

  const total = orderCart.reduce((s, i) => s + i.price * i.qty, 0);

  const handleConfirm = () => {
    if (!orderCart.length || !name || !phone) return;
    setConfirmed(true);
    setTimeout(() => { setConfirmed(false); onConfirm(); }, 1200);
  };

  const handleCancel = () => {
    setOrderCart([]); setName(""); setPhone(""); setShowCancelConfirm(false);
  };

  const CHANNEL_OPTIONS: { key: "presencial" | "telefónico" | "whatsapp"; label: string; emoji: string }[] = [
    { key: "presencial",  label: "Presencial",  emoji: "🏠" },
    { key: "telefónico",  label: "Telefónico",  emoji: "📞" },
    { key: "whatsapp",    label: "WhatsApp",    emoji: "💬" },
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-sm mx-4 shadow-2xl">
            <h2 className="font-display font-bold text-xl mb-2">¿Cancelar pedido?</h2>
            <p className="text-muted-foreground text-sm mb-5">Se perderán todos los datos ingresados hasta ahora.</p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setShowCancelConfirm(false)}
                className="py-2.5 rounded-xl border border-border font-semibold text-sm hover:bg-secondary transition-colors">
                Volver
              </button>
              <button onClick={handleCancel}
                className="py-2.5 rounded-xl bg-destructive text-white font-semibold text-sm hover:bg-destructive/90 transition-colors">
                Sí, cancelar
              </button>
            </div>
          </div>
        </div>
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
            {CATEGORIES.map(c => (
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

// ─── Kitchen: Panel ────────────────────────────────────────────────────────────

function AgeIndicator({ createdAt }: { createdAt: string }) {
  const { label, minutes } = timeAgo(createdAt);
  const color =
    minutes < 10 ? "text-green-700 bg-green-50 border-green-200" :
    minutes < 25 ? "text-amber-700 bg-amber-50 border-amber-200" :
                   "text-red-700 bg-red-50 border-red-200";
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium border px-2 py-0.5 rounded-full ${color}`}>
      <Clock size={10} />
      {label}
    </span>
  );
}

function KitchenPanel({ orders, onGoAssign }: { orders: Order[]; onGoAssign: (id: string) => void }) {
  const active = orders.filter(o => o.status !== "Entregado" && o.status !== "Listo para retirar" && o.status !== "Cancelado");
  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-11 h-11 bg-primary rounded-2xl flex items-center justify-center shadow-md">
          <ChefHat size={20} className="text-primary-foreground" />
        </div>
        <div>
          <h1 className="font-display text-4xl font-bold leading-none">Panel de Cocina</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {active.length} pedido{active.length !== 1 ? "s" : ""} activo{active.length !== 1 ? "s" : ""} — {new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })} hs
          </p>
        </div>
      </div>

      {active.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <ChefHat size={48} className="mx-auto mb-4 opacity-20" />
          <p className="font-medium">Sin pedidos activos en este momento</p>
        </div>
      )}

      <div className="space-y-3">
        {active.map(order => {
          const noTime = !order.estimatedTime;
          const { minutes } = timeAgo(order.createdAt);
          const urgentBorder = minutes >= 25 ? "border-red-300 shadow-red-50 shadow-md" : noTime ? "border-amber-300 shadow-amber-50 shadow-md" : "border-border";
          return (
            <div key={order.id} className={`bg-card border rounded-2xl p-5 transition-all ${urgentBorder}`}>
              <div className="flex items-start gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap mb-2">
                    <span className="font-mono font-bold text-primary text-xl">#{order.id}</span>
                    <StatusBadge status={order.status} />
                    <TypePill type={order.type} />
                    {noTime && <span className="text-xs bg-amber-100 text-amber-700 border border-amber-300 px-2 py-0.5 rounded-full font-semibold animate-pulse">Sin horario</span>}
                  </div>
                  <div className="flex items-center gap-2 mb-2 text-sm">
                    <User size={13} className="text-muted-foreground" />
                    <span className="font-semibold">{order.customer}</span>
                    <Phone size={13} className="text-muted-foreground ml-1" />
                    <span className="text-muted-foreground font-mono text-xs">{order.phone}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {order.items.map((item, j) => (
                      <span key={j} className="bg-secondary border border-border text-sm px-3 py-1 rounded-full">
                        <span className="font-mono font-bold text-primary">{item.qty}×</span> {item.name}
                      </span>
                    ))}
                  </div>
                  {/* Age indicator row */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock size={12} />
                      <span>Ingresó: <span className="font-mono font-semibold text-foreground">{order.createdAt} hs</span></span>
                    </div>
                    <AgeIndicator createdAt={order.createdAt} />
                  </div>
                </div>
                <div className="shrink-0 text-right flex flex-col items-end gap-2">
                  <span className="font-mono font-bold text-lg text-foreground">{formatCurrency(order.total)}</span>
                  {order.estimatedTime ? (
                    <>
                      <p className="text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-2.5 py-1.5 rounded-xl">
                        Retiro: {order.estimatedTime} hs
                      </p>
                      <button onClick={() => onGoAssign(order.id)}
                        className="flex items-center gap-1.5 text-xs text-primary border border-primary/30 bg-primary/5 hover:bg-primary hover:text-primary-foreground px-3 py-1.5 rounded-xl transition-colors font-semibold">
                        <RefreshCw size={12} /> Reprogramar
                      </button>
                    </>
                  ) : (
                    <button onClick={() => onGoAssign(order.id)}
                      className="text-xs bg-primary text-primary-foreground px-4 py-2 rounded-xl hover:bg-primary/90 transition-colors font-semibold shadow-sm">
                      Asignar horario
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Kitchen: Assign ───────────────────────────────────────────────────────────

function KitchenAssign({ orders, onAssigned, preselectedId }: { orders: Order[]; onAssigned: (id: string, time: string) => void; preselectedId: string | null }) {
  const [selectedId, setSelectedId] = useState(preselectedId ?? "");
  const [time, setTime] = useState("12:00");
  const [reason, setReason] = useState("");
  const [flash, setFlash] = useState(false);

  const needsTime = orders.filter(o => o.status !== "Entregado" && o.status !== "Cancelado");
  const selected = orders.find(o => o.id === selectedId);
  const isReprogramming = !!(selected?.estimatedTime);

  const handleSelect = (id: string) => {
    setSelectedId(id);
    setReason("");
    const o = orders.find(x => x.id === id);
    setTime(o?.estimatedTime ?? "12:00");
  };

  const handleConfirm = () => {
    if (!selectedId || !time) return;
    if (isReprogramming && !reason) return;
    onAssigned(selectedId, time);
    setFlash(true);
    setTimeout(() => { setFlash(false); setSelectedId(""); setReason(""); }, 1600);
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-2">Gestión de producción</p>
      <h1 className="font-display text-4xl font-bold mb-2">Asignación de Horarios</h1>
      <p className="text-muted-foreground mb-8">Asigná o reprogramá el horario estimado de retiro para cada pedido.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Order list */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Pedidos activos ({needsTime.length})</p>
          <div className="space-y-2">
            {needsTime.map(order => {
              const hasTime = !!order.estimatedTime;
              return (
                <button key={order.id} onClick={() => handleSelect(order.id)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all ${selectedId === order.id ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-card hover:border-primary/40"}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono font-bold text-primary">#{order.id}</span>
                    <div className="flex items-center gap-2">
                      {hasTime
                        ? <span className="text-xs font-mono font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">{order.estimatedTime} hs</span>
                        : <span className="text-xs bg-amber-50 border border-amber-200 text-amber-700 px-2 py-0.5 rounded-full font-medium">Sin horario</span>
                      }
                      <AgeIndicator createdAt={order.createdAt} />
                    </div>
                  </div>
                  <p className="font-semibold text-sm mb-0.5">{order.customer}</p>
                  <p className="text-xs text-muted-foreground truncate">{order.items.map(i => `${i.name} ×${i.qty}`).join(", ")}</p>
                </button>
              );
            })}
            {needsTime.length === 0 && (
              <div className="text-center py-10 text-muted-foreground">
                <CheckCircle size={36} className="mx-auto mb-2 text-green-500" />
                <p className="text-sm font-medium">No hay pedidos activos</p>
              </div>
            )}
          </div>
        </div>

        {/* Assignment form */}
        <div>
          {selected ? (
            <div className="bg-card border border-border rounded-2xl p-5 sticky top-24">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">
                {isReprogramming ? "Reprogramar horario" : "Asignar horario de retiro"}
              </p>

              {/* Order summary */}
              <div className="bg-secondary rounded-xl p-4 mb-5">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-mono font-bold text-primary text-lg">#{selected.id}</span>
                  <TypePill type={selected.type} />
                </div>
                <p className="font-bold mb-1">{selected.customer}</p>
                <p className="text-xs text-muted-foreground font-mono mb-3">{selected.phone}</p>
                <div className="space-y-1 mb-3">
                  {selected.items.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{item.name} ×{item.qty}</span>
                      <span className="font-mono">{formatCurrency(item.price * item.qty)}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-border pt-2 flex justify-between font-bold text-sm">
                  <span>Total</span>
                  <span className="font-mono text-primary">{formatCurrency(selected.total)}</span>
                </div>
              </div>

              {/* Current time (if reprogramming) */}
              {isReprogramming && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-3">
                  <Clock size={16} className="text-blue-600 shrink-0" />
                  <div>
                    <p className="text-xs text-blue-700 font-medium">Horario actualmente asignado</p>
                    <p className="font-mono font-bold text-blue-800 text-lg">{selected.estimatedTime} hs</p>
                  </div>
                </div>
              )}

              {/* New time input */}
              <div className="mb-4">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-2">
                  {isReprogramming ? "Nueva hora de retiro" : "Hora estimada de retiro"}
                </label>
                <input type="time" value={time} onChange={e => setTime(e.target.value)}
                  className="w-full px-4 py-4 border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono text-2xl text-center" />
              </div>

              {/* Reason (only for reprogramming) */}
              {isReprogramming && (
                <div className="mb-5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-2">
                    Motivo de reprogramación <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-2">
                    {REPROG_REASONS.map(r => (
                      <label key={r} className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition-all text-sm ${reason === r ? "border-primary bg-primary/5 font-medium" : "border-border hover:border-primary/30"}`}>
                        <input type="radio" name="reason" value={r} checked={reason === r} onChange={() => setReason(r)} className="accent-primary" />
                        {r}
                      </label>
                    ))}
                  </div>
                  {isReprogramming && !reason && (
                    <p className="text-xs text-amber-700 mt-2">Seleccioná un motivo para continuar</p>
                  )}
                </div>
              )}

              {flash ? (
                <div className="w-full py-4 rounded-2xl bg-green-500 text-white font-bold flex items-center justify-center gap-2">
                  <CheckCircle size={18} /> {isReprogramming ? "¡Reprogramado!" : "¡Horario asignado!"} → Programado
                </div>
              ) : (
                <button onClick={handleConfirm} disabled={isReprogramming && !reason}
                  className="w-full bg-primary text-primary-foreground py-4 rounded-2xl font-bold hover:bg-primary/90 transition-colors shadow-md disabled:opacity-40 disabled:cursor-not-allowed">
                  {isReprogramming ? `Reprogramar — ${time} hs` : `Confirmar — Retiro a las ${time} hs`}
                </button>
              )}
            </div>
          ) : (
            <div className="bg-card border border-dashed border-border rounded-2xl p-10 text-center text-muted-foreground h-full flex flex-col items-center justify-center">
              <Clock size={40} className="mb-4 opacity-25" />
              <p className="text-sm">Seleccioná un pedido para asignar o reprogramar su horario de retiro</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Kitchen: Kanban ───────────────────────────────────────────────────────────

const KANBAN_COLS: { status: OrderStatus; color: string; bg: string; border: string }[] = [
  { status: "Pendiente",          color: "text-amber-700",  bg: "bg-amber-50/80",  border: "border-amber-200"  },
  { status: "Programado",         color: "text-blue-700",   bg: "bg-blue-50/80",   border: "border-blue-200"   },
  { status: "En preparación",     color: "text-orange-700", bg: "bg-orange-50/80", border: "border-orange-200" },
  { status: "Listo para retirar", color: "text-green-700",  bg: "bg-green-50/80",  border: "border-green-200"  },
  { status: "Cancelado",          color: "text-red-700",    bg: "bg-red-50/70",    border: "border-red-200"    },
];

// Valid transitions per status
const NEXT_STATES: Partial<Record<OrderStatus, OrderStatus>> = {
  "Pendiente":          "Programado",
  "Programado":         "En preparación",
  "En preparación":     "Listo para retirar",
  "Listo para retirar": "Entregado",
};
const CAN_CANCEL: OrderStatus[] = ["Pendiente", "Programado"];

function KitchenKanban({ orders, onUpdateStatus }: { orders: Order[]; onUpdateStatus: (id: string, s: OrderStatus) => void }) {
  return (
    <div className="px-6 py-8 min-h-[calc(100vh-120px)]">
      <h1 className="font-display text-4xl font-bold mb-2">Tablero de Producción</h1>
      <p className="text-muted-foreground mb-6">Avanzá el estado de los pedidos con los botones de cada tarjeta.</p>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 items-start">
        {KANBAN_COLS.map(col => {
          const colOrders = orders.filter(o => o.status === col.status);
          return (
            <div key={col.status} className={`rounded-2xl border ${col.border} ${col.bg} p-3`}>
              <div className={`flex items-center justify-between mb-3 ${col.color}`}>
                <span className="font-semibold text-xs leading-tight">{STATUS[col.status].label}</span>
                <span className="font-mono font-bold text-xl">{colOrders.length}</span>
              </div>
              <div className="space-y-2.5">
                {colOrders.map(order => {
                  const nextStatus = NEXT_STATES[order.status];
                  const canCancel = CAN_CANCEL.includes(order.status);
                  return (
                    <div key={order.id} className="bg-white rounded-xl border border-border p-3 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-mono font-bold text-primary">{order.id}</span>
                        <span className="font-mono text-xs text-muted-foreground">{order.createdAt}</span>
                      </div>
                      <p className="font-semibold text-sm mb-1 truncate">{order.customer}</p>
                      <div className="mb-2">
                        <AgeIndicator createdAt={order.createdAt} />
                      </div>
                      <div className="space-y-0.5 mb-3">
                        {order.items.map((item, i) => (
                          <p key={i} className="text-xs text-muted-foreground">
                            <span className="font-mono font-bold text-foreground">{item.qty}×</span> {item.name}
                          </p>
                        ))}
                      </div>
                      {order.estimatedTime && (
                        <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                          <Clock size={10} />{order.estimatedTime} hs
                        </p>
                      )}
                      <div className="space-y-1.5">
                        {nextStatus && (
                          <button onClick={() => onUpdateStatus(order.id, nextStatus)}
                            className="w-full text-xs bg-primary text-primary-foreground py-1.5 rounded-lg hover:bg-primary/90 transition-colors font-semibold">
                            → {STATUS[nextStatus].label}
                          </button>
                        )}
                        {canCancel && (
                          <button onClick={() => onUpdateStatus(order.id, "Cancelado")}
                            className="w-full text-xs border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 py-1.5 rounded-lg transition-colors font-medium">
                            Cancelar
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {colOrders.length === 0 && (
                  <div className="text-center py-6 text-muted-foreground/50 text-xs border border-dashed border-current/20 rounded-xl">
                    Sin pedidos
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Admin: Dashboard ──────────────────────────────────────────────────────────

function AdminDashboard({ orders }: { orders: Order[] }) {
  const productSales: Record<string, number> = {};
  orders.filter(o => o.status !== "Cancelado").forEach(o => o.items.forEach(i => {
    productSales[i.name] = (productSales[i.name] ?? 0) + i.qty;
  }));
  const topProducts = Object.entries(productSales).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxSales = topProducts[0]?.[1] ?? 1;
  const totalRevenue = orders.filter(o => o.status === "Entregado").reduce((s, o) => s + o.total, 0);

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-2">Panel administrativo</p>
      <h1 className="font-display text-4xl font-bold mb-8">Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {[
          { label: "Pedidos hoy",       value: orders.length,                                             Icon: ClipboardList, color: "text-blue-600",   bg: "bg-blue-50 border-blue-200"    },
          { label: "Pendientes",        value: orders.filter(o => o.status === "Pendiente").length,       Icon: Clock,         color: "text-amber-600",  bg: "bg-amber-50 border-amber-200"  },
          { label: "En preparación",    value: orders.filter(o => o.status === "En preparación").length,  Icon: Flame,         color: "text-orange-600", bg: "bg-orange-50 border-orange-200"},
          { label: "Facturado hoy",     value: formatCurrency(totalRevenue),                              Icon: TrendingUp,    color: "text-green-600",  bg: "bg-green-50 border-green-200"  },
          { label: "Cancelados hoy",    value: orders.filter(o => o.status === "Cancelado").length,       Icon: Ban,           color: "text-red-600",    bg: "bg-red-50 border-red-200"      },
        ].map(stat => (
          <div key={stat.label} className={`rounded-2xl border p-4 ${stat.bg}`}>
            <stat.Icon size={18} className={stat.color} />
            <p className={`font-mono font-bold text-2xl mt-2 mb-1 ${stat.color} leading-none`}>{stat.value}</p>
            <p className="text-xs text-muted-foreground leading-snug">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-2xl p-5">
          <h2 className="font-semibold mb-5 flex items-center gap-2">
            <TrendingUp size={16} className="text-primary" /> Productos más pedidos
          </h2>
          <div className="space-y-4">
            {topProducts.map(([name, qty], i) => (
              <div key={name} className="flex items-center gap-3">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center font-mono shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate mb-1">{name}</p>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-1.5 bg-primary rounded-full" style={{ width: `${(qty / maxSales) * 100}%` }} />
                  </div>
                </div>
                <span className="font-mono font-bold text-sm text-primary shrink-0">{qty}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5">
          <h2 className="font-semibold mb-5 flex items-center gap-2">
            <ShoppingBag size={16} className="text-primary" /> Pedidos recientes
          </h2>
          <div className="divide-y divide-border">
            {orders.slice(0, 6).map(order => (
              <div key={order.id} className="flex items-center justify-between py-2.5 gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono text-xs text-primary font-bold shrink-0">#{order.id}</span>
                  <span className="text-sm font-medium truncate">{order.customer}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge status={order.status} />
                  <span className="font-mono text-xs font-bold">{formatCurrency(order.total)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Admin: Products ───────────────────────────────────────────────────────────

function AdminProducts() {
  const [products, setProducts] = useState<Product[]>(PRODUCTS);

  const toggleActive   = (id: number) => setProducts(prev => prev.map(p => p.id === id ? { ...p, active: !p.active } : p));
  const toggleStock    = (id: number) => setProducts(prev => prev.map(p => p.id === id ? { ...p, outOfStock: !p.outOfStock } : p));

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold">Gestión de Productos</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {products.length} productos · {products.filter(p => p.active && !p.outOfStock).length} disponibles · {products.filter(p => p.outOfStock).length} sin stock
          </p>
        </div>
        <button className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-3 rounded-xl font-semibold hover:bg-primary/90 transition-colors shadow-md">
          <Plus size={18} /> Nuevo Producto
        </button>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-secondary border-b border-border">
                {["", "Producto", "Categoría", "Precio", "Visibilidad", "Disponibilidad", "Acciones"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {products.map(product => (
                <tr key={product.id} className={`transition-colors hover:bg-secondary/30 ${!product.active ? "opacity-50" : ""}`}>
                  <td className="px-4 py-3">
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-muted relative">
                      <img src={product.image} alt={product.name} className={`w-full h-full object-cover ${product.outOfStock ? "grayscale" : ""}`} />
                      {product.outOfStock && (
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                          <span className="text-white text-[8px] font-bold">SIN STOCK</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{product.name}</p>
                      {product.outOfStock && (
                        <span className="text-[10px] bg-orange-100 border border-orange-300 text-orange-700 px-1.5 py-0.5 rounded-full font-bold uppercase">Sin stock</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground max-w-xs truncate mt-0.5">{product.description}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-secondary border border-border px-2 py-1 rounded-full font-medium">{product.category}</span>
                  </td>
                  <td className="px-4 py-3 font-mono font-bold text-primary whitespace-nowrap">{formatCurrency(product.price)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold border ${product.active ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50 text-gray-500 border-gray-200"}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${product.active ? "bg-green-500" : "bg-gray-400"}`} />
                      {product.active ? "Visible" : "Oculto"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold border ${product.outOfStock ? "bg-orange-50 text-orange-700 border-orange-300" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${product.outOfStock ? "bg-orange-500" : "bg-emerald-500"}`} />
                      {product.outOfStock ? "Sin stock" : "Disponible"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => toggleStock(product.id)} title={product.outOfStock ? "Marcar disponible" : "Marcar sin stock"}
                        className={`p-1.5 rounded-lg transition-colors text-xs font-medium border ${product.outOfStock ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100" : "bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100"}`}>
                        {product.outOfStock ? "✓ Stock" : "Sin stk"}
                      </button>
                      <button onClick={() => toggleActive(product.id)} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground" title={product.active ? "Ocultar" : "Mostrar"}>
                        {product.active ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                      <button className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"><Edit size={15} /></button>
                      <button className="p-1.5 rounded-lg hover:bg-red-50 text-destructive transition-colors"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Admin: Categories ─────────────────────────────────────────────────────────

function AdminCategories() {
  const cats = [
    { name: "Pollo",        emoji: "🍗", count: 3, order: 1 },
    { name: "Ensaladas",    emoji: "🥗", count: 2, order: 2 },
    { name: "Guarniciones", emoji: "🍟", count: 1, order: 3 },
    { name: "Empanadas",    emoji: "🫓", count: 2, order: 4 },
    { name: "Especiales",   emoji: "⭐", count: 2, order: 5 },
  ];
  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold">Categorías</h1>
          <p className="text-muted-foreground mt-1 text-sm">{cats.length} categorías configuradas</p>
        </div>
        <button className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-3 rounded-xl font-semibold hover:bg-primary/90 transition-colors">
          <Plus size={18} /> Nueva Categoría
        </button>
      </div>
      <div className="space-y-2.5">
        {cats.map(cat => (
          <div key={cat.name} className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4 hover:shadow-sm transition-shadow">
            <div className="text-3xl">{cat.emoji}</div>
            <div className="flex-1">
              <p className="font-semibold">{cat.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{cat.count} producto{cat.count !== 1 ? "s" : ""} · Orden #{cat.order}</p>
            </div>
            <span className="text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-2 py-1 rounded-full">Activa</span>
            <div className="flex items-center gap-1">
              <button className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"><Edit size={15} /></button>
              <button className="p-1.5 rounded-lg hover:bg-red-50 text-destructive transition-colors"><Trash2 size={15} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

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
          <nav className="bg-card border-b border-border">
            <div className="max-w-7xl mx-auto px-4 flex">
              {[
                { k: "dashboard", l: "Dashboard",        I: LayoutDashboard },
                { k: "orders",    l: "Lista de Pedidos", I: ClipboardList   },
                { k: "create",    l: "Nuevo Pedido",     I: PlusCircle      },
              ].map(v => (
                <button key={v.k} onClick={() => setStaffView(v.k)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${staffView === v.k ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
                  <v.I size={15} />{v.l}
                </button>
              ))}
            </div>
          </nav>
          {staffView === "dashboard" && <ReceptionistDashboard orders={orders} onNavigate={setStaffView} />}
          {staffView === "orders"    && <ReceptionistOrders orders={orders} />}
          {staffView === "create"    && <ReceptionistCreateOrder onConfirm={() => setStaffView("dashboard")} />}
        </>
      )}

      {/* ── COCINA ── */}
      {role === "cocina" && (
        <>
          <nav className="bg-card border-b border-border">
            <div className="max-w-7xl mx-auto px-4 flex">
              {[
                { k: "panel",  l: "Panel",            I: ChefHat         },
                { k: "assign", l: "Asignar Horarios", I: Clock           },
                { k: "kanban", l: "Tablero",          I: LayoutDashboard },
              ].map(v => (
                <button key={v.k} onClick={() => setStaffView(v.k)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${staffView === v.k ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
                  <v.I size={15} />{v.l}
                </button>
              ))}
            </div>
          </nav>
          {staffView === "panel"  && <KitchenPanel orders={orders} onGoAssign={id => { setPreselectedAssignId(id); setStaffView("assign"); }} />}
          {staffView === "assign" && <KitchenAssign orders={orders} onAssigned={assignTime} preselectedId={preselectedAssignId} />}
          {staffView === "kanban" && <KitchenKanban orders={orders} onUpdateStatus={updateStatus} />}
        </>
      )}

      {/* ── ADMIN ── */}
      {role === "admin" && (
        <>
          <nav className="bg-card border-b border-border">
            <div className="max-w-7xl mx-auto px-4 flex">
              {[
                { k: "dashboard",  l: "Dashboard",  I: BarChart3   },
                { k: "products",   l: "Productos",  I: ShoppingBag },
                { k: "categories", l: "Categorías", I: Tag         },
              ].map(v => (
                <button key={v.k} onClick={() => setStaffView(v.k)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${staffView === v.k ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
                  <v.I size={15} />{v.l}
                </button>
              ))}
            </div>
          </nav>
          {staffView === "dashboard"  && <AdminDashboard orders={orders} />}
          {staffView === "products"   && <AdminProducts />}
          {staffView === "categories" && <AdminCategories />}
        </>
      )}
    </div>
  );
}
