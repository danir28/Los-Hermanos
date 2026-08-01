import { Fragment } from "react";
import { ShoppingCart, Clock, Phone, Flame } from "lucide-react";
import { useProducts } from "../lib/useProducts";
import { formatCurrency } from "../lib/format";
import { BUSINESS_PHONE_DISPLAY, BUSINESS_PHONE_TEL } from "../lib/contact";
import type { BusinessHours, DaySchedule } from "../lib/api";
import logo from "../../assets/logo.png";
import heroImage from "../../assets/hero-restaurant.jpg";

// Orden de visualización (lunes a domingo) y abreviatura de cada día — dayOfWeek en los datos
// sigue el criterio del backend (0=domingo..6=sábado, igual a Date#getDay()).
const DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const DAY_SHORT: Record<number, string> = { 0: "Dom", 1: "Lun", 2: "Mar", 3: "Mié", 4: "Jue", 5: "Vie", 6: "Sáb" };

// Texto de las franjas de un día, ej. "11:00 – 15:00" o, con horario partido,
// "11:00 – 15:00, 19:00 – 23:00".
function formatRanges(day: DaySchedule): string {
  if (!day.isOpen || day.ranges.length === 0) return "Cerrado";
  return day.ranges.map(r => `${r.openTime} – ${r.closeTime}`).join(", ");
}

function sameSchedule(a: DaySchedule, b: DaySchedule): boolean {
  return a.isOpen === b.isOpen && formatRanges(a) === formatRanges(b);
}

// Agrupa días consecutivos (en orden lunes→domingo) con el mismo horario, para mostrar
// "Lun–Vie 10:00–21:00" en vez de una línea por cada uno de los 7 días.
function groupSchedule(days: DaySchedule[]): { label: string; text: string }[] {
  const ordered = DISPLAY_ORDER.map(dow => days.find(d => d.dayOfWeek === dow)).filter((d): d is DaySchedule => !!d);
  const groups: DaySchedule[][] = [];
  for (const day of ordered) {
    const lastGroup = groups[groups.length - 1];
    if (lastGroup && sameSchedule(lastGroup[0], day)) lastGroup.push(day);
    else groups.push([day]);
  }
  return groups.map(group => {
    const first = group[0];
    const last = group[group.length - 1];
    const label = first.dayOfWeek === last.dayOfWeek ? DAY_SHORT[first.dayOfWeek] : `${DAY_SHORT[first.dayOfWeek]}–${DAY_SHORT[last.dayOfWeek]}`;
    return { label, text: formatRanges(first) };
  });
}

// Pantalla de inicio del cliente: hero con horarios, categorías rápidas y productos destacados del día.
export function CustomerHome({ onNavigate, businessHours }: { onNavigate: (v: string, category?: string) => void; businessHours: BusinessHours | null }) {
  const { products } = useProducts();
  const featured = products.filter(p => p.featured && p.active && !p.outOfStock);
  const scheduleGroups = businessHours ? groupSchedule(businessHours.days) : [];
  return (
    <div>
      <div className="relative h-[500px] overflow-hidden">
        <img src={heroImage} alt="Salón de Rotisería Los Hermanos" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/45 to-transparent" />
        <img src={logo} alt="" className="absolute top-4 right-4 md:top-8 md:right-10 w-36 md:w-52 h-auto object-contain drop-shadow-lg" />
        <div className="absolute inset-0 flex flex-col justify-center px-8 md:px-16 max-w-2xl">
          <div className="flex items-center gap-2 mb-3">
            <Flame size={16} className="text-[#E8AFC0]" />
            <span className="text-[#E8AFC0] font-mono text-xs tracking-[0.2em] uppercase">Sandwichería · Rotisería</span>
          </div>
          <h1 className="font-brand text-white text-6xl md:text-8xl leading-[0.95] mb-5 text-balance">Los Hermanos</h1>
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
          {scheduleGroups.map((group, i) => (
            <Fragment key={group.label}>
              {i > 0 && <div className="hidden md:block w-px h-4 bg-white/25" />}
              <div className="flex items-center gap-2">
                <Clock size={14} /><span className="opacity-80">{group.label}</span><span className="font-semibold">{group.text}</span>
              </div>
            </Fragment>
          ))}
          <div className="hidden md:block w-px h-4 bg-white/25" />
          <a href={`tel:${BUSINESS_PHONE_TEL}`} className="flex items-center gap-2 hover:underline"><Phone size={14} /><span className="font-semibold">{BUSINESS_PHONE_DISPLAY}</span></a>
          {businessHours && (
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${businessHours.isOpenNow ? "bg-white/20" : "bg-black/25"}`}>
              {businessHours.isOpenNow ? "Abierto ahora" : "Cerrado ahora"}
            </span>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-14">
        <div className="mb-12">
          <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-2">Nuestras especialidades</p>
          <h2 className="font-display text-4xl font-bold">¿Qué te provoca hoy?</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
          {/* category acá tiene que ser exactamente uno de los valores de CATEGORIES
              (src/app/data/products.ts) — es lo que se le pasa a onNavigate para que CustomerMenu
              abra ya filtrado (ver initialCategory en CustomerMenu.tsx). */}
          {[
            { category: "Tablas calientes",  emoji: "🍽️", desc: "Picadas para compartir" },
            { category: "Pizzas",            emoji: "🍕", desc: "Recién horneadas"        },
            { category: "Milanesa al plato", emoji: "🍖", desc: "Con papas fritas"        },
            { category: "Empanadas",         emoji: "🫓", desc: "Horneadas al momento"    },
          ].map(cat => (
            <button key={cat.category} onClick={() => onNavigate("menu", cat.category)} className="group bg-card border border-border rounded-2xl p-6 text-center hover:border-primary/50 hover:shadow-lg transition-all duration-200">
              <div className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-200">{cat.emoji}</div>
              <div className="font-semibold text-foreground group-hover:text-primary transition-colors text-sm">{cat.category}</div>
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
                <img src={product.images[0]?.url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
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
