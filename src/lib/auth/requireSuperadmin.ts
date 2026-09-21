// src/lib/auth/requireSuperadmin.ts
// Autorización de las rutas que operan con el Admin SDK. Ese SDK no pasa por
// las reglas de Firestore, así que si la ruta no comprueba nada, no comprueba
// nada nadie: hasta ahora la única restricción era que los botones que las
// llaman solo se dibujan en el panel del superadministrador, y eso no detiene
// a una petición hecha a mano.
//
// La verificación de la sesión reutiliza `verifySessionToken`, el mismo módulo
// que usan el middleware y /api/auth/session, para que en todo el proyecto
// haya una sola forma de decidir si una cookie es de fiar. El rol, en cambio,
// no viaja en el token —vive en Firestore— y se resuelve aquí igual que en el
// cliente: por la colección en la que existe el documento.
import { cookies } from "next/headers";
import { verifySessionToken } from "./verifySession";
import { adminFirestore } from "@/lib/firebase/admin";

interface Autorizado {
  uid: string;
}

interface Rechazado {
  error: string;
  status: 401 | 403;
}

export type ResultadoAutorizacion = Autorizado | Rechazado;

export const esRechazo = (
  resultado: ResultadoAutorizacion
): resultado is Rechazado => "error" in resultado;

export const requireSuperadmin = async (): Promise<ResultadoAutorizacion> => {
  const token = (await cookies()).get("__session")?.value;
  const session = await verifySessionToken(token);

  // A diferencia del middleware, que acepta un token vencido mientras la
  // cookie siga viva porque el cliente lo renueva al cargar, aquí se exige uno
  // vigente: son operaciones destructivas, y el mismo criterio usa
  // /api/auth/session al emitir la cookie.
  if (!session || session.expired) {
    return { error: "Sesión no válida o expirada", status: 401 };
  }

  const doc = await adminFirestore()
    .collection("superadmins")
    .doc(session.uid)
    .get();

  if (!doc.exists) {
    return { error: "No autorizado", status: 403 };
  }

  return { uid: session.uid };
};
