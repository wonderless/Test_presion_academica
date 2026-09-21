// e2e/administracion.spec.ts
import { expect, test } from "@playwright/test";
import { ADMIN, CLAVE, DATOS_PERSONALES, PARTICIPANTE_SEMBRADO, SUPERADMIN } from "./datos";
import {
  buscarAdminPorEmail,
  crearCuenta,
  escribirDocumento,
  existeCuenta,
  existeDocumento,
} from "./emuladores";
import { aceptarConsentimiento, esperarRuta, iniciarSesion } from "./pasos";

test("administrador: ve a sus participantes", async ({ page }) => {
  await aceptarConsentimiento(page);
  await page.goto("/auth/loginAdmin");
  await iniciarSesion(page, ADMIN.email, CLAVE);
  await esperarRuta(page, "/dashboard/admin");

  await page.getByText("Datos sociogeograficos").click();
  await expect(
    page.getByRole("heading", { name: "Datos Adicionales de Participantes" })
  ).toBeVisible();
  await expect(page.getByRole("cell", { name: PARTICIPANTE_SEMBRADO.email })).toBeVisible();
});

test("superadministrador: crea un administrador y lo elimina con sus participantes", async ({ page }, testInfo) => {
  const emailAdmin = `admin-${testInfo.project.name}@e2e.test`;
  const emailInvitado = `invitado-${testInfo.project.name}@e2e.test`;

  await aceptarConsentimiento(page);
  await page.goto("/auth/loginAdmin");
  await iniciarSesion(page, SUPERADMIN.email, CLAVE);
  await esperarRuta(page, "/dashboard/superadmin");

  // Alta del administrador desde el panel.
  await page.getByPlaceholder("Correo electrónico").fill(emailAdmin);
  await page.getByPlaceholder("Contraseña").fill(CLAVE);
  await page.getByRole("button", { name: "Agregar" }).click();
  const fila = page.getByRole("row", { name: emailAdmin });
  await expect(fila).toBeVisible();

  // Un participante registrado con su código, para comprobar la cascada.
  const admin = await buscarAdminPorEmail(emailAdmin);
  const invitado = await crearCuenta(emailInvitado, CLAVE);
  await escribirDocumento("users", invitado, {
    uid: invitado,
    email: emailInvitado,
    role: "user",
    invitationCode: admin.invitationCode,
    adminId: admin.uid,
    personalInfo: DATOS_PERSONALES,
  });

  // Eliminación con la cascada.
  await fila.getByRole("button", { name: "Eliminar" }).click();
  await page.getByRole("button", { name: "Sí, eliminar" }).click();
  await expect(page.getByText("junto con 1 participante asociado")).toBeVisible();
  await expect(page.getByRole("row", { name: emailAdmin })).toHaveCount(0);

  // No queda nada: ni documentos ni cuentas.
  expect(await existeDocumento("admins", admin.uid)).toBe(false);
  expect(await existeDocumento("users", invitado)).toBe(false);
  expect(await existeCuenta(emailAdmin, CLAVE)).toBe(false);
  expect(await existeCuenta(emailInvitado, CLAVE)).toBe(false);
});
