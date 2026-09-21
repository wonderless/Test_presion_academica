"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { hasAcceptedTerms } from "@/lib/terms";

interface RedirectProps {
  children?: React.ReactNode;
  fallbackPath?: string;
}

// Rutas que puede ver alguien sin sesión, una vez aceptados los términos.
const GUEST_ROUTES = ["/home", "/auth"];

// Rutas permitidas por rol. La primera de cada lista es el destino por defecto.
const ROLE_ROUTES: Record<string, string[]> = {
  superadmin: ["/dashboard/superadmin"],
  admin: ["/dashboard/admin"],
  user: ["/dashboard/user", "/results", "/test"],
};

const matchesAny = (pathname: string, routes: string[]): boolean =>
  routes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

export default function Redirect({
  children,
  fallbackPath = "/",
}: RedirectProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Una sola regla de "¿esta ruta me corresponde?", compartida por la
  // redirección y el render. Tenerlas separadas era lo que dejaba a un usuario
  // autenticado atrapado en "Redirigiendo..." para siempre.
  const termsAccepted = hasAcceptedTerms();
  const isConsentRoute = pathname === fallbackPath;

  const allowedRoutes = user ? ROLE_ROUTES[user.role] : undefined;
  const isAllowed = user
    ? !!allowedRoutes && matchesAny(pathname, allowedRoutes)
    : isConsentRoute || (termsAccepted && matchesAny(pathname, GUEST_ROUTES));

  useEffect(() => {
    if (loading) return; // Esperar a que la sesión esté resuelta
    if (isAllowed) return;

    if (!user) {
      // Sin sesión: al consentimiento si no lo ha aceptado o si la ruta no es pública.
      router.replace(fallbackPath);
      return;
    }

    // Con sesión pero fuera de su área: a su dashboard.
    router.replace(allowedRoutes ? allowedRoutes[0] : fallbackPath);
  }, [loading, isAllowed, user, allowedRoutes, router, fallbackPath, pathname]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-mi-color-rgb">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-100"></div>
      </div>
    );
  }

  if (isAllowed) {
    return <>{children}</>;
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-mi-color-rgb">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gray-100 mx-auto mb-4"></div>
        <p className="text-gray-100">Redirigiendo...</p>
      </div>
    </div>
  );
}
