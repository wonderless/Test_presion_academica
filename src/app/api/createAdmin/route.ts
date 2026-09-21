import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminFirestore } from "@/lib/firebase/admin";
import { esRechazo, requireSuperadmin } from "@/lib/auth/requireSuperadmin";

export async function POST(req: NextRequest) {
  try {
    // Antes de tocar nada: solo el superadministrador crea administradores,
    // igual que exigen las reglas de Firestore para la colección `admins`.
    const autorizacion = await requireSuperadmin();
    if (esRechazo(autorizacion)) {
      return NextResponse.json(
        { error: autorizacion.error },
        { status: autorizacion.status }
      );
    }

    // Extraer datos del cuerpo de la solicitud
    const { email, password, invitationCode } = await req.json();

    // Validar datos requeridos
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email y contraseña son requeridos" },
        { status: 400 }
      );
    }

    // El código ya venía en la petición, pero esta ruta lo ignoraba: creaba
    // solo la cuenta y era el navegador quien escribía después el documento de
    // `admins`. Entre las dos cosas cabía un fallo —red caída, pestaña
    // cerrada— y lo que quedaba era una cuenta que podía autenticarse sin
    // documento en ninguna colección: `resolveUserData` devolvía null, el
    // login cortaba con "Usuario no encontrado en ninguna colección", y el
    // superadmin no podía arreglarlo porque la tabla se llena desde Firestore
    // y esa cuenta no salía en ella. Ahora los dos pasos ocurren aquí.
    if (typeof invitationCode !== "string" || !invitationCode.trim()) {
      return NextResponse.json(
        { error: "El código de invitación es requerido" },
        { status: 400 }
      );
    }

    // Crear usuario con Firebase Admin SDK
    const userRecord = await adminAuth().createUser({
      email,
      password,
      emailVerified: false,
    });

    // Sin la contraseña: la custodia Firebase Authentication, que ya la recibió
    // en el paso anterior. Duplicarla aquí la dejaría legible para cualquiera
    // que abriese el panel del superadministrador.
    const adminData = {
      email,
      invitationCode: invitationCode.trim(),
      role: "admin",
      uid: userRecord.uid,
    };

    try {
      await adminFirestore()
        .collection("admins")
        .doc(userRecord.uid)
        .set(adminData);
    } catch (error) {
      // Si el documento no se pudo escribir, la cuenta que se acaba de crear no
      // sirve para nada y bloquearía el correo para un reintento. Se deshace.
      await adminAuth()
        .deleteUser(userRecord.uid)
        .catch((errorAlDeshacer) => {
          console.error(
            `No se pudo deshacer la cuenta ${userRecord.uid} tras fallar la escritura en Firestore:`,
            errorAlDeshacer
          );
        });
      throw error;
    }

    // Devolver respuesta exitosa con los datos del usuario
    return NextResponse.json(
      {
        message: "Administrador creado exitosamente",
        user: {
          uid: userRecord.uid,
          email: userRecord.email,
          role: "admin",
          invitationCode: adminData.invitationCode,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error al crear administrador:", error);

    // Manejar el error y devolver una respuesta adecuada
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Error genérico
    return NextResponse.json(
      { error: "Error desconocido al crear administrador" },
      { status: 500 }
    );
  }
}
