// src/lib/firebase/emulators.ts
// Modo emulador del servidor. Solo lo usan las pruebas extremo a extremo
// (`npm run test:e2e`), que arrancan la app contra los emuladores de Auth y
// Firestore con un proyecto `demo-*`.
//
// Lo activa FIREBASE_AUTH_EMULATOR_HOST, la variable estándar que el CLI de
// Firebase define al lanzar los emuladores, y además exige que no sea una
// compilación de producción. Esa segunda condición es la que importa: en modo
// emulador la sesión se acepta sin firma, así que si bastara con la variable,
// definirla por error en Vercel permitiría falsificar la sesión de cualquiera
// —la del superadministrador incluida— frente al Firestore real.
export const usaEmuladoresEnServidor = (): boolean =>
  process.env.NODE_ENV !== "production" &&
  Boolean(process.env.FIREBASE_AUTH_EMULATOR_HOST);
