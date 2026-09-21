// src/lib/scoring.ts
// Puntuación del instrumento. Es lógica pura: recibe respuestas y devuelve
// puntajes y niveles, sin tocar Firestore ni React.
//
// Tenerla en un solo sitio es lo que garantiza que el participante y el
// administrador vean el mismo número para las mismas respuestas.
//
// No hay clave de respuestas correctas: en esta escala ninguna respuesta es
// "la buena". Cada ítem vale exactamente lo que el participante marcó, de 1 a
// 5, y el puntaje de un modo es la suma de sus ítems.
import {
  MODES,
  MODE_THRESHOLDS,
  TOTAL_THRESHOLDS,
  ITEM_INTERVENTION_MAX_SCORE,
  modeQuestions,
  questions,
  type LevelThresholds,
  type Mode,
} from "@/constants/questions"
import {
  allRecommendations,
  type RecommendationItem,
} from "@/constants/recommendations"

export type Level = "ALTO" | "MEDIO" | "BAJO"

// Las respuestas son el puntaje marcado en cada ítem, de 1 a 5.
export type Answers = Record<number, number>

export interface ModeScore {
  score: number
  level: Level
  // Máximo alcanzable en el modo, para poder mostrar "37 de 60" sin que cada
  // pantalla tenga que ir a buscar el número de ítems.
  max: number
}

export type Results = Record<Mode, ModeScore>

// Un puntaje es bajo hasta `bajoMax` inclusive y medio hasta `medioMax`
// inclusive; de ahí para arriba, alto. Los cortes vienen del instrumento y
// viven en questions.ts.
export const levelFor = (score: number, thresholds: LevelThresholds): Level => {
  if (score <= thresholds.bajoMax) return "BAJO"
  if (score <= thresholds.medioMax) return "MEDIO"
  return "ALTO"
}

// Suma de los ítems indicados. Un ítem sin responder suma 0, que es lo que
// corresponde: los rangos del instrumento empiezan en 0 justamente para
// admitir escalas incompletas.
export const sumAnswers = (answers: Answers, questionNumbers: number[]): number =>
  questionNumbers.reduce(
    (total, questionNum) => total + (answers[questionNum] ?? 0),
    0
  )

export const calculateModeScore = (answers: Answers, mode: Mode): number =>
  sumAnswers(answers, modeQuestions[mode])

// Puntaje y nivel de los tres modos a partir de las respuestas.
export const calculateResults = (answers: Answers): Results =>
  MODES.reduce((acc, mode) => {
    const score = calculateModeScore(answers, mode)
    acc[mode] = {
      score,
      level: levelFor(score, MODE_THRESHOLDS[mode]),
      max: MODE_THRESHOLDS[mode].max,
    }
    return acc
  }, {} as Results)

export interface TotalScore {
  score: number
  level: Level
  max: number
}

// Modo de afronte total: la suma de los 24 ítems, con sus propios cortes. No
// es la media de los tres modos ni se deduce de ellos, tiene su propia escala.
export const calculateTotal = (answers: Answers): TotalScore => {
  const score = sumAnswers(
    answers,
    questions.map((question) => question.id)
  )
  return {
    score,
    level: levelFor(score, TOTAL_THRESHOLDS),
    max: TOTAL_THRESHOLDS.max,
  }
}

// Ítems de un modo que el participante respondió con 1 o 2. Son los que abren
// ejercicios, pero solo cuentan si el modo entero salió BAJO: ver
// `getRecommendationsForMode`.
export const lowScoredItems = (answers: Answers, mode: Mode): number[] =>
  modeQuestions[mode].filter((questionNum) => {
    const answer = answers[questionNum]
    return answer !== undefined && answer <= ITEM_INTERVENTION_MAX_SCORE
  })

// Recomendaciones que le tocan a un modo.
//
// Dos filtros encadenados, tal como los define el programa: el modo tiene que
// haber salido BAJO —el bloque de orientaciones de cada modo está encabezado
// por ese nivel— y dentro de él se abre una recomendación por cada ítem
// respondido con 1 o 2. Con nivel MEDIO o ALTO no se abre ninguna: el programa
// está pensado para trabajar con quien obtuvo afrontamiento bajo, y solo
// escribió orientaciones para ese caso.
export const getRecommendationsForMode = (
  mode: Mode,
  level: Level,
  answers: Answers
): RecommendationItem[] => {
  if (level !== "BAJO") return []

  const abiertos = lowScoredItems(answers, mode)
  return allRecommendations[mode].filter((rec) =>
    abiertos.includes(rec.relatedQuestion)
  )
}

// Todas las recomendaciones abiertas, de todos los modos. Es lo que necesitan
// el panel de actividades y la regla del segundo intento.
export const getOpenRecommendations = (
  answers: Answers
): Array<{ mode: Mode; recommendation: RecommendationItem }> => {
  const results = calculateResults(answers)
  return MODES.flatMap((mode) =>
    getRecommendationsForMode(mode, results[mode].level, answers).map(
      (recommendation) => ({ mode, recommendation })
    )
  )
}
