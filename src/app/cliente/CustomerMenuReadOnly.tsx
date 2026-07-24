import { useState } from "react";
import { Search } from "lucide-react";
import { PRODUCTS, CATEGORIES } from "../data/products";
import { formatCurrency } from "../lib/format";

// Carta de solo lectura para el QR de mostrador (ver memoria de proyecto "QR de carta para
// mostrador"): un cliente que está parado frente al mostrador escanea el QR, ve esta pantalla en
// su celular, y le dicta el pedido al recepcionista — que es quien lo carga en el sistema. Por
// eso no hay carrito ni botón de agregar (a diferencia de CustomerMenu, que sí es para pedir
// online): acá nunca se termina un pedido desde este dispositivo, solo se consulta la carta.
// Se accede vía AppCliente.tsx con el query param "?modo=carta" — no arma su propia navegación
// ni depende de sesión/estado del resto de la app cliente, para que el QR pueda apuntar a esta
// URL directamente sin pasar por la Home.
export function CustomerMenuReadOnly() {
  const [category, setCategory] = useState("Todos");
  const [search, setSearch] = useState("");

  const filtered = PRODUCTS.filter(p => {
    if (!p.active) return false;
    if (category !== "Todos" && p.category !== category) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-background" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-1">Rotisería Los Hermanos</p>
          <h1 className="font-display text-4xl font-bold">Nuestra Carta</h1>
          <p className="text-muted-foreground text-sm mt-1">Mostrale este menú a quien te esté atendiendo para hacer tu pedido.</p>
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
          {filtered.map(product => (
            <div key={product.id} className={`bg-card border rounded-2xl overflow-hidden transition-all ${product.outOfStock ? "border-border opacity-70" : "border-border"}`}>
              <div className="h-40 overflow-hidden bg-muted relative">
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
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{product.description}</p>
                <span className="font-display font-bold text-primary text-2xl">{formatCurrency(product.price)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
