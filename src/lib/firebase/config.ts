// src/lib/firebase/config.ts
import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
 
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
  };

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Idioma de los correos que envía Firebase (restablecer contraseña,
// verificación). Sin esto llegan en inglés, porque toma el idioma por defecto
// del proyecto y no el de la aplicación.
auth.languageCode = "es";

export const db = getFirestore(app);

// Solo para las pruebas extremo a extremo (`npm run test:e2e`), que arrancan
// la app con esta variable y con un proyecto `demo-*`. No la defina en
// Vercel: la app dejaría de hablar con Firebase.
if (process.env.NEXT_PUBLIC_FIREBASE_EMULATORS === "1") {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
}