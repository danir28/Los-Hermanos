// Producto tal como lo espera/devuelve el frontend (mismo shape que el tipo Product que ya
// usaba src/app/types.ts con el array hardcodeado, para no tener que tocar los componentes que
// solo leen productos).
export type ProductDTO = {
  id: number;
  name: string;
  category: string;
  price: number;
  description: string;
  image: string;
  featured: boolean;
  active: boolean;
  outOfStock: boolean;
};

// Datos para crear un producto — todos los campos son requeridos.
export type CreateProductInput = {
  name: string;
  category: string;
  price: number;
  description: string;
  image: string;
  featured: boolean;
  active: boolean;
  outOfStock: boolean;
};

// Edición parcial: PATCH puede mandar solo el campo que cambió (ej. solo "price").
export type UpdateProductInput = Partial<CreateProductInput>;
