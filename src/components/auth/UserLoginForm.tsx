import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function UserLoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { signIn } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Autenticar exigiendo rol de estudiante. La navegación la resuelve
      // Redirect en cuanto el contexto publica el usuario; empujarla desde
      // aquí competía con él y rebotaba al inicio.
      await signIn(email, password, ["user"]);
    } catch {
      // Mensaje único para credenciales inválidas, cuenta inexistente y rol
      // equivocado: distinguirlos permitiría averiguar qué correos están
      // registrados y cuáles son de administrador.
      setError("Correo o contraseña incorrectos.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = () => {
    router.push("/auth/resetPassword");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-celeste p-8 rounded-lg shadow-md w-full max-w-md">
      <h2 className="text-2xl font-bold text-center mb-6">
        Iniciar Sesión como Estudiante
      </h2>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Correo Electrónico
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
            disabled={loading}
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
            disabled={loading}
          />
        </div>

        <div className="text-right">
          <button
            type="button"
            onClick={handleResetPassword}
            className="text-sm text-blue-500 hover:underline"
            disabled={loading}
          >
            ¿Olvidaste tu contraseña?
          </button>
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className={`w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
            loading ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
        </button>
        </form>
      </div>
    </div>
  );
}
