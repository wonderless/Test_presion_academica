// scripts/admin-usuario.mjs
//
// Herramienta puntual, NO forma parte de la aplicación. Sirve para cambiar el
// correo y/o la contraseña de una cuenta de Firebase Authentication sin
// depender de que llegue ningún email, que es el caso de los administradores
// creados con direcciones inventadas (admin3@admin3.com y similares).
//
// El uid NO cambia al usar updateUser. Como el documento de Firestore
// `admins/{uid}` se identifica por ese uid, y los participantes se enlazan por
// `invitationCode` (las consultas del panel y las reglas de Firestore) y por
// `adminId` (el borrado en cascada), cambiar el correo no toca a nadie.
//
// -----------------------------------------------------------------------
// CÓMO SE USA
// -----------------------------------------------------------------------
// Las credenciales salen de .env.local, el mismo archivo que ya usa la app.
// No hace falta descargar ninguna clave nueva ni instalar nada.
//
//   1) Consultar (no escribe nada, es lo que conviene hacer primero):
//        node --env-file=.env.local scripts/admin-usuario.mjs --email=admin4@admin4.com
//
//   2) Aplicar los cambios:
//        node --env-file=.env.local scripts/admin-usuario.mjs \
//          --email=admin4@admin4.com \
//          --nuevo-email=correo.real@gmail.com \
//          --password="UnaContraseñaLarga123" \
//          --aplicar
//
// Sin --aplicar el script solo mira. Cualquiera de --nuevo-email o --password
// puede omitirse si solo quiere cambiar uno de los dos.
//
// Nota: la contraseña escrita en la línea de comandos queda en el historial de
// la terminal. Si le preocupa, pásela por variable de entorno:
//   NUEVA_PASSWORD="…" node --env-file=.env.local scripts/admin-usuario.mjs …
// -----------------------------------------------------------------------

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

// ---------- argumentos ----------
const args = new Map(
  process.argv
    .slice(2)
    .filter((a) => a.startsWith("--"))
    .map((a) => {
      const [clave, ...resto] = a.slice(2).split("=");
      return [clave, resto.join("=") || true];
    })
);

const emailActual = args.get("email");
const nuevoEmail = args.get("nuevo-email");
const nuevaPassword = args.get("password") ?? process.env.NUEVA_PASSWORD;
const aplicar = args.get("aplicar") === true;

if (!emailActual || typeof emailActual !== "string") {
  console.error(
    "Falta --email=<correo actual de la cuenta>.\n" +
      "Ejemplo: node --env-file=.env.local scripts/admin-usuario.mjs --email=admin4@admin4.com"
  );
  process.exit(1);
}

// ---------- credenciales ----------
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

if (!projectId || !clientEmail || !privateKey) {
  console.error(
    "No se encontraron las credenciales del Admin SDK.\n" +
      "¿Ejecutó el script con --env-file=.env.local?"
  );
  process.exit(1);
}

if (!getApps().length) {
  initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
}

const auth = getAuth();
const db = getFirestore();

// ---------- utilidades ----------
const contarParticipantes = async (invitationCode, uid) => {
  const [porCodigo, porAdminId] = await Promise.all([
    invitationCode
      ? db.collection("users").where("invitationCode", "==", invitationCode).count().get()
      : null,
    db.collection("users").where("adminId", "==", uid).count().get(),
  ]);

  return {
    porCodigo: porCodigo ? porCodigo.data().count : null,
    porAdminId: porAdminId.data().count,
  };
};

const informar = async (uid) => {
  const adminDoc = await db.collection("admins").doc(uid).get();

  if (!adminDoc.exists) {
    console.log("  Documento admins/{uid}: NO EXISTE.");
    console.log("  Esta cuenta de Authentication no es un administrador del panel.");
    return null;
  }

  const datos = adminDoc.data();
  console.log("  Documento admins/{uid}: existe");
  console.log("    email guardado en Firestore :", datos.email ?? "(sin campo)");
  console.log("    invitationCode              :", datos.invitationCode ?? "(sin campo)");

  const conteo = await contarParticipantes(datos.invitationCode, uid);
  console.log("  Participantes enlazados:");
  console.log("    por invitationCode (panel y reglas):", conteo.porCodigo);
  console.log("    por adminId (borrado en cascada)   :", conteo.porAdminId);

  return { datos, conteo };
};

// ---------- ejecución ----------
try {
  const usuario = await auth.getUserByEmail(emailActual);

  console.log("\n=== ANTES ===");
  console.log("  uid          :", usuario.uid);
  console.log("  email        :", usuario.email);
  console.log("  emailVerified:", usuario.emailVerified);
  console.log("  deshabilitado:", usuario.disabled);
  const antes = await informar(usuario.uid);

  if (!aplicar) {
    console.log("\n--- MODO CONSULTA: no se ha escrito nada. ---");
    if (nuevoEmail || nuevaPassword) {
      console.log("Para aplicar los cambios, repita el comando añadiendo --aplicar");
    }
    process.exit(0);
  }

  if (!nuevoEmail && !nuevaPassword) {
    console.error(
      "\nSe pidió --aplicar pero no se indicó ni --nuevo-email ni --password. No hay nada que cambiar."
    );
    process.exit(1);
  }

  const cambios = {};
  if (nuevoEmail) {
    cambios.email = nuevoEmail;
    // Al cambiar el correo, Firebase lo marca como no verificado. La app no
    // consulta ese campo en ningún punto, pero se deja en true para que la
    // consola no lo muestre con la advertencia.
    cambios.emailVerified = true;
  }
  if (nuevaPassword) cambios.password = nuevaPassword;

  console.log("\n=== APLICANDO ===");
  console.log("  cambios:", Object.keys(cambios).join(", "));

  const actualizado = await auth.updateUser(usuario.uid, cambios);

  console.log("\n=== DESPUÉS ===");
  console.log("  uid          :", actualizado.uid);
  console.log("  email        :", actualizado.email);
  console.log("  emailVerified:", actualizado.emailVerified);
  const despues = await informar(actualizado.uid);

  console.log("\n=== COMPROBACIÓN ===");
  console.log(
    "  uid intacto:",
    usuario.uid === actualizado.uid ? "SÍ" : "NO  <-- algo va muy mal"
  );
  if (antes && despues) {
    const igual =
      antes.conteo.porCodigo === despues.conteo.porCodigo &&
      antes.conteo.porAdminId === despues.conteo.porAdminId;
    console.log(
      "  participantes intactos:",
      igual
        ? `SÍ (${despues.conteo.porCodigo} por código, ${despues.conteo.porAdminId} por adminId)`
        : "NO  <-- revise antes de seguir"
    );
  }

  console.log(
    "\nPendiente a mano en la consola de Firestore, en admins/" +
      actualizado.uid +
      ":\n  - actualizar el campo `email` al nuevo correo (hoy sigue con el viejo)"
  );
} catch (error) {
  if (error?.code === "auth/user-not-found") {
    console.error(`\nNo existe ninguna cuenta con el correo ${emailActual}.`);
  } else {
    console.error("\nError:", error?.message ?? error);
  }
  process.exit(1);
}
