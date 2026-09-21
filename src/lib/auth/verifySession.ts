// src/lib/auth/verifySession.ts
// Verificación criptográfica del ID token de Firebase que viaja en la cookie
// `__session`. Funciona en el runtime edge (jose usa WebCrypto), así que el
// middleware puede usarla sin arrastrar el Admin SDK.
// Importado por subrutas y no desde "jose": el paquete completo arrastra el
// soporte de JWE (tokens cifrados), que aquí no se usa y que en el runtime
// edge avisaba de usar CompressionStream. Además reduce el tamaño del
// middleware, que se descarga en cada petición protegida.
import { createRemoteJWKSet } from "jose/jwks/remote";
import { jwtVerify } from "jose/jwt/verify";
import { decodeJwt } from "jose/jwt/decode";
import { decodeProtectedHeader } from "jose/decode/protected_header";
import type { JWTPayload } from "jose";
import { usaEmuladoresEnServidor } from "@/lib/firebase/emulators";

// Claves públicas con las que Google firma los ID tokens. jose las cachea y
// las revalida sola cuando aparece un `kid` desconocido.
const JWKS = createRemoteJWKSet(
  new URL(
    "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"
  )
);

// Un ID token de Firebase vive 1 hora, pero la cookie dura 2 semanas y el
// cliente solo puede refrescarla con la pestaña abierta. Se acepta un token
// vencido mientras la cookie siga vigente: al cargar, el cliente renueva el
// token y reescribe la cookie, y si la sesión de Firebase ya no existe,
// Redirect saca al usuario igual. Lo que nunca se acepta es una firma que no
// sea de Google, que era lo que colaba cualquier cookie inventada.
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 14;

export interface SessionClaims {
  uid: string;
  email?: string;
  expired: boolean;
}

// Los tokens del emulador de Auth no llevan firma (`alg: "none"`), así que
// jwtVerify los rechazaría siempre. Solo se leen en modo emulador, que nunca
// está activo en una compilación de producción, y aun así se comprueban el
// emisor y la audiencia del proyecto.
const leerTokenDelEmulador = (token: string, projectId: string): JWTPayload => {
  if (decodeProtectedHeader(token).alg !== "none") {
    throw new Error("No es un token del emulador");
  }
  const payload = decodeJwt(token);
  if (
    payload.iss !== `https://securetoken.google.com/${projectId}` ||
    payload.aud !== projectId
  ) {
    throw new Error("Emisor o audiencia equivocados");
  }
  return payload;
};

export const verifySessionToken = async (
  token: string | undefined
): Promise<SessionClaims | null> => {
  if (!token) return null;

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) {
    console.error(
      "NEXT_PUBLIC_FIREBASE_PROJECT_ID no está definido: no se puede verificar la sesión"
    );
    return null;
  }

  try {
    const payload = usaEmuladoresEnServidor()
      ? leerTokenDelEmulador(token, projectId)
      : (
          await jwtVerify(token, JWKS, {
            issuer: `https://securetoken.google.com/${projectId}`,
            audience: projectId,
            algorithms: ["RS256"],
            clockTolerance: COOKIE_MAX_AGE_SECONDS,
          })
        ).payload;

    // `sub` es el uid; Firebase nunca lo emite vacío, pero un token manipulado sí.
    if (typeof payload.sub !== "string" || payload.sub.length === 0) {
      return null;
    }

    const now = Math.floor(Date.now() / 1000);

    return {
      uid: payload.sub,
      email: typeof payload.email === "string" ? payload.email : undefined,
      expired: typeof payload.exp === "number" && payload.exp < now,
    };
  } catch {
    // Firma inválida, emisor/audiencia equivocados o vencido hace más de dos semanas.
    return null;
  }
};
