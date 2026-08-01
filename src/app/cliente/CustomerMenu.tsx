import { useState } from "react";
import { ShoppingCart, Search, Plus } from "lucide-react";
import type { CartItem, Product } from "../types";
import { useProducts } from "../lib/useProducts";
import { formatCurrency } from "../lib/format";
import { ImageCarousel, ProductOptionsModal } from "../components/shared";

// Pantalla de menú del cliente: filtro por categoría, búsqueda y agregado de productos al carrito.
// initialCategory (default "Todos") deja que quien navega hasta acá — hoy, las tarjetas de
// categoría destacada de CustomerHome — abra el menú ya filtrado, en vez de arrancar siempre en
// el catálogo completo.
export function CustomerMenu({ cart, onAddToCart, onNavigate, initialCategory = "Todos" }: { cart: CartItem[]; onAddToCart: (line: CartItem) => void; onNavigate: (v: string) => void; initialCategory?: string }) {
  const { products, categories } = useProducts();
  const [category, setCategory] = useState(initialCategory);
  const [search, setSearch] = useState("");
  // Producto que está resolviendo sus opciones (sabor, agregados, etc.) en el modal — null
  // cuando no hay ninguno abierto. Solo se abre para productos con optionGroups; los que no
  // tienen se agregan directo con un solo click, como siempre.
  const [configuring, setConfiguring] = useState<Product | null>(null);

  const filtered = products.filter(p => {
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
        {categories.map(cat => (
          <button key={cat} onClick={() => setCategory(cat)}
            className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium border transition-all ${category === cat ? "bg-primary text-primary-foreground border-primary shadow-sm" : "bg-card border-border text-foreground hover:border-primary/40"}`}>
            {cat}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map(product => {
          const hasOptions = product.optionGroups.length > 0;
          const inCart = !hasOptions && cart.find(i => i.id === String(product.id));
          return (
            <div key={product.id} className={`bg-card border rounded-2xl overflow-hidden transition-all ${product.outOfStock ? "border-border opacity-70" : "border-border hover:shadow-lg"}`}>
              <div className="h-48 overflow-hidden bg-muted relative">
                <ImageCarousel
                  urls={product.images.map(img => img.url)}
                  alt={product.name}
                  className={`w-full h-full ${product.outOfStock ? "grayscale" : ""}`}
                />
                {product.outOfStock && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center pointer-events-none">
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
                  ) : hasOptions ? (
                    <button onClick={() => setConfiguring(product)}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground">
                      <Plus size={15} /> Elegir opciones
                    </button>
                  ) : (
                    <button onClick={() => onAddToCart({ id: String(product.id), productId: product.id, name: product.name, price: product.price, qty: 1, image: product.images[0]?.url ?? "" })}
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

      {configuring && (
        <ProductOptionsModal
          product={configuring}
          onClose={() => setConfiguring(null)}
          onConfirm={line => { onAddToCart(line); setConfiguring(null); }}
        />
      )}
    </div>
  );
}
