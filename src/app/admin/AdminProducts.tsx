import { useState } from "react";
import { Pencil, Plus, Search, Trash2, X } from "lucide-react";
import type { Product } from "../types";
import { api } from "../lib/api";
import { useProducts } from "../lib/useProducts";
import { formatCurrency } from "../lib/format";
import { useAuth } from "../auth";
import { ConfirmDialog } from "../components/shared";

// Formulario vacío para dar de alta un producto nuevo — los booleans arrancan en los mismos
// defaults que ya usaba el array hardcodeado (activo sí, destacado/sin stock no).
const EMPTY_FORM = { name: "", category: "", price: "", description: "", image: "", featured: false, active: true, outOfStock: false };
type FormState = typeof EMPTY_FORM;

function productToForm(p: Product): FormState {
  return { name: p.name, category: p.category, price: String(p.price), description: p.description, image: p.image, featured: p.featured, active: p.active, outOfStock: p.outOfStock };
}

// Pantalla de admin para cargar y editar el catálogo de productos — reemplaza al array
// hardcodeado que vivía en src/app/data/products.ts ahora que no hay FUDO conectado a este
// sistema (ver memoria de proyecto sobre la reunión con el cliente del 24/7/2026): el admin es
// quien mantiene el catálogo y los precios a mano.
export function AdminProducts() {
  const { token } = useAuth();
  const { products, categories, loading, refresh } = useProducts();
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Todos");

  const categoryOptions = categories.filter(c => c !== "Todos");
  // Filtro de la lista (no del formulario de alta/edición): por categoría y por nombre, para
  // que sea rápido encontrar un producto puntual entre los 61 y pispear a cambiarle el precio.
  const filtered = products.filter(p => {
    if (categoryFilter !== "Todos" && p.category !== categoryFilter) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const openCreate = () => { setEditingId(null); setForm(EMPTY_FORM); setError(null); setFormOpen(true); };
  const openEdit = (p: Product) => { setEditingId(p.id); setForm(productToForm(p)); setError(null); setFormOpen(true); };
  const closeForm = () => { setFormOpen(false); setEditingId(null); };

  // Valida y guarda el formulario: crea si editingId es null, edita si no. El precio viaja como
  // texto en el form (más simple para el input) y se convierte a número recién acá.
  const handleSave = async () => {
    if (!token) return;
    const price = Number(form.price);
    if (!form.name.trim() || !form.category.trim() || !form.description.trim() || !form.image.trim() || !Number.isFinite(price) || price <= 0) {
      setError("Completá nombre, categoría, descripción, imagen y un precio válido.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const input = { name: form.name.trim(), category: form.category.trim(), price, description: form.description.trim(), image: form.image.trim(), featured: form.featured, active: form.active, outOfStock: form.outOfStock };
      if (editingId === null) {
        await api.productsCreate(token, input);
      } else {
        await api.productsUpdate(token, editingId, input);
      }
      refresh();
      closeForm();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar el producto");
    } finally {
      setSaving(false);
    }
  };

  // Activar/desactivar es un PATCH de un solo campo — no hace falta pasar por el formulario
  // completo para lo que probablemente sea la acción más frecuente día a día.
  const toggleActive = async (p: Product) => {
    if (!token) return;
    try {
      await api.productsUpdate(token, p.id, { active: !p.active });
      refresh();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Error al actualizar el producto");
    }
  };

  const handleDelete = async () => {
    if (!token || !deleteTarget) return;
    try {
      await api.productsDelete(token, deleteTarget.id);
      setDeleteTarget(null);
      refresh();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Error al borrar el producto");
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <div>
          <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-1">Catálogo</p>
          <h1 className="font-display text-4xl font-bold">Productos</h1>
          <p className="text-muted-foreground mt-1 text-sm">Cargá productos nuevos y editá precios — este sistema no está conectado a FUDO, así que el catálogo se mantiene acá.</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl font-semibold hover:bg-primary/90 transition-colors shadow-sm">
          <Plus size={16} /> Nuevo producto
        </button>
      </div>

      {deleteTarget && (
        <ConfirmDialog
          title={`¿Borrar "${deleteTarget.name}"?`}
          description="Se borra por completo del catálogo. Los pedidos ya hechos con este producto no se ven afectados. Si preferís que deje de mostrarse sin perder el registro, usá 'Desactivar' en vez de esto."
          confirmLabel="Sí, borrar"
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}

      {formOpen && (
        <div className="bg-card border border-border rounded-2xl p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg">{editingId === null ? "Nuevo producto" : "Editar producto"}</h2>
            <button onClick={closeForm} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Nombre</label>
              <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Categoría</label>
              <input type="text" list="category-options" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                placeholder="Elegí una existente o escribí una nueva"
                className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm" />
              <datalist id="category-options">
                {categoryOptions.map(c => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Precio</label>
              <input type="number" min="0" step="1" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm font-mono" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Imagen (URL)</label>
              <input type="text" value={form.image} onChange={e => setForm(f => ({ ...f, image: e.target.value }))}
                placeholder="https://…"
                className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">Descripción</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm" />
            </div>
          </div>
          <div className="flex flex-wrap gap-4 mb-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} className="accent-primary" />
              Activo (visible en el catálogo)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.outOfStock} onChange={e => setForm(f => ({ ...f, outOfStock: e.target.checked }))} className="accent-primary" />
              Sin stock
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.featured} onChange={e => setForm(f => ({ ...f, featured: e.target.checked }))} className="accent-primary" />
              Destacado (aparece en el inicio)
            </label>
          </div>
          {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
          <div className="flex gap-3">
            <button onClick={handleSave} disabled={saving}
              className="bg-primary text-primary-foreground px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-40">
              {saving ? "Guardando…" : "Guardar"}
            </button>
            <button onClick={closeForm} className="px-5 py-2.5 rounded-xl border border-border font-semibold text-sm hover:bg-secondary transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {!loading && (
        <>
          <div className="relative mb-3">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <input type="text" placeholder="Buscar productos..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-border rounded-xl bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm placeholder:text-muted-foreground" />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
            {categories.map(cat => (
              <button key={cat} onClick={() => setCategoryFilter(cat)}
                className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all ${categoryFilter === cat ? "bg-primary text-primary-foreground border-primary shadow-sm" : "bg-card border-border text-foreground hover:border-primary/40"}`}>
                {cat}
              </button>
            ))}
          </div>
        </>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando catálogo…</p>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-secondary text-left text-xs text-muted-foreground uppercase tracking-wide">
                <th className="px-4 py-2.5">Producto</th>
                <th className="px-4 py-2.5">Categoría</th>
                <th className="px-4 py-2.5">Precio</th>
                <th className="px-4 py-2.5">Estado</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(p => (
                <tr key={p.id} className={p.active ? "" : "opacity-50"}>
                  <td className="px-4 py-2.5 font-medium">{p.name}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{p.category}</td>
                  <td className="px-4 py-2.5 font-mono font-semibold">{formatCurrency(p.price)}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-1.5 flex-wrap">
                      {!p.active && <span className="text-xs bg-gray-100 text-gray-600 border border-gray-300 px-2 py-0.5 rounded-full">Inactivo</span>}
                      {p.outOfStock && <span className="text-xs bg-amber-50 text-amber-700 border border-amber-300 px-2 py-0.5 rounded-full">Sin stock</span>}
                      {p.featured && <span className="text-xs bg-primary/10 text-primary border border-primary/30 px-2 py-0.5 rounded-full">Destacado</span>}
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1.5 justify-end">
                      <button onClick={() => toggleActive(p)} title={p.active ? "Desactivar" : "Activar"}
                        className="text-xs px-2.5 py-1.5 rounded-lg border border-border hover:bg-secondary transition-colors font-medium">
                        {p.active ? "Desactivar" : "Activar"}
                      </button>
                      <button onClick={() => openEdit(p)} title="Editar" className="p-1.5 rounded-lg border border-border hover:bg-secondary transition-colors">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => setDeleteTarget(p)} title="Borrar" className="p-1.5 rounded-lg border border-border hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              {products.length === 0 ? "Todavía no hay productos cargados." : "Ningún producto coincide con la búsqueda."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
