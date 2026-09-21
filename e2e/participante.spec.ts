// e2e/participante.spec.ts
import { expect, test } from "@playwright/test";
import { questions } from "../src/constants/questions";
import {
  ADMIN,
  CLAVE,
  DATOS_PERSONALES,
  ETIQUETA_DE_PUNTAJE,
  respuestaPara,
} from "./datos";
import { aceptarConsentimiento, esperarRuta } from "./pasos";

test("participante: registro, test, resultados y avance de las actividades", async ({ page }, testInfo) => {
  const email = `participante-${testInfo.project.name}@e2e.test`;

  // Registro con el código del administrador sembrado.
  await aceptarConsentimiento(page);
  await page.getByRole("link", { name: "Regístrate aquí" }).click();
  await page.getByLabel("Código de Invitación").fill(ADMIN.codigo);
  await page.getByLabel("Correo Electrónico").fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(CLAVE);
  await page.getByLabel("Confirmar Contraseña").fill(CLAVE);
  await page.getByRole("button", { name: "Siguiente" }).click();

  await page.getByLabel("Nombres").fill(DATOS_PERSONALES.nombres);
  await page.getByLabel("Apellidos").fill(DATOS_PERSONALES.apellidos);
  await page.getByLabel("Edad").fill(String(DATOS_PERSONALES.edad));
  await page.getByLabel("Sexo").selectOption(DATOS_PERSONALES.sexo);
  await page.getByLabel("Universidad").fill(DATOS_PERSONALES.universidad);
  await page.getByLabel("Carrera").fill(DATOS_PERSONALES.carrera);
  await page.getByLabel("Ciclo").fill(DATOS_PERSONALES.ciclo);
  await page.getByLabel("Departamento").selectOption(DATOS_PERSONALES.departamento);
  await page.getByRole("button", { name: "Registrarse" }).click();

  // Los 24 ítems.
  await esperarRuta(page, "/dashboard/user");
  await page.getByRole("button", { name: "Iniciar Test" }).click();
  await esperarRuta(page, "/test");

  for (const [indice, pregunta] of questions.entries()) {
    await expect(
      page.getByRole("heading", { name: `${indice + 1}. ${pregunta.text}` })
    ).toBeVisible();
    await page
      .getByRole("radio", {
        name: ETIQUETA_DE_PUNTAJE[respuestaPara(pregunta.id)],
        exact: true,
      })
      .check();
    const esLaUltima = indice === questions.length - 1;
    await page
      .getByRole("button", { name: esLaUltima ? "Finalizar Test" : "Siguiente" })
      .click();
  }

  // Resultados. El modo activador fisiológico sale bajo y abre su plan, pero
  // la pantalla arranca en el primer modo, que es el responsable.
  await esperarRuta(page, "/results");
  await expect(
    page.getByRole("heading", {
      name: "Resultados: modos de afrontamiento a la tensión académica",
    })
  ).toBeVisible();
  await expect(page.getByText("Modo 1 de 3: Responsable")).toBeVisible();

  // Se navega hasta el activador fisiológico, que es el que tiene actividades.
  await page.getByRole("button", { name: "Modo siguiente" }).click();
  await page.getByRole("button", { name: "Modo siguiente" }).click();
  await expect(
    page.getByText("Modo 3 de 3: Activador fisiológico")
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Día 1 de 2" })).toBeVisible();

  // Se completan las actividades del día 1.
  const culminarDia = page.getByRole("button", { name: "Culminar Día" });
  const marcarActividad = page.getByRole("button", { name: "Marcar Actividad Completada" });
  const progreso = page.getByText(/^\d+ de \d+$/);

  for (let intento = 0; intento < 10 && !(await culminarDia.isVisible()); intento++) {
    const antes = await progreso.textContent();
    await marcarActividad.click();
    await expect(progreso).not.toHaveText(antes ?? "");
  }
  await culminarDia.click();

  // Espera hasta el día siguiente, mostrada como hora de desbloqueo.
  await expect(page.getByRole("heading", { name: "¡Felicidades!" })).toBeVisible();
  await expect(page.getByText(/Se desbloqueará la actividad a las/)).toBeVisible();

  // La espera es de 5 segundos en las pruebas (NEXT_PUBLIC_UNLOCK_DELAY_SECONDS
  // en playwright.config.ts), así que se agota sola y se abre el día 2.
  await expect(page.getByRole("heading", { name: "Día 2 de 2" })).toBeVisible();

  // El progreso vive en Firestore: al recargar sigue en el día 2. Hay que
  // volver a navegar al modo, porque la pantalla arranca en el primero.
  await page.reload();
  await page.getByRole("button", { name: "Modo siguiente" }).click();
  await page.getByRole("button", { name: "Modo siguiente" }).click();
  await expect(page.getByRole("heading", { name: "Día 2 de 2" })).toBeVisible();

  // Un participante no entra en el panel del administrador.
  await page.goto("/dashboard/admin");
  await esperarRuta(page, "/dashboard/user");
});
