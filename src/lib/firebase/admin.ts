// src/lib/firebase/admin.ts
// Inicialización única del Admin SDK para las rutas de servidor.
// firebase-admin 14 retiró el espacio de nombres por defecto (admin.auth(),
// admin.apps, admin.credential): ahora todo se importa por módulos.
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { usaEmuladoresEnServidor } from "@/lib/firebase/emulators";

const getAdminApp = (): App => {
  const [existente] = getApps();
  if (existente) return existente;

  // Contra los emuladores no hay credenciales: el SDK se conecta solo a los
  // que indican FIREBASE_AUTH_EMULATOR_HOST y FIRESTORE_EMULATOR_HOST, y
  // basta con el identificador del proyecto.
  if (usaEmuladoresEnServidor()) {
    return initializeApp({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });
  }

  return initializeApp({
    credential: cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
};

export const adminAuth = () => getAuth(getAdminApp());

export const adminFirestore = () => getFirestore(getAdminApp());
