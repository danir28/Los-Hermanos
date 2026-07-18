import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, type UserProfile } from "../lib/api";

type AuthContextValue = {
  user: UserProfile | null;
  token: string | null;
  loading: boolean;
  login: (usuario: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_STORAGE_KEY = "los-hermanos-staff-token";

// Provee la sesión de staff a toda la app privada: guarda token/usuario, valida el
// token guardado en localStorage contra GET /api/auth/me al montar (por si expiró o
// el usuario fue desactivado desde la última vez), y expone login/logout. Carpeta
// nueva que solo importa AppStaff — nunca AppCliente.
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!stored) {
      setLoading(false);
      return;
    }
    api.authMe(stored)
      .then(profile => {
        setToken(stored);
        setUser(profile);
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
      })
      .finally(() => setLoading(false));
  }, []);

  // Valida usuario/contraseña contra el backend y persiste el token en localStorage
  // (cada persona de staff usa su propio dispositivo, así que no hace falta manejar
  // "sesión compartida" — ver Sprint 1, decisión ya confirmada).
  const login = async (usuario: string, password: string) => {
    const result = await api.authLogin(usuario, password);
    localStorage.setItem(TOKEN_STORAGE_KEY, result.token);
    setToken(result.token);
    setUser(result.user);
  };

  // Borra el token guardado (no hay tabla de tokens revocados: el logout real es
  // 100% del lado del cliente). Avisa al backend solo por simetría de API.
  const logout = () => {
    if (token) api.authLogout(token).catch(() => {});
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook de acceso a la sesión de staff. Tira si se usa fuera de AuthProvider: es un
// error de programación (olvidarse de envolver con el provider), no un caso de uso
// real que haya que manejar con gracia.
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
