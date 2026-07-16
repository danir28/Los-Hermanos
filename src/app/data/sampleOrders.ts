import type { Order } from "../types";

// Datos de ejemplo usados como estado inicial de `orders` en App; no pertenecen a ningún rol en particular.
export const SAMPLE_ORDERS: Order[] = [
  { id: "001", customer: "María González",  phone: "11-4521-8890", items: [{ name: "Pollo Entero",        qty: 1, price: 4500 }, { name: "Papas Fritas",       qty: 2, price: 700  }], status: "Pendiente",          createdAt: "10:23", estimatedTime: null,    total: 5900, type: "online"     },
  { id: "002", customer: "Carlos Pérez",    phone: "11-3312-7654", items: [{ name: "Medio Pollo",         qty: 2, price: 2400 }, { name: "Ensalada Mixta",     qty: 1, price: 800  }], status: "Programado",         createdAt: "10:45", estimatedTime: "12:30", total: 5600, type: "online"     },
  { id: "003", customer: "Ana Rodríguez",   phone: "11-5567-2341", items: [{ name: "Cuarto de Pollo",     qty: 4, price: 1300 }, { name: "Empanada de Carne",  qty: 6, price: 380  }], status: "En preparación",     createdAt: "09:55", estimatedTime: "12:00", total: 7480, type: "telefónico" },
  { id: "004", customer: "Roberto Silva",   phone: "11-6789-4523", items: [{ name: "Milanesa Napolitana", qty: 2, price: 3200 }],                                                        status: "Listo para retirar", createdAt: "09:30", estimatedTime: "11:30", total: 6400, type: "presencial" },
  { id: "005", customer: "Lucía Fernández", phone: "11-9923-1122", items: [{ name: "Pollo Entero",        qty: 1, price: 4500 }, { name: "Empanada de Pollo",  qty: 4, price: 380  }], status: "Entregado",          createdAt: "09:10", estimatedTime: "11:00", total: 6020, type: "online"     },
  { id: "006", customer: "Diego Martínez",  phone: "11-7734-5512", items: [{ name: "Medio Pollo",         qty: 1, price: 2400 }, { name: "Papas Fritas",       qty: 1, price: 700  }, { name: "Provoleta", qty: 1, price: 1200 }], status: "Pendiente", createdAt: "11:02", estimatedTime: null, total: 4300, type: "online" },
  { id: "007", customer: "Valentina Torres",phone: "11-8812-3340", items: [{ name: "Pollo Entero",        qty: 2, price: 4500 }, { name: "Ensalada Mixta",     qty: 2, price: 800  }], status: "Cancelado",          createdAt: "10:05", estimatedTime: null,    total: 10600,type: "whatsapp"   },
  { id: "008", customer: "Sebastián Ruiz",  phone: "11-6623-9901", items: [{ name: "Milanesa Napolitana", qty: 1, price: 3200 }, { name: "Empanada de Carne",  qty: 3, price: 380  }], status: "Programado",         createdAt: "11:15", estimatedTime: "13:00", total: 4340, type: "whatsapp"   },
];
