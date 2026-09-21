// e2e/global-setup.ts
// Deja los emuladores vacíos y siembra las cuentas de partida.
import {
  ADMIN,
  CLAVE,
  DATOS_PERSONALES,
  PARTICIPANTE_SEMBRADO,
  RESPUESTAS_TODO_ALTO,
  SUPERADMIN,
} from "./datos";
import { crearCuenta, escribirDocumento, limpiarEmuladores } from "./emuladores";

export default async function globalSetup() {
  // Sin estas variables no hay emuladores detrás, y no se debe seguir.
  if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    throw new Error("Faltan los emuladores. Ejecute las pruebas con `npm run test:e2e`.");
  }

  await limpiarEmuladores();

  const superadmin = await crearCuenta(SUPERADMIN.email, CLAVE);
  await escribirDocumento("superadmins", superadmin, {
    email: SUPERADMIN.email,
    role: "superadmin",
  });

  const admin = await crearCuenta(ADMIN.email, CLAVE);
  await escribirDocumento("admins", admin, {
    email: ADMIN.email,
    invitationCode: ADMIN.codigo,
    role: "admin",
    uid: admin,
  });

  // Un participante que ya hizo el test, para el panel del administrador.
  const participante = await crearCuenta(PARTICIPANTE_SEMBRADO.email, CLAVE);
  await escribirDocumento("users", participante, {
    uid: participante,
    email: PARTICIPANTE_SEMBRADO.email,
    role: "user",
    invitationCode: ADMIN.codigo,
    adminId: admin,
    personalInfo: DATOS_PERSONALES,
    answers: { ...RESPUESTAS_TODO_ALTO },
    testDuration: 120,
  });
}
