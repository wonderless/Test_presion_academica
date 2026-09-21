import { describe, expect, it } from "vitest";
import {
  calculateModeScore,
  calculateResults,
  calculateTotal,
  getOpenRecommendations,
  getRecommendationsForMode,
  levelFor,
  lowScoredItems,
  sumAnswers,
  type Answers,
} from "@/lib/scoring";
import {
  MODES,
  MODE_THRESHOLDS,
  TOTAL_THRESHOLDS,
  modeQuestions,
  questionText,
  questions,
} from "@/constants/questions";
import { allRecommendations } from "@/constants/recommendations";

// Responde lo mismo a los 24 ítems.
const todoEn = (valor: number): Answers =>
  Object.fromEntries(questions.map((q) => [q.id, valor]));

describe("estructura del instrumento", () => {
  it("son 24 ítems repartidos entre los tres modos sin solaparse", () => {
    expect(questions).toHaveLength(24);

    const repartidos = MODES.flatMap((mode) => modeQuestions[mode]);
    expect(repartidos).toHaveLength(24);
    // Sin duplicados: un ítem pertenece a un solo modo.
    expect(new Set(repartidos).size).toBe(24);
    expect([...repartidos].sort((a, b) => a - b)).toEqual(
      questions.map((q) => q.id)
    );
  });

  it("los máximos de cada modo son 5 puntos por ítem", () => {
    for (const mode of MODES) {
      expect(MODE_THRESHOLDS[mode].max).toBe(modeQuestions[mode].length * 5);
    }
    expect(TOTAL_THRESHOLDS.max).toBe(questions.length * 5);
  });

  it("los cortes de nivel están ordenados", () => {
    for (const mode of MODES) {
      const { bajoMax, medioMax, max } = MODE_THRESHOLDS[mode];
      expect(bajoMax).toBeLessThan(medioMax);
      expect(medioMax).toBeLessThan(max);
    }
  });
});

describe("levelFor", () => {
  const cortes = { bajoMax: 24, medioMax: 47, max: 60 };

  it("respeta las fronteras: el último bajo y el primero medio", () => {
    expect(levelFor(24, cortes)).toBe("BAJO");
    expect(levelFor(25, cortes)).toBe("MEDIO");
  });

  it("respeta las fronteras: el último medio y el primero alto", () => {
    expect(levelFor(47, cortes)).toBe("MEDIO");
    expect(levelFor(48, cortes)).toBe("ALTO");
  });
});

describe("sumAnswers", () => {
  it("suma los ítems pedidos y solo esos", () => {
    const answers: Answers = { 1: 5, 2: 3, 3: 1, 4: 4 };
    expect(sumAnswers(answers, [1, 2, 3])).toBe(9);
  });

  it("un ítem sin responder cuenta como 0", () => {
    expect(sumAnswers({ 1: 5 }, [1, 2, 3])).toBe(5);
  });
});

describe("calculateResults", () => {
  it("con todo en 1 los tres modos salen BAJO", () => {
    const results = calculateResults(todoEn(1));
    for (const mode of MODES) {
      expect(results[mode].score).toBe(modeQuestions[mode].length);
      expect(results[mode].level).toBe("BAJO");
    }
  });

  it("con todo en 5 los tres modos salen ALTO y en su máximo", () => {
    const results = calculateResults(todoEn(5));
    for (const mode of MODES) {
      expect(results[mode].score).toBe(MODE_THRESHOLDS[mode].max);
      expect(results[mode].level).toBe("ALTO");
    }
  });

  it("puntúa cada modo solo con sus propios ítems", () => {
    // Todo en 1 salvo los ítems del modo organizado, que van en 5.
    const answers = todoEn(1);
    for (const num of modeQuestions.organizado) answers[num] = 5;

    const results = calculateResults(answers);
    expect(results.organizado.score).toBe(MODE_THRESHOLDS.organizado.max);
    expect(results.responsable.score).toBe(modeQuestions.responsable.length);
    expect(calculateModeScore(answers, "organizado")).toBe(40);
  });
});

describe("calculateTotal", () => {
  it("es la suma de los 24 ítems, con su propia escala", () => {
    const total = calculateTotal(todoEn(3));
    expect(total.score).toBe(72);
    expect(total.level).toBe("MEDIO");
    expect(total.max).toBe(120);
  });

  it("no se deduce del nivel de los modos: puede haber total medio con modos bajos", () => {
    // Responsable y organizado al máximo, activador en el mínimo.
    const answers = todoEn(5);
    for (const num of modeQuestions.activadorFisiologico) answers[num] = 1;

    const results = calculateResults(answers);
    const total = calculateTotal(answers);

    expect(results.activadorFisiologico.level).toBe("BAJO");
    expect(total.score).toBe(20 * 5 + 4);
    expect(total.level).toBe("ALTO");
  });
});

describe("lowScoredItems", () => {
  it("son los ítems del modo respondidos con 1 o 2", () => {
    const answers = todoEn(4);
    answers[modeQuestions.responsable[0]] = 1;
    answers[modeQuestions.responsable[1]] = 2;
    answers[modeQuestions.responsable[2]] = 3;

    expect(lowScoredItems(answers, "responsable")).toEqual([
      modeQuestions.responsable[0],
      modeQuestions.responsable[1],
    ]);
  });

  it("un ítem sin responder no se considera bajo", () => {
    // Sin esta guardia, `undefined <= 2` sería falso pero un 0 implícito
    // colaría: se comprueba que un ítem ausente simplemente no aparece.
    expect(lowScoredItems({}, "activadorFisiologico")).toEqual([]);
  });
});

describe("getRecommendationsForMode", () => {
  it("con nivel MEDIO o ALTO no abre ninguna actividad, aunque haya ítems en 1", () => {
    const answers = todoEn(4);
    for (const num of modeQuestions.organizado.slice(0, 2)) answers[num] = 1;

    const results = calculateResults(answers);
    expect(results.organizado.level).not.toBe("BAJO");
    expect(
      getRecommendationsForMode("organizado", results.organizado.level, answers)
    ).toEqual([]);
  });

  it("con el modo en BAJO abre una recomendación por cada ítem en 1 o 2", () => {
    // Todo el modo en 1 salvo dos ítems en 5: el modo sigue bajo y se abren
    // las recomendaciones de los demás.
    const answers = todoEn(3);
    for (const num of modeQuestions.activadorFisiologico) answers[num] = 1;
    answers[modeQuestions.activadorFisiologico[0]] = 5;

    const results = calculateResults(answers);
    expect(results.activadorFisiologico.level).toBe("BAJO");

    const recs = getRecommendationsForMode(
      "activadorFisiologico",
      "BAJO",
      answers
    );
    expect(recs.map((r) => r.relatedQuestion)).toEqual(
      modeQuestions.activadorFisiologico.slice(1)
    );
  });

  it("un modo en BAJO siempre abre al menos una actividad", () => {
    // Invariante del instrumento, y no una casualidad: el corte de BAJO de
    // cada modo es exactamente 2 puntos por ítem (responsable 24 = 2×12,
    // organizado 16 = 2×8, activador 8 = 2×4). Un modo solo puede salir BAJO
    // si su media es ≤ 2, y eso obliga a que algún ítem esté en 1 o 2.
    //
    // De aquí depende que nadie vea un modo en rojo y a la vez la pantalla de
    // "no tienes actividades". Si alguien sube un `bajoMax` por encima de
    // 2×ítems, esta prueba avisa.
    for (const mode of MODES) {
      expect(MODE_THRESHOLDS[mode].bajoMax).toBe(modeQuestions[mode].length * 2);

      // El caso límite: todos los ítems en 2, que es el puntaje bajo más alto
      // posible sin ningún 1.
      const answers = todoEn(5);
      for (const num of modeQuestions[mode]) answers[num] = 2;

      const results = calculateResults(answers);
      expect(results[mode].level).toBe("BAJO");
      expect(
        getRecommendationsForMode(mode, "BAJO", answers).length
      ).toBeGreaterThan(0);
    }
  });
});

describe("getOpenRecommendations", () => {
  it("con todo en 1 se abren las 24 recomendaciones", () => {
    const abiertas = getOpenRecommendations(todoEn(1));
    expect(abiertas).toHaveLength(24);
  });

  it("con todo en 5 no se abre ninguna", () => {
    expect(getOpenRecommendations(todoEn(5))).toEqual([]);
  });
});

describe("catálogo de recomendaciones", () => {
  it("hay exactamente una recomendación por ítem, en el modo que le toca", () => {
    for (const mode of MODES) {
      const items = allRecommendations[mode].map((r) => r.relatedQuestion);
      expect([...items].sort((a, b) => a - b)).toEqual(
        [...modeQuestions[mode]].sort((a, b) => a - b)
      );
    }
  });

  it("el título de cada recomendación es el enunciado de su ítem", () => {
    // El documento del programa y el del instrumento tienen pequeñas variantes
    // entre sí —"realizó" por "realizo" en el ítem 14—, y manda el
    // instrumento. Como este catálogo se edita a mano, esta prueba es lo que
    // impide que las dos versiones del mismo enunciado se separen sin que
    // nadie lo note.
    for (const mode of MODES) {
      for (const rec of allRecommendations[mode]) {
        expect(rec.title).toBe(questionText(rec.relatedQuestion));
      }
    }
  });

  it("todas tienen dos días con al menos una actividad cada uno", () => {
    for (const mode of MODES) {
      for (const rec of allRecommendations[mode]) {
        expect(rec.days.map((d) => d.day)).toEqual([1, 2]);
        for (const day of rec.days) {
          expect(day.activities.length).toBeGreaterThan(0);
          for (const activity of day.activities) {
            expect(activity.title.trim()).not.toBe("");
            expect(activity.cuerpo.length).toBeGreaterThan(0);
          }
        }
      }
    }
  });

  it("conserva las listas de viñetas del documento", () => {
    // Varios ejercicios enumeran en viñetas. Es fácil aplastarlas a un párrafo
    // corrido al editar el texto —el contenido sigue estando, pero la pantalla
    // se ve plana y se pierde la estructura del ejercicio—, así que esta
    // prueba comprueba que siguen ahí.
    const bloques = MODES.flatMap((mode) =>
      allRecommendations[mode].flatMap((rec) =>
        rec.days.flatMap((day) => day.activities.flatMap((a) => a.cuerpo))
      )
    );
    const listas = bloques.filter((b) => b.tipo === "lista");
    expect(listas.length).toBeGreaterThan(0);
    // Ninguna lista vacía ni con puntos en blanco.
    for (const lista of listas) {
      if (lista.tipo !== "lista") continue;
      expect(lista.puntos.length).toBeGreaterThan(0);
      for (const punto of lista.puntos) expect(punto.trim()).not.toBe("");
    }
  });

  it("los identificadores no se repiten y las claves de feedback tampoco", () => {
    const todas = MODES.flatMap((mode) => allRecommendations[mode]);
    expect(new Set(todas.map((r) => r.id)).size).toBe(todas.length);

    const claves = todas.flatMap((r) => r.feedbackQuestions.map((q) => q.key));
    expect(new Set(claves).size).toBe(claves.length);
  });

  it("parte las enumeraciones escritas dentro de un párrafo", () => {
    // Dos ejercicios llevan una secuencia numerada —el ítem 13 con "1) … 5)" y
    // el 17 con "Paso 1: … Paso 5:"—, y cada punto va en su propia línea. En el
    // documento original estaban todos seguidos y se leían como un bloque
    // impenetrable. La segunda comprobación vigila el otro extremo: "4-7-8" es
    // un patrón de respiración, no una enumeración, y no debe partirse.
    const textos = MODES.flatMap((mode) =>
      allRecommendations[mode].flatMap((rec) =>
        rec.days.flatMap((day) =>
          day.activities.flatMap((a) =>
            a.cuerpo.flatMap((b) =>
              b.tipo === "lista" ? b.puntos : [b.texto]
            )
          )
        )
      )
    );

    const ejemplo = textos.find((x) => x.startsWith("Ejemplo (para una investigación)"));
    expect(ejemplo).toBeDefined();
    expect(ejemplo!.split("\n")).toHaveLength(6);

    // Ningún texto con "4-7-8" debe haberse partido: ese 8) no es una lista.
    for (const texto of textos.filter((x) => x.includes("4-7-8"))) {
      expect(texto).not.toMatch(/\n\d\)/);
    }
  });

  it("los 24 ítems tienen sus tres preguntas de retroalimentación", () => {
    // Al terminar el Día 2 se abre el modal de retroalimentación, y sin
    // preguntas la recomendación se cierra sin recoger nada. El ítem 9 estuvo
    // un tiempo sin ellas porque faltaban en el documento; aquí se comprueba
    // que ninguno vuelve a quedarse corto.
    for (const mode of MODES) {
      for (const rec of allRecommendations[mode]) {
        expect(rec.feedbackQuestions).toHaveLength(3);
        for (const pregunta of rec.feedbackQuestions) {
          expect(pregunta.question.trim()).not.toBe("");
          // La clave identifica la respuesta dentro de `activityFeedback` en
          // Firestore: si se repitiera, una respuesta pisaría a otra.
          expect(pregunta.key).toMatch(
            new RegExp(`^item${rec.relatedQuestion}Q[123]$`)
          );
        }
      }
    }
  });
});
