// src/app/api/auth/validate-invitation/route.ts
// El registro tiene que validar el código de invitación ANTES de crear la
// cuenta, así que ocurre sin sesión. Antes eso se resolvía consultando la
// colección `admins` desde el navegador, lo que obligaba a dejarla abierta a
// cualquiera — y esa colección contiene, entre otras cosas, las credenciales
// de los administradores. La consulta se hace ahora aquí, con el Admin SDK,
// que no pasa por las reglas de Firestore.
import { NextRequest, NextResponse } from "next/server";
import { adminFirestore } from "@/lib/firebase/admin";

export async function POST(request: NextRequest) {
  try {
    const { invitationCode } = await request.json();

    if (typeof invitationCode !== "string" || !invitationCode.trim()) {
      return NextResponse.json(
        { error: "Código de invitación requerido" },
        { status: 400 }
      );
    }

    const snapshot = await adminFirestore()
      .collection("admins")
      .where("invitationCode", "==", invitationCode.trim())
      .limit(1)
      .get();

    if (snapshot.empty) {
      return NextResponse.json(
        { error: "Código de invitación inválido" },
        { status: 404 }
      );
    }

    // Solo se devuelve el identificador del administrador: ningún otro campo
    // de la colección sale de aquí.
    return NextResponse.json({ adminId: snapshot.docs[0].id });
  } catch (error) {
    console.error("Error validando código de invitación:", error);
    return NextResponse.json(
      { error: "Error al validar el código de invitación" },
      { status: 500 }
    );
  }
}
