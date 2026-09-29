import { describe, expect, it } from "vitest";
import {
  FRASES_GENERALES,
  FRASES_POR_MODO,
  fraseMotivacional,
} from "@/constants/frasesMotivacionales";
import { MODES } from "@/constants/questions";
import { allRecommendations } from "@/constants/recommendations";

describe("frases motivacionales", () => {
  it("trae las cinco frases de cada modo y las cinco generales del documento", () => {
    MODES.forEach((mode) => expect(FRASES_POR_MODO[mode]).toHaveLength(5));
    expect(FRASES_GENERALES).toHaveLength(5);
  });

  it("no deja comillas del documento alrededor de las frases", () => {
    const todas = [...MODES.flatMap((m) => FRASES_POR_MODO[m]), ...FRASES_GENERALES];
    todas.forEach((frase) => {
      expect(frase).toBe(frase.trim());
      expect(frase).not.toMatch(/^["“]|["”]$/);
    });
  });

  it("da a cada actividad una frase de su modo o una general, siempre la misma", () => {
    MODES.forEach((mode) => {
      allRecommendations[mode].forEach((rec) => {
        const frase = fraseMotivacional(mode, rec.id);
        expect([...FRASES_POR_MODO[mode], ...FRASES_GENERALES]).toContain(frase);
        // Al recargar durante la espera se tiene que ver la misma.
        expect(fraseMotivacional(mode, rec.id)).toBe(frase);
      });
    });
  });

  it("no da la misma frase a todas las actividades de un modo", () => {
    MODES.forEach((mode) => {
      const distintas = new Set(
        allRecommendations[mode].map((rec) => fraseMotivacional(mode, rec.id))
      );
      expect(distintas.size).toBeGreaterThan(1);
    });
  });
});
