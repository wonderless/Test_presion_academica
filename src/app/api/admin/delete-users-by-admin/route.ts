// app/api/admin/delete-users-by-admin/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminFirestore } from "@/lib/firebase/admin";
import { esRechazo, requireSuperadmin } from "@/lib/auth/requireSuperadmin";

export async function DELETE(req: NextRequest) {
  try {
    // Antes de tocar nada. Es la ruta más destructiva del sistema: borra en
    // cascada a todos los participantes de un administrador, con sus
    // respuestas y sus resultados, y sin pasar por las reglas de Firestore.
    const autorizacion = await requireSuperadmin();
    if (esRechazo(autorizacion)) {
      return NextResponse.json(
        { error: autorizacion.error },
        { status: autorizacion.status }
      );
    }

    // Extraer el adminId de los parámetros de la URL
    const { searchParams } = new URL(req.url);
    const adminId = searchParams.get("adminId");

    // Si no hay adminId en los parámetros, intentamos obtenerlo del body
    let userAdminId = adminId;
    if (!userAdminId) {
      const body = await req.json();
      userAdminId = body.adminId;
    }

    // Validar que se proporcionó un adminId
    if (!userAdminId) {
      return NextResponse.json(
        { error: "ID del administrador es requerido" },
        { status: 400 }
      );
    }

    // Obtenemos una referencia a Firestore
    const firestore = adminFirestore();

    // El adminId llega por la URL y decide a quién se le borra la lista
    // entera. Se comprueba que corresponda a un administrador real: con un
    // valor inventado la consulta de abajo no encontraría a nadie y la
    // respuesta sería un 200 silencioso, indistinguible de un administrador
    // que de verdad no tiene participantes.
    const adminDoc = await firestore
      .collection("admins")
      .doc(userAdminId)
      .get();

    if (!adminDoc.exists) {
      return NextResponse.json(
        { error: "El administrador indicado no existe" },
        { status: 404 }
      );
    }

    // 1. Obtenemos todos los usuarios asociados a este administrador.
    //
    // El vínculo vive en dos campos: `adminId` e `invitationCode`. Los
    // paneles muestran a quien coincide por código, y antes la cascada solo
    // borraba a quien coincidía por `adminId`. Si en algún expediente los dos
    // campos no decían lo mismo, el administrador desaparecía dejando atrás a
    // participantes que sí veía. Las reglas de Firestore impiden ya crear
    // expedientes así, pero los que existieran antes siguen ahí: por eso se
    // borra la unión de las dos consultas.
    const invitationCode = adminDoc.data()?.invitationCode;
    const [porAdminId, porCodigo] = await Promise.all([
      firestore.collection("users").where("adminId", "==", userAdminId).get(),
      typeof invitationCode === "string" && invitationCode
        ? firestore
            .collection("users")
            .where("invitationCode", "==", invitationCode)
            .get()
        : null,
    ]);

    const usuarios = new Map(porAdminId.docs.map((d) => [d.id, d]));
    porCodigo?.docs.forEach((d) => usuarios.set(d.id, d));
    const usersDocs = [...usuarios.values()];

    if (usersDocs.length === 0) {
      return NextResponse.json(
        {
          message: "No se encontraron usuarios asociados a este administrador",
          usersDeleted: 0,
        },
        { status: 200 }
      );
    }

    // 2. Para cada usuario, conseguimos su email y buscamos su UID en Authentication
    const deletionResults = await Promise.all(
      usersDocs.map(async (userDoc) => {
        const userData = userDoc.data();
        const userId = userDoc.id;

        try {
          // Primero, eliminamos el usuario de Authentication si tiene email
          let authDeleted = false;
          if (userData.email) {
            try {
              const userRecord = await adminAuth()
                .getUserByEmail(userData.email);
              await adminAuth().deleteUser(userRecord.uid);
              authDeleted = true;
            } catch (authError) {
              console.error(
                `Error al eliminar usuario ${userId} (${userData.email}) de Authentication:`,
                authError
              );
              // Continuamos con la eliminación de Firestore aunque falle la de Authentication
            }
          }

          // Luego, eliminamos el documento de Firestore
          await firestore.collection("users").doc(userId).delete();

          return {
            id: userId,
            email: userData.email || "No disponible",
            firestoreDeleted: true,
            authDeleted,
            success: true,
          };
        } catch (error) {
          console.error(`Error al eliminar usuario ${userId}:`, error);
          return {
            id: userId,
            email: userData.email || "No disponible",
            error: error instanceof Error ? error.message : String(error),
            success: false,
          };
        }
      })
    );

    // Contamos cuántos usuarios se eliminaron correctamente
    const successfulDeletions = deletionResults.filter(
      (result) => result.success
    ).length;

    // 3. Devolver respuesta con los resultados
    return NextResponse.json(
      {
        message: `${successfulDeletions} de ${usersDocs.length} usuarios asociados al administrador eliminados exitosamente`,
        totalUsers: usersDocs.length,
        usersDeleted: successfulDeletions,
        results: deletionResults,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error al eliminar usuarios por adminId:", error);

    // Manejar el error y devolver una respuesta adecuada
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Error genérico
    return NextResponse.json(
      { error: "Error desconocido al eliminar usuarios" },
      { status: 500 }
    );
  }
}
