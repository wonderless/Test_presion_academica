import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminFirestore } from "@/lib/firebase/admin";
import { esRechazo, requireSuperadmin } from "@/lib/auth/requireSuperadmin";

// Elimina a un administrador entero: su cuenta de Authentication y su
// documento `admins/{uid}`. La cascada de participantes va antes, en
// /api/admin/delete-users-by-admin, y la lanza el panel.
//
// Antes esta ruta solo borraba la cuenta de Authentication y el documento lo
// borraba el navegador después, con un `deleteDoc`. Si ese último paso fallaba
// —pestaña cerrada, red caída— quedaba un documento sin cuenta, y además
// atrapado: al reintentar, `deleteUser` respondía `auth/user-not-found`, la
// ruta devolvía 400 y el panel no llegaba nunca a borrar el documento. Mientras
// tanto su `invitationCode` seguía siendo válido para
// /api/auth/validate-invitation, así que se podían seguir registrando
// participantes bajo un administrador con el que nadie podía iniciar sesión.
//
// Ahora los dos borrados ocurren aquí y la ruta es idempotente: se puede
// repetir sobre un borrado a medias y siempre termina.
export async function DELETE(req: NextRequest) {
  try {
    // Antes de tocar nada: eliminar administradores es cosa del superadmin.
    const autorizacion = await requireSuperadmin();
    if (esRechazo(autorizacion)) {
      return NextResponse.json(
        { error: autorizacion.error },
        { status: autorizacion.status }
      );
    }

    // Extraer el UID del usuario de los parámetros de la URL o del body
    const { searchParams } = new URL(req.url);
    const uid = searchParams.get("uid");

    // Si no hay UID en los parámetros, intentamos obtenerlo del body
    let userUid = uid;
    if (!userUid) {
      const body = await req.json();
      userUid = body.uid;
    }

    // Validar que se proporcionó un UID
    if (!userUid) {
      return NextResponse.json(
        { error: "UID del usuario es requerido" },
        { status: 400 }
      );
    }

    // El uid llega por la URL y decide qué cuenta de Authentication se borra.
    // Se comprueba que sea la de un administrador real, igual que hace
    // /api/admin/delete-users-by-admin con su `adminId`: sin esta comprobación
    // la ruta borraba la cuenta de cualquier uid que le pasaran —la de un
    // participante, o la del propio superadministrador, que no está en
    // `admins`— y lo hacía en silencio, devolviendo el mismo 200 que un
    // borrado legítimo.
    const adminRef = adminFirestore().collection("admins").doc(userUid);
    const adminDoc = await adminRef.get();

    if (!adminDoc.exists) {
      return NextResponse.json(
        { error: "El administrador indicado no existe" },
        { status: 404 }
      );
    }

    // Primero la cuenta y después el documento, y no al revés. El documento es
    // la prueba de que el uid es de un administrador: si se borrase primero y
    // fallara la cuenta, el reintento chocaría con el 404 de arriba y la
    // cuenta quedaría sin forma de borrarse desde la aplicación.
    //
    // Una cuenta que ya no existe cuenta como borrada: es lo que queda de un
    // intento anterior que no llegó al documento.
    try {
      await adminAuth().deleteUser(userUid);
    } catch (authError) {
      const code = (authError as { code?: string })?.code;
      if (code !== "auth/user-not-found") throw authError;
    }

    await adminRef.delete();

    // Devolver respuesta exitosa
    return NextResponse.json(
      { message: "Administrador eliminado exitosamente" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error al eliminar administrador:", error);

    // Manejar el error y devolver una respuesta adecuada
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Error genérico
    return NextResponse.json(
      { error: "Error desconocido al eliminar administrador" },
      { status: 500 }
    );
  }
}
