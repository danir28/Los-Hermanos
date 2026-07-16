import { useState } from "react";
import { ShoppingCart, Clock, Phone, User, Plus, Minus, Trash2 } from "lucide-react";
import type { CartItem } from "../types";
import { formatCurrency } from "../lib/format";

// Pantalla de carrito del cliente: edición de cantidades y confirmación del pedido con nombre y teléfono.
export function CustomerCart({ cart, onUpdateCart, onConfirm }: { cart: CartItem[]; onUpdateCart: (id: number, delta: number) => void; onConfirm: (name: string, phone: string) => void }) {
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
