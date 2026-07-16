import { useState } from "react";
import { Plus, Trash2, Edit, Eye, EyeOff } from "lucide-react";
import type { Product } from "../types";
import { PRODUCTS } from "../data/products";
import { formatCurrency } from "../lib/format";

// Gestión de productos del catálogo: alta, visibilidad y disponibilidad de stock.
export function AdminProducts() {
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
