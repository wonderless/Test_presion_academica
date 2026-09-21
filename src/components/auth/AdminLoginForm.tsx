"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function AdminLoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const auth = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Solo superadmin o admin. Si el rol es válido, Redirect lleva al
      // dashboard correspondiente en cuanto el contexto publica el usuario.
      await auth.signIn(email, password, ["superadmin", "admin"]);
    } catch {
      // Mismo mensaje para todo: ver "acceso no autorizado" revelaría que la
      // cuenta existe y que no es de administrador.
      setError("Correo o contraseña incorrectos.");
    } finally {
      setLoading(false);
    }
  };

  // La misma pantalla que usan los estudiantes: sendPasswordResetEmail sirve
  // para cualquier cuenta. Sin este enlace, un administrador que olvidaba su
  // contraseña no tenía forma de recuperarla desde la interfaz.
  const handleResetPassword = () => {
    router.push("/auth/resetPassword");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-celeste p-8 rounded-lg shadow-md w-full max-w-md">
      <h2 className="text-2xl font-bold text-center mb-6">
        Iniciar Sesión como Administrador
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
          className={`w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition duration-200 ${
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
