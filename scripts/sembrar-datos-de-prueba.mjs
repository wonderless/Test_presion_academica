// TEMPORAL: crea un administrador y un participante de PRUEBA para poder
// recorrer el flujo completo. Los correos usan el dominio .local, que esta
// reservado y nunca podra registrarse de verdad, para que se distingan a
// simple vista de los participantes reales.
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const CLAVE = "Prueba-Afrontamiento-2026";
const ADMIN = { email: "admin.prueba@afrontamiento.local", codigo: "PRUEBA01" };
const PARTICIPANTE = { email: "participante.prueba@afrontamiento.local" };

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

const cuenta = async (email) => {
  try {
    const u = await auth.getUserByEmail(email);
    await auth.updateUser(u.uid, { password: CLAVE });
    return { uid: u.uid, nueva: false };
  } catch {
    const u = await auth.createUser({ email, password: CLAVE, emailVerified: false });
    return { uid: u.uid, nueva: true };
  }
};

const admin = await cuenta(ADMIN.email);
await db.collection("admins").doc(admin.uid).set(
  { uid: admin.uid, email: ADMIN.email, invitationCode: ADMIN.codigo, role: "admin" },
  { merge: true }
);
console.log(`admin        : ${ADMIN.email} (${admin.nueva ? "creado" : "ya existia"}) uid ${admin.uid}`);
console.log(`  codigo de invitacion: ${ADMIN.codigo}`);

const part = await cuenta(PARTICIPANTE.email);
await db.collection("users").doc(part.uid).set(
  {
    uid: part.uid,
    email: PARTICIPANTE.email,
    role: "user",
    adminId: admin.uid,
    invitationCode: ADMIN.codigo,
    personalInfo: {
      nombres: "Participante",
      apellidos: "De Prueba",
      edad: 21,
      sexo: "Mujer",
      universidad: "Universidad de Prueba",
      carrera: "Psicologia",
      ciclo: "5",
      departamento: "Lima",
    },
  },
  { merge: true }
);
console.log(`participante : ${PARTICIPANTE.email} (${part.nueva ? "creado" : "ya existia"}) uid ${part.uid}`);
console.log(`  sin responder el test todavia`);
console.log(`\nclave de ambas cuentas: ${CLAVE}`);
process.exit(0);
