// src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySessionToken } from "@/lib/auth/verifySession";

export async function middleware(request: NextRequest) {
  const session = await verifySessionToken(
    request.cookies.get("__session")?.value
  );

  if (session) {
    return NextResponse.next();
  }

  // Sin sesión verificable: al consentimiento, y se limpia la cookie para no
  // reintentar la verificación en cada navegación.
  const response = NextResponse.redirect(new URL("/", request.url));
  response.cookies.delete("__session");
  return response;
}

// El middleware solo comprueba *que hay sesión*: el rol vive en Firestore, no
// en el token, así que quién puede ver cada dashboard lo sigue decidiendo
// Redirect en el cliente.
export const config = {
  matcher: ["/dashboard/:path*", "/test", "/results"],
};
