// e2e/datos.ts
// Cuentas y datos que siembra global-setup.ts. Solo existen en los emuladores.
import { modeQuestions, questions } from "../src/constants/questions";
import type { Answers } from "../src/lib/scoring";

export const CLAVE = "Clave-e2e-123";

export const SUPERADMIN = { email: "superadmin@e2e.test" };
export const ADMIN = { email: "admin@e2e.test", codigo: "E2EADMIN" };
export const PARTICIPANTE_SEMBRADO = { email: "sembrado@e2e.test" };

export const DATOS_PERSONALES = {
  nombres: "Prueba",
  apellidos: "Extremo a Extremo",
  edad: 20,
  sexo: "Mujer",
  universidad: "Universidad de Prueba",
  carrera: "Psicología",
  ciclo: "5",
  departamento: "Lima",
};

// Etiqueta de cada opción de la escala, tal como la ve el participante y como
// la anuncia el `aria-label` de cada radio del formulario.
export const ETIQUETA_DE_PUNTAJE: Record<number, string> = {
  1: "1 Nunca",
  2: "2 Casi nunca",
  3: "3 A veces",
  4: "4 Casi siempre",
  5: "5 Siempre",
};

// Respuestas que dejan el modo activador fisiológico en BAJO —sus cuatro ítems
// en 1, que además abren sus cuatro recomendaciones— y los otros dos modos en
// ALTO. Es el modo más corto, así que el recorrido del plan es el más breve.
export const respuestaPara = (id: number): number =>
  modeQuestions.activadorFisiologico.includes(id) ? 1 : 5;

// Las mismas respuestas en forma de documento, para sembrar directamente.
export const RESPUESTAS_SEMBRADAS: Answers = Object.fromEntries(
  questions.map((pregunta) => [pregunta.id, respuestaPara(pregunta.id)])
);

// Un participante que respondió todo con 5: ningún modo bajo, ningún plan.
export const RESPUESTAS_TODO_ALTO: Answers = Object.fromEntries(
  questions.map((pregunta) => [pregunta.id, 5])
);
