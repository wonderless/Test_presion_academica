// e2e/acceso.spec.ts
import { expect, test } from "@playwright/test";
import { esperarRuta } from "./pasos";

test("sin sesión, una ruta protegida devuelve al consentimiento", async ({ page }) => {
  await page.goto("/dashboard/user");
  await esperarRuta(page, "/");
  await expect(page.getByText("ACEPTO")).toBeVisible();
});

test("el consentimiento hay que aceptarlo para continuar", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Marque la casilla para continuar" })
  ).toBeDisabled();

  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Iniciar sesión / Registrarse" }).click();

  await esperarRuta(page, "/home");
  await expect(page.getByRole("heading", { name: "Acceso de Usuarios" })).toBeVisible();
});
