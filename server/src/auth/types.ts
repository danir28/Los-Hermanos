// Roles válidos de staff. Se tipan y validan acá (no en la DB) porque User.rol
// queda como String en el schema de Prisma, misma convención que Order.status/type.
export const USER_ROLES = ["recepcionista", "cocina", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export type LoginInput = { usuario: string; password: string };

// Identidad mínima que viaja firmada dentro del JWT ({ sub, usuario, rol }) y llena
// req.user en cada request autenticado. No lleva nombre/email a propósito: requireAuth
// no vuelve a consultar la DB por request, así que solo puede confiar en lo que el
// propio token trae.
export type AuthUser = { id: string; usuario: string; rol: UserRole };

// Perfil completo (todo menos passwordHash) que devuelven POST /login y GET /me,
// releído siempre de la DB en esos dos puntos.
export type UserProfile = AuthUser & { nombre: string; email: string; activo: boolean };

export type LoginResult = { token: string; user: UserProfile };
