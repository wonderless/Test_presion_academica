// e2e/pasos.ts
// Pasos que se repiten entre pruebas.
import { type Page } from "@playwright/test";

// Sin el consentimiento aceptado, Redirect devuelve a "/" desde cualquier ruta.
export const aceptarConsentimiento = async (page: Page) => {
  await page.goto("/");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Continuar" }).click();
  await esperarRuta(page, "/home");
};

export const iniciarSesion = async (page: Page, email: string, clave: string) => {
  await page.getByLabel("Correo Electrónico").fill(email);
  await page.getByLabel("Contraseña").fill(clave);
  await page.getByRole("button", { name: "Iniciar Sesión", exact: true }).click();
};

export const esperarRuta = (page: Page, ruta: string) =>
  page.waitForURL((url) => url.pathname === ruta);
