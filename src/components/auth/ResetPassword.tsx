"use client";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

export default function ResetPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const { resetPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setError("Por favor ingresa tu correo electrónico");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      await resetPassword(email);
      setMessage("Se ha enviado un enlace de restablecimiento a tu correo electrónico\nRevisa tu bandeja de entrada y la carpeta de spam!");
    } catch (error: any) {
      setError("Error al enviar el correo de restablecimiento. Verifica que el correo sea válido.");
      console.error("Error resetting password:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="bg-celeste p-8 rounded-lg shadow-md w-full max-w-md">
        <div>
          <h2 className="text-2xl font-bold text-center mb-6">
            Restablecer Contraseña
          </h2>
          <p className="text-center text-sm text-gray-700 mb-6">
            Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña
          </p>
        </div>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {message && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            {message}
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
              name="email"
              type="email"
              autoComplete="email"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Correo electrónico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              loading ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {loading ? "Enviando..." : "Enviar enlace de restablecimiento"}
          </button>

          <div className="text-center">
            <a
              href="/home"
              className="text-sm text-blue-500 hover:underline"
            >
              Volver al inicio de sesión
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}