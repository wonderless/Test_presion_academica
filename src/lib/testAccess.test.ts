import { describe, expect, it } from "vitest";
import {
  evaluarAccesoAlTest,
  permiteEntrarAlTest,
  progresoDeActividades,
  type TestUserData,
} from "@/lib/testAccess";
import { getRecommendationsForMode, type Answers } from "@/lib/scoring";
import { modeQuestions, questions } from "@/constants/questions";

const fecha = (iso: string) => ({ toDate: () => new Date(iso) });

// Todo en 5: los tres modos salen ALTO y ningún ítem abre actividades.
const todoAlto = (): Answers =>
  Object.fromEntries(questions.map((q) => [q.id, 5]));

// Deja el modo activador fisiológico en BAJO con sus cuatro ítems en 1, que
// abren sus cuatro recomendaciones. Es el modo más corto, así que las cuentas
// de las pruebas quedan legibles.
const activadorEnBajo = (): Answers => {
  const answers = todoAlto();
  for (const num of modeQuestions.activadorFisiologico) answers[num] = 1;
  return answers;
};

// Progreso con las cuatro recomendaciones del activador marcadas como
// completadas, tal y como lo escribe ResultsDisplay.completeActivity.
const progresoCompletoDelActivador = (answers: Answers) => {
  const recs = getRecommendationsForMode(
    "activadorFisiologico",
    "BAJO",
    answers
  );
  const porId: Record<string, { isCompleted: boolean }> = {};
  for (const rec of recs) porId[rec.id] = { isCompleted: true };
  return { activadorFisiologico: { recommendationProgress: porId } };
};

describe("evaluarAccesoAlTest", () => {
  it("deja entrar a quien no tiene expediente todavía", () => {
    const estado = evaluarAccesoAlTest(undefined);
    expect(estado.tipo).toBe("sin-intento");
    expect(permiteEntrarAlTest(estado)).toBe(true);
  });

  it("deja entrar a quien tiene expediente pero no ha hecho el test", () => {
    const estado = evaluarAccesoAlTest({});
    expect(estado.tipo).toBe("sin-intento");
    expect(permiteEntrarAlTest(estado)).toBe(true);
  });

  it("no ofrece segundo intento a quien no tiene ningún modo bajo", () => {
    const estado = evaluarAccesoAlTest({
      answers: todoAlto(),
      lastTestDate: fecha("2020-01-01"),
    });

    expect(estado.tipo).toBe("sin-actividades-asignadas");
    expect(permiteEntrarAlTest(estado)).toBe(false);
  });

  it("bloquea mientras queden actividades, por mucho tiempo que haya pasado", () => {
    // Fecha de hace años: antes bastaba con esperar un mes para repetir.
    const estado = evaluarAccesoAlTest({
      answers: activadorEnBajo(),
      lastTestDate: fecha("2020-01-01"),
    });

    expect(estado.tipo).toBe("actividades-pendientes");
    if (estado.tipo === "actividades-pendientes") {
      expect(estado.completadas).toBe(0);
      expect(estado.total).toBe(4);
    }
    expect(permiteEntrarAlTest(estado)).toBe(false);
  });

  it("sigue bloqueando si falta una sola actividad", () => {
    const answers = activadorEnBajo();
    const progreso = progresoCompletoDelActivador(answers);
    const ids = Object.keys(
      progreso.activadorFisiologico.recommendationProgress
    );
    progreso.activadorFisiologico.recommendationProgress[ids[0]] = {
      isCompleted: false,
    };

    const estado = evaluarAccesoAlTest({
      answers,
      lastTestDate: fecha("2026-09-01"),
      recommendationProgress: progreso,
    });

    expect(estado.tipo).toBe("actividades-pendientes");
    if (estado.tipo === "actividades-pendientes") {
      expect(estado.completadas).toBe(3);
      expect(estado.total).toBe(4);
    }
  });

  it("permite repetir en cuanto se completan todas, sin ninguna espera", () => {
    const answers = activadorEnBajo();

    const estado = evaluarAccesoAlTest({
      answers,
      // Mismo día en que hizo el test: no hay plazo que cumplir.
      lastTestDate: fecha(new Date().toISOString()),
      recommendationProgress: progresoCompletoDelActivador(answers),
    });

    expect(estado.tipo).toBe("puede-repetir");
    expect(permiteEntrarAlTest(estado)).toBe(true);
  });

  it("cuenta las actividades de todos los modos bajos, no solo del primero", () => {
    // Activador en 1 y además el modo organizado entero en 1: ocho ítems más.
    const answers = activadorEnBajo();
    for (const num of modeQuestions.organizado) answers[num] = 1;

    const { total, tieneModosBajos } = progresoDeActividades({ answers });
    expect(tieneModosBajos).toBe(true);
    expect(total).toBe(modeQuestions.activadorFisiologico.length + modeQuestions.organizado.length);
  });
});

describe("el segundo intento", () => {
  const baseConSegundo = (): TestUserData => {
    const answers = activadorEnBajo();
    return {
      answers,
      lastTestDate: fecha("2026-08-01"),
      recommendationProgress: progresoCompletoDelActivador(answers),
      hasRetakenTest: true,
    };
  };

  it("deja continuar un segundo intento autorizado y aún sin enviar", () => {
    // Documentos de antes del cambio: la marca se ponía al abrir el test.
    const estado = evaluarAccesoAlTest(baseConSegundo());
    expect(estado.tipo).toBe("segundo-intento-en-curso");
    expect(permiteEntrarAlTest(estado)).toBe(true);
  });

  it("cierra el acceso cuando el segundo intento ya se envió", () => {
    const estado = evaluarAccesoAlTest({
      ...baseConSegundo(),
      answers2: todoAlto(),
      lastTestDate2: fecha("2026-09-01"),
    });

    expect(estado.tipo).toBe("sin-intentos-restantes");
    expect(permiteEntrarAlTest(estado)).toBe(false);
  });

  it("mide las actividades del intento vigente, no las del primero", () => {
    // En el segundo intento no queda ningún modo bajo: nada que hacer.
    const { total, tieneModosBajos } = progresoDeActividades({
      ...baseConSegundo(),
      answers2: todoAlto(),
    });

    expect(tieneModosBajos).toBe(false);
    expect(total).toBe(0);
  });
});
