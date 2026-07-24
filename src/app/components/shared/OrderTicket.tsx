import type { Order } from "../../types";
import { formatCurrency } from "../../lib/format";
import { formatTimeLabel, nowDateTimeLabel } from "../../lib/time";

// Comanda impresa al crear un pedido manualmente desde recepción o cocina — reemplaza el papel
// que hoy escriben a mano y pegan en la caja. Imita el formato del comprobante que ya genera
// FUDO para las mesas del salón (encabezado, líneas de producto, total, footer), pero con
// nombre y tipo de pedido en vez de mesa: acá no hay mesas, son pedidos para retirar.
// Solo se hace visible al imprimir (ver src/styles/print.css, @media print) — en pantalla
// normal este componente queda oculto por CSS, aunque esté montado en el DOM.
export function OrderTicket({ order }: { order: Order }) {
  return (
    <div className="order-ticket">
      <p className="order-ticket-title">ROTISERIA LOS HERMANOS</p>
      <p>Pedido: #{order.orderNumber}</p>
      <p>Cliente: {order.customer}</p>
      <p>Tipo: {order.type}</p>
      <p>Fecha: {nowDateTimeLabel()}</p>
      <p>Retiro: {order.estimatedTime ? formatTimeLabel(order.estimatedTime) : "A confirmar"}</p>
      <hr />
      {order.items.map((item, i) => (
        <div key={i} className="order-ticket-line">
          <span>{item.qty}× {item.name}</span>
          <span>{formatCurrency(item.price * item.qty)}</span>
        </div>
      ))}
      <hr />
      <p className="order-ticket-total">TOTAL: {formatCurrency(order.total)}</p>
      <p className="order-ticket-footer">DOCUMENTO NO VALIDO COMO FACTURA</p>
    </div>
  );
}
