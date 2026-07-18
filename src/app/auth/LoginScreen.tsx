import { useState, type FormEvent } from "react";
import { LogIn } from "lucide-react";
import { useAuth } from "./AuthContext";

// Pantalla de login del staff (recepción/cocina/admin): usuario + contraseña contra
// POST /api/auth/login. Se muestra cuando AuthProvider todavía no tiene una sesión
// válida (sin token guardado, o el token guardado ya no sirve).
export function LoginScreen() {
  const { login } = useAuth();
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Intenta loguearse contra el backend vía AuthContext; si falla, muestra el mensaje de
  // error devuelto (credenciales inválidas, usuario desactivado, etc.) en vez de dejar la
  // pantalla sin feedback.
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(usuario, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-card border border-border rounded-2xl p-6">
        <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-2">Rotisería Los Hermanos</p>
        <h1 className="font-display text-2xl font-bold mb-6">Ingreso de personal</h1>

        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-2">Usuario</label>
        <input
          type="text"
          value={usuario}
          onChange={e => setUsuario(e.target.value)}
          autoFocus
          className="w-full mb-4 px-4 py-3 border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
        />

        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-2">Contraseña</label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="w-full mb-4 px-4 py-3 border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
        />

        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

        <button type="submit" disabled={loading || !usuario || !password}
          className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-bold hover:bg-primary/90 transition-colors disabled:opacity-40 flex items-center justify-center gap-2">
          <LogIn size={17} /> {loading ? "Ingresando…" : "Ingresar"}
        </button>
      </form>
    </div>
  );
}
