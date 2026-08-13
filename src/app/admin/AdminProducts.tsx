import { useState } from "react";
import { ChevronDown, ChevronUp, Pencil, Plus, Search, Trash2, Upload, X } from "lucide-react";
import type { Product, ProductOptionGroup, SelectionType } from "../types";
import { api, type UpsertOptionGroupInput, type UpsertOptionInput } from "../lib/api";
import { useProducts } from "../lib/useProducts";
import { formatCurrency } from "../lib/format";
import { useAuth } from "../auth";
import { ConfirmDialog } from "../components/shared";

// Formulario vacío para dar de alta un producto nuevo — los booleans arrancan en los mismos
// defaults que ya usaba el array hardcodeado (activo sí, destacado/sin stock no). Ya no incluye
// "image": las fotos se cargan aparte, una vez que el producto existe (ver sección Fotos).
const EMPTY_FORM = { name: "", category: "", price: "", description: "", featured: false, active: true, outOfStock: false, offerAsOption: false };
type FormState = typeof EMPTY_FORM;

function productToForm(p: Product): FormState {
  return { name: p.name, category: p.category, price: String(p.price), description: p.description, featured: p.featured, active: p.active, outOfStock: p.outOfStock, offerAsOption: p.offerAsOption };
}

// Forma local de un grupo/opción mientras se edita en el sub-formulario de "Opciones del
// producto" — sin ids (se generan en el backend al guardar) y con quantityTarget/priceDelta como
// texto, más simple para inputs controlados; se convierten a UpsertOptionGroupInput recién al
// guardar (ver buildOptionGroupsPayload). sourceCategory usa "" para representar el modo manual
// (en vez de null) porque alimenta directo un <select> controlado — se convierte a null recién al
// armar el payload.
//
// Un grupo dinámico (sourceCategory no vacío) usa `defaultPriceDelta`/`overrides` en vez de
// `options` (que queda vacío ahí): `defaultPriceDelta` es el precio que aporta cualquier sabor
// SIN precio propio, `overrides` es un precio puntual por producto para los pocos que sí difieren
// (ej. "Super" a $10000 cuando el resto de las mitades de pizza valen $8500) — se sigue leyendo el
// SABOR desde el catálogo (sourceCategory), nunca se tipea a mano, solo el precio.
type LocalOption = { name: string; priceDelta: string };
type LocalOverride = { sourceProductId: number; name: string; priceDelta: string };
type LocalGroup = { name: string; selectionType: SelectionType; required: boolean; quantityTarget: string; sourceCategory: string; defaultPriceDelta: string; options: LocalOption[]; overrides: LocalOverride[] };

function groupToLocal(g: ProductOptionGroup): LocalGroup {
  const dynamic = g.sourceCategory !== null;
  return {
    name: g.name,
    selectionType: g.selectionType,
    required: g.required,
    quantityTarget: g.quantityTarget !== null ? String(g.quantityTarget) : "",
    sourceCategory: g.sourceCategory ?? "",
    defaultPriceDelta: String(g.defaultPriceDelta),
    // g.options ya viene resuelto por el backend (ver ProductOptionGroupDTO): para un grupo
    // dinámico, "id" es el id del producto fuente y "priceDelta" ya incluye el default o el
    // override que corresponda — alcanza con precargar overrides con eso, sin distinguir acá
    // cuál era explícito en la base (se recalcula entero al guardar).
    options: dynamic ? [] : g.options.map(o => ({ name: o.name, priceDelta: String(o.priceDelta) })),
    overrides: dynamic ? g.options.map(o => ({ sourceProductId: o.id, name: o.name, priceDelta: String(o.priceDelta) })) : [],
  };
}

const SELECTION_TYPE_LABELS: Record<SelectionType, string> = {
  single: "Selector único",
  multiple: "Selector múltiple",
  quantity: "Cantidad a repartir",
};

// Pantalla de admin para cargar y editar el catálogo de productos — reemplaza al array
// hardcodeado que vivía en src/app/data/products.ts ahora que no hay FUDO conectado a este
// sistema (ver memoria de proyecto sobre la reunión con el cliente del 24/7/2026): el admin es
// quien mantiene el catálogo y los precios a mano. Fotos y opciones (grupos de variantes tipo
// sabor/agregados) se administran en secciones aparte, solo visibles con el producto ya guardado
// (necesitan su id para asociarse).
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

  const [uploading, setUploading] = useState(false);
  const [imagesError, setImagesError] = useState<string | null>(null);

  const [optionGroups, setOptionGroups] = useState<LocalGroup[]>([]);
  const [savingOptions, setSavingOptions] = useState(false);
  const [optionsError, setOptionsError] = useState<string | null>(null);

  const categoryOptions = categories.filter(c => c !== "Todos");
  // Filtro de la lista (no del formulario de alta/edición): por categoría y por nombre, para
  // que sea rápido encontrar un producto puntual entre los 61 y pispear a cambiarle el precio.
  const filtered = products.filter(p => {
    if (categoryFilter !== "Todos" && p.category !== categoryFilter) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Producto que se está editando, releído de `products` en cada render (no de una copia local)
  // para que Fotos/Opciones siempre reflejen lo último que devolvió el backend después de cada
  // subida/borrado/reorden.
  const editingProduct = editingId !== null ? products.find(p => p.id === editingId) ?? null : null;

  const openCreate = () => { setEditingId(null); setForm(EMPTY_FORM); setError(null); setOptionGroups([]); setFormOpen(true); };
  const openEdit = (p: Product) => { setEditingId(p.id); setForm(productToForm(p)); setError(null); setOptionGroups(p.optionGroups.map(groupToLocal)); setImagesError(null); setOptionsError(null); setFormOpen(true); };
  const closeForm = () => { setFormOpen(false); setEditingId(null); };

  // Valida y guarda el formulario: crea si editingId es null, edita si no. El precio viaja como
  // texto en el form (más simple para el input) y se convierte a número recién acá.
  const handleSave = async () => {
    if (!token) return;
    const price = Number(form.price);
    if (!form.name.trim() || !form.category.trim() || !form.description.trim() || !Number.isFinite(price) || price <= 0) {
      setError("Completá nombre, categoría, descripción y un precio válido.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const input = { name: form.name.trim(), category: form.category.trim(), price, description: form.description.trim(), featured: form.featured, active: form.active, outOfStock: form.outOfStock, offerAsOption: form.offerAsOption };
      if (editingId === null) {
        const created = await api.productsCreate(token, input);
        refresh();
        // Sigue en el formulario, ahora en modo edición del producto recién creado, para poder
        // cargarle fotos/opciones sin un segundo paso de "buscarlo en la tabla y editarlo".
        setEditingId(created.id);
        setOptionGroups([]);
      } else {
        await api.productsUpdate(token, editingId, input);
        refresh();
        closeForm();
      }
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

  // ── Fotos ──────────────────────────────────────────────────────────────
  const handleUpload = async (file: File) => {
    if (!token || editingId === null) return;
    setUploading(true);
    setImagesError(null);
    try {
      await api.productsUploadImage(token, editingId, file);
      refresh();
    } catch (e) {
      setImagesError(e instanceof Error ? e.message : "Error al subir la imagen");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteImage = async (imageId: number) => {
    if (!token || editingId === null) return;
    try {
      await api.productsDeleteImage(token, editingId, imageId);
      refresh();
    } catch (e) {
      setImagesError(e instanceof Error ? e.message : "Error al borrar la imagen");
    }
  };

  const handleMoveImage = async (index: number, dir: -1 | 1) => {
    if (!token || editingId === null || !editingProduct) return;
    const ids = editingProduct.images.map(img => img.id);
    const target = index + dir;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    try {
      await api.productsReorderImages(token, editingId, ids);
      refresh();
    } catch (e) {
      setImagesError(e instanceof Error ? e.message : "Error al reordenar las fotos");
    }
  };

  // ── Opciones del producto ─────────────────────────────────────────────
  const addGroup = () => setOptionGroups(gs => [...gs, { name: "", selectionType: "single", required: false, quantityTarget: "", sourceCategory: "", defaultPriceDelta: "0", options: [], overrides: [] }]);
  const updateGroup = (i: number, patch: Partial<LocalGroup>) => setOptionGroups(gs => gs.map((g, idx) => idx === i ? { ...g, ...patch } : g));
  const removeGroup = (i: number) => setOptionGroups(gs => gs.filter((_, idx) => idx !== i));
  const moveGroup = (i: number, dir: -1 | 1) => setOptionGroups(gs => {
    const target = i + dir;
    if (target < 0 || target >= gs.length) return gs;
    const copy = [...gs];
    [copy[i], copy[target]] = [copy[target], copy[i]];
    return copy;
  });

  const addOption = (gi: number) => updateGroup(gi, { options: [...optionGroups[gi].options, { name: "", priceDelta: "0" }] });
  const updateOption = (gi: number, oi: number, patch: Partial<LocalOption>) =>
    updateGroup(gi, { options: optionGroups[gi].options.map((o, idx) => idx === oi ? { ...o, ...patch } : o) });
  const removeOption = (gi: number, oi: number) => updateGroup(gi, { options: optionGroups[gi].options.filter((_, idx) => idx !== oi) });

  // Precio a mostrar en el input de un producto puntual dentro de un grupo dinámico: el override
  // que ya tenga cargado, o si no el precio por defecto del grupo.
  const overridePrice = (group: LocalGroup, sourceProductId: number) =>
    group.overrides.find(o => o.sourceProductId === sourceProductId)?.priceDelta ?? group.defaultPriceDelta;

  // Actualiza (o crea, si es la primera vez que se toca) el override de precio de un producto
  // puntual dentro de un grupo dinámico — ej. tipear 10000 en "Pizza Super" dentro de "Mitad
  // pizza". No hace falta "sacar" el override si el valor vuelve a coincidir con el default: se
  // manda igual, redundante pero inofensivo (ver buildOptionGroupsPayload).
  const updateOverride = (gi: number, sourceProductId: number, name: string, priceDelta: string) => {
    const group = optionGroups[gi];
    const exists = group.overrides.some(o => o.sourceProductId === sourceProductId);
    const overrides = exists
      ? group.overrides.map(o => o.sourceProductId === sourceProductId ? { ...o, priceDelta } : o)
      : [...group.overrides, { sourceProductId, name, priceDelta }];
    updateGroup(gi, { overrides });
  };

  // Valida y convierte el estado local (todo en texto, cómodo para inputs) al payload tipado que
  // espera el backend. Devuelve null si algo no es válido, con el motivo en optionsError.
  // Un grupo "vinculado a categoría" (sourceCategory no vacío) sigue sin tipear el SABOR a mano
  // (eso lo calcula el backend a partir del catálogo) pero sí manda un precio: defaultPriceDelta
  // + un override por cada producto que el admin haya tocado (ver overrides más arriba).
  const buildOptionGroupsPayload = (): UpsertOptionGroupInput[] | null => {
    const payload: UpsertOptionGroupInput[] = [];
    for (const g of optionGroups) {
      if (!g.name.trim()) { setOptionsError("Todos los grupos necesitan un nombre."); return null; }
      const sourceCategory = g.sourceCategory.trim() ? g.sourceCategory.trim() : null;
      if (!sourceCategory && g.options.length === 0) {
        setOptionsError(`El grupo "${g.name}" necesita al menos una opción, o vincularlo a una categoría.`);
        return null;
      }
      let quantityTarget: number | null = null;
      if (g.selectionType === "quantity") {
        quantityTarget = Number(g.quantityTarget);
        if (!Number.isInteger(quantityTarget) || quantityTarget <= 0) {
          setOptionsError(`El grupo "${g.name}" es de tipo "Cantidad a repartir": necesita un total de unidades válido.`);
          return null;
        }
      }

      let defaultPriceDelta = 0;
      const options: UpsertOptionInput[] = [];
      if (sourceCategory) {
        defaultPriceDelta = Number(g.defaultPriceDelta);
        if (!Number.isFinite(defaultPriceDelta)) { setOptionsError(`El precio por defecto del grupo "${g.name}" no es válido.`); return null; }
        for (const o of g.overrides) {
          const priceDelta = Number(o.priceDelta);
          if (!Number.isFinite(priceDelta)) { setOptionsError(`El precio de "${o.name}" no es válido.`); return null; }
          options.push({ name: o.name, priceDelta, sortOrder: options.length, sourceProductId: o.sourceProductId });
        }
      } else {
        for (const o of g.options) {
          if (!o.name.trim()) { setOptionsError(`Alguna opción del grupo "${g.name}" no tiene nombre.`); return null; }
          const priceDelta = Number(o.priceDelta);
          if (!Number.isFinite(priceDelta)) { setOptionsError(`El precio extra de "${o.name}" no es válido.`); return null; }
          options.push({ name: o.name.trim(), priceDelta, sortOrder: options.length, sourceProductId: null });
        }
      }
      payload.push({ name: g.name.trim(), selectionType: g.selectionType, required: g.required, quantityTarget, sourceCategory, defaultPriceDelta, sortOrder: payload.length, options });
    }
    return payload;
  };

  const handleSaveOptions = async () => {
    if (!token || editingId === null) return;
    setOptionsError(null);
    const payload = buildOptionGroupsPayload();
    if (!payload) return;
    setSavingOptions(true);
    try {
      await api.productsSaveOptionGroups(token, editingId, payload);
      refresh();
    } catch (e) {
      setOptionsError(e instanceof Error ? e.message : "Error al guardar las opciones");
    } finally {
      setSavingOptions(false);
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
            <label className="flex items-center gap-2 text-sm" title="Permite que este producto aparezca como opción dentro de grupos 'vinculados a categoría' de otros productos de la misma categoría (ej. cada sabor de empanada, para media docena/docena)">
              <input type="checkbox" checked={form.offerAsOption} onChange={e => setForm(f => ({ ...f, offerAsOption: e.target.checked }))} className="accent-primary" />
              Ofrecer como opción en grupos vinculados
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

          {editingId === null ? (
            <p className="text-xs text-muted-foreground mt-4 italic">Guardá el producto para poder cargarle fotos y opciones (sabor, agregados, etc.).</p>
          ) : editingProduct && (
            <>
              {/* ── Fotos ── */}
              <div className="mt-6 pt-5 border-t border-border">
                <p className="text-sm font-semibold mb-3">Fotos</p>
                <div className="flex flex-wrap gap-3 mb-3">
                  {editingProduct.images.map((img, i) => (
                    <div key={img.id} className="relative w-24 h-24 rounded-xl overflow-hidden border border-border group">
                      <img src={img.url} alt="" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
                        <div className="flex gap-1">
                          <button onClick={() => handleMoveImage(i, -1)} disabled={i === 0} title="Mover antes" className="p-1 bg-white/90 rounded disabled:opacity-30"><ChevronUp size={12} /></button>
                          <button onClick={() => handleMoveImage(i, 1)} disabled={i === editingProduct.images.length - 1} title="Mover después" className="p-1 bg-white/90 rounded disabled:opacity-30"><ChevronDown size={12} /></button>
                        </div>
                        <button onClick={() => handleDeleteImage(img.id)} title="Borrar foto" className="p-1 bg-white/90 rounded text-destructive"><Trash2 size={12} /></button>
                      </div>
                    </div>
                  ))}
                  <label className="w-24 h-24 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 text-muted-foreground cursor-pointer hover:border-primary/50 hover:text-primary transition-colors text-xs">
                    <Upload size={16} />
                    {uploading ? "Subiendo…" : "Subir"}
                    <input type="file" accept="image/*" className="hidden" disabled={uploading}
                      onChange={e => { const file = e.target.files?.[0]; if (file) handleUpload(file); e.target.value = ""; }} />
                  </label>
                </div>
                {imagesError && <p className="text-sm text-red-600">{imagesError}</p>}
              </div>

              {/* ── Opciones del producto ── */}
              <div className="mt-6 pt-5 border-t border-border">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold">Opciones del producto</p>
                  <button onClick={addGroup} className="text-xs flex items-center gap-1 text-primary font-semibold hover:underline">
                    <Plus size={13} /> Agregar grupo
                  </button>
                </div>
                <div className="space-y-4">
                  {optionGroups.map((group, gi) => (
                    <div key={gi} className="border border-border rounded-xl p-3.5">
                      <div className="flex items-start gap-2 mb-3">
                        <input type="text" value={group.name} onChange={e => updateGroup(gi, { name: e.target.value })}
                          placeholder="Nombre del grupo (ej. Sabor)"
                          className="flex-1 px-2.5 py-1.5 border border-border rounded-lg bg-background text-sm font-medium" />
                        <div className="flex gap-1 shrink-0">
                          <button onClick={() => moveGroup(gi, -1)} disabled={gi === 0} className="p-1.5 rounded-lg border border-border disabled:opacity-30"><ChevronUp size={13} /></button>
                          <button onClick={() => moveGroup(gi, 1)} disabled={gi === optionGroups.length - 1} className="p-1.5 rounded-lg border border-border disabled:opacity-30"><ChevronDown size={13} /></button>
                          <button onClick={() => removeGroup(gi)} className="p-1.5 rounded-lg border border-border hover:bg-red-50 hover:border-red-200 hover:text-red-600"><Trash2 size={13} /></button>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 mb-3">
                        <select value={group.selectionType} onChange={e => updateGroup(gi, { selectionType: e.target.value as SelectionType })}
                          className="px-2.5 py-1.5 border border-border rounded-lg bg-background text-xs">
                          {(Object.keys(SELECTION_TYPE_LABELS) as SelectionType[]).map(t => (
                            <option key={t} value={t}>{SELECTION_TYPE_LABELS[t]}</option>
                          ))}
                        </select>
                        {group.selectionType === "quantity" ? (
                          <label className="flex items-center gap-1.5 text-xs">
                            Total a repartir:
                            <input type="number" min="1" step="1" value={group.quantityTarget} onChange={e => updateGroup(gi, { quantityTarget: e.target.value })}
                              className="w-16 px-2 py-1 border border-border rounded-lg bg-background text-xs font-mono" />
                          </label>
                        ) : (
                          <label className="flex items-center gap-1.5 text-xs">
                            <input type="checkbox" checked={group.required} onChange={e => updateGroup(gi, { required: e.target.checked })} className="accent-primary" />
                            Obligatorio
                          </label>
                        )}
                      </div>

                      <label className="flex items-center gap-1.5 text-xs mb-3">
                        Origen de las opciones:
                        <select value={group.sourceCategory} onChange={e => updateGroup(gi, { sourceCategory: e.target.value })}
                          className="px-2.5 py-1.5 border border-border rounded-lg bg-background text-xs">
                          <option value="">Manual (tipear opciones abajo)</option>
                          {categoryOptions.map(c => <option key={c} value={c}>Vinculado a "{c}"</option>)}
                        </select>
                      </label>

                      {group.sourceCategory ? (
                        // Grupo dinámico: el SABOR no se tipea acá — se calcula solo en el backend
                        // (productos de esta categoría, activos, con stock y "Ofrecer como
                        // opción" tildado; este preview usa el mismo criterio solo para feedback
                        // inmediato). El PRECIO sí se carga acá: un default para el grupo entero
                        // más un override por producto para los pocos que valgan distinto.
                        (() => {
                          const eligible = products.filter(pr => pr.category === group.sourceCategory && pr.active && !pr.outOfStock && pr.offerAsOption);
                          return (
                            <div className="space-y-2">
                              <label className="flex items-center gap-1.5 text-xs">
                                Precio por defecto (para cualquier opción sin precio propio):
                                <input type="number" step="1" value={group.defaultPriceDelta}
                                  onChange={e => updateGroup(gi, { defaultPriceDelta: e.target.value })}
                                  className="w-24 px-2.5 py-1.5 border border-border rounded-lg bg-background text-xs font-mono" />
                              </label>
                              {eligible.length > 0 ? (
                                <div className="space-y-1.5">
                                  {eligible.map(p => (
                                    <div key={p.id} className="flex items-center justify-between gap-2 text-xs">
                                      <span>{p.name}</span>
                                      <input type="number" step="1" value={overridePrice(group, p.id)}
                                        onChange={e => updateOverride(gi, p.id, p.name, e.target.value)}
                                        className="w-24 px-2.5 py-1.5 border border-border rounded-lg bg-background text-xs font-mono" />
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-amber-700">
                                  Ningún producto de "{group.sourceCategory}" está marcado como "Ofrecer como opción" (o están todos sin stock/inactivos) — este grupo no va a tener opciones para elegir todavía.
                                </p>
                              )}
                            </div>
                          );
                        })()
                      ) : (
                        <>
                          <div className="space-y-1.5 mb-2">
                            {group.options.map((opt, oi) => (
                              <div key={oi} className="flex items-center gap-2">
                                <input type="text" value={opt.name} onChange={e => updateOption(gi, oi, { name: e.target.value })}
                                  placeholder="Opción (ej. Napolitana)"
                                  className="flex-1 px-2.5 py-1.5 border border-border rounded-lg bg-background text-sm" />
                                <input type="number" step="1" value={opt.priceDelta} onChange={e => updateOption(gi, oi, { priceDelta: e.target.value })}
                                  placeholder="+$"
                                  className="w-24 px-2.5 py-1.5 border border-border rounded-lg bg-background text-sm font-mono" />
                                <button onClick={() => removeOption(gi, oi)} className="p-1.5 rounded-lg border border-border hover:bg-red-50 hover:border-red-200 hover:text-red-600 shrink-0"><Trash2 size={13} /></button>
                              </div>
                            ))}
                          </div>
                          <button onClick={() => addOption(gi)} className="text-xs flex items-center gap-1 text-primary font-semibold hover:underline">
                            <Plus size={12} /> Agregar opción
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                  {optionGroups.length === 0 && (
                    <p className="text-xs text-muted-foreground italic">Sin opciones configuradas — este producto se agrega directo al carrito, sin selección previa.</p>
                  )}
                </div>
                {optionsError && <p className="text-sm text-red-600 mt-3">{optionsError}</p>}
                <button onClick={handleSaveOptions} disabled={savingOptions}
                  className="mt-3 bg-secondary text-foreground border border-border px-4 py-2 rounded-xl font-semibold text-sm hover:bg-secondary/70 transition-colors disabled:opacity-40">
                  {savingOptions ? "Guardando opciones…" : "Guardar opciones"}
                </button>
              </div>
            </>
          )}
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
                      {p.offerAsOption && <span className="text-xs bg-blue-50 text-blue-700 border border-blue-300 px-2 py-0.5 rounded-full">Es opción</span>}
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
