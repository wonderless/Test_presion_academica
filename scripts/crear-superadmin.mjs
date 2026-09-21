// Herramienta puntual: crea la cuenta del superadministrador en Firebase
// Authentication y su documento en `superadmins`, con el MISMO uid.
//
// Hacen falta las dos piezas: el rol se deduce de la coleccion en la que vive
// el documento, y se busca por uid (AuthContext.resolveUserData). Un documento
// suelto sin cuenta en Auth no sirve a nadie, y una cuenta sin documento entra
// pero no resuelve rol.
//
// Uso:
//   node --env-file=.env.local crear-superadmin.mjs --email=... --password=... --aplicar
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const args = new Map(
  process.argv.slice(2).filter((a) => a.startsWith("--")).map((a) => {
    const [k, ...r] = a.slice(2).split("=");
    return [k, r.join("=") || true];
  })
);
const email = args.get("email");
const password = args.get("password") ?? process.env.NUEVA_PASSWORD;
const aplicar = args.get("aplicar") === true;

if (!email || !password) {
  console.error("Faltan --email y --password (o NUEVA_PASSWORD).");
  process.exit(1);
}

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\n/g, "\n"),
    }),
  });
}
const auth = getAuth();
const db = getFirestore();

console.log("proyecto:", process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
console.log("correo  :", email);

let cuenta = null;
try {
  cuenta = await auth.getUserByEmail(email);
  console.log("estado  : la cuenta YA existe en Authentication, uid", cuenta.uid);
} catch {
  console.log("estado  : no existe todavia, habria que crearla");
}

if (!aplicar) {
  console.log("\n(simulacion: no se ha escrito nada. Anada --aplicar para ejecutar)");
  process.exit(0);
}

if (!cuenta) {
  cuenta = await auth.createUser({ email, password, emailVerified: false });
  console.log("creada  : cuenta en Authentication, uid", cuenta.uid);
} else {
  await auth.updateUser(cuenta.uid, { password });
  console.log("cambiada: contrasena de la cuenta existente");
}

// El documento lleva el uid como identificador, no como campo obligatorio,
// pero se guarda tambien por coherencia con el resto de colecciones.
await db.collection("superadmins").doc(cuenta.uid).set(
  { uid: cuenta.uid, email, role: "superadmin" },
  { merge: true }
);
console.log("escrito : superadmins/" + cuenta.uid);

const comprobacion = await db.collection("superadmins").doc(cuenta.uid).get();
console.log("\nverificacion final:");
console.log("  documento existe :", comprobacion.exists);
console.log("  campos           :", Object.keys(comprobacion.data() ?? {}).sort().join(", "));
const recargada = await auth.getUser(cuenta.uid);
console.log("  cuenta en Auth   :", recargada.email, "| deshabilitada:", recargada.disabled);
process.exit(0);
