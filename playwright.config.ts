// playwright.config.ts
// Pruebas extremo a extremo. Se lanzan con `npm run test:e2e`, que arranca los
// emuladores de Auth y Firestore y, dentro, esta configuración.
//
// Todo apunta a los emuladores y al proyecto `demo-afrontamiento`: aunque algo
// fallara al conectar, un proyecto `demo-*` no existe en la nube, así que las
// pruebas no pueden escribir en producción.
import { defineConfig, devices } from "@playwright/test";

const PUERTO = 3100;

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  // Un solo servidor de desarrollo y unos emuladores compartidos: en serie.
  workers: 1,
  fullyParallel: false,
  timeout: 180_000,
  expect: { timeout: 30_000 },
  reporter: "list",
  use: {
    baseURL: `http://localhost:${PUERTO}`,
    locale: "es-ES",
    trace: "retain-on-failure",
  },
  // Los tres motores: Chromium (Chrome, Edge), Firefox y WebKit (el de Safari
  // y el de todos los navegadores de iPhone). No es Safari real.
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  webServer: {
    // `next dev` y no una compilación de producción: el modo emulador del
    // servidor está desactivado a propósito en producción.
    command: `npx next dev --turbopack --port ${PUERTO}`,
    url: `http://localhost:${PUERTO}`,
    reuseExistingServer: false,
    timeout: 300_000,
    env: {
      NEXT_PUBLIC_FIREBASE_EMULATORS: "1",
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: "demo-afrontamiento",
      FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099",
      FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
      // El día siguiente de actividades se abre a los 5 segundos, no a las 12 horas.
      NEXT_PUBLIC_UNLOCK_DELAY_SECONDS: "5",
    },
  },
});
