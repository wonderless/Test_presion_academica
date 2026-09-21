// src/lib/testAccess.ts
// Única fuente de verdad para decidir si un participante puede hacer el test.
//
// Antes esta decisión estaba repartida en tres pantallas y ninguna aplicaba la
// regla entera: UserDashboard y app/test/page.tsx solo miraban que hubiera
// pasado un mes desde el último test, y el botón de ResultsDisplay solo miraba
// que las actividades estuvieran completas. Resultado: quien esperaba el mes
// repetía el test sin haber hecho sus actividades, y encima por un camino que
// sobrescribía su primer intento en lugar de guardarlo aparte.
//
// La regla del proyecto es que el segundo intento mide el efecto de las
// actividades:
//
//   · Quien tiene actividades pendientes no puede repetir, por mucho tiempo
//     que haya pasado.
//   · Quien las termina todas puede repetir de inmediato, sin ninguna espera:
//     es justo el momento en que tiene sentido medir el efecto.
//   · Quien no tiene ningún modo bajo no recibe actividades, así que no hay
//     intervención que medir y el segundo intento no le corresponde.
//
// No hay plazo de espera. Hubo uno de un mes, pensado para que el segundo
// intento no midiera el efecto de acabar de responder el test; la condición de
// completar las actividades cumple ese papel mejor y lo dejó sin sentido.
//
// Todo intento enviado cuenta. No hay escala de veracidad que pueda invalidar
// un intento y devolver el derecho a repetirlo.
import { MODES } from "@/constants/questions"
import {
  calculateResults,
  getRecommendationsForMode,
  type Answers,
} from "@/lib/scoring"

// El documento de Firestore del participante, en lo que interesa aquí.
export interface TestUserData {
  answers?: Answers
  answers2?: Answers
  lastTestDate?: { toDate: () => Date }
  lastTestDate2?: { toDate: () => Date }
  hasRetakenTest?: boolean
  recommendationProgress?: Record<
    string,
    {
      recommendationProgress?: Record<string, { isCompleted?: boolean }>
    }
  >
}

export type EstadoTest =
  // Permiten entrar al test
  | { tipo: "sin-intento" }
  | { tipo: "segundo-intento-en-curso" }
  | { tipo: "puede-repetir" }
  // Bloquean
  | { tipo: "actividades-pendientes"; completadas: number; total: number }
  | { tipo: "sin-actividades-asignadas" }
  | { tipo: "sin-intentos-restantes" }

// Los campos del intento vigente. El segundo intento vive con sufijo "2";
// mientras `hasRetakenTest` sea falso, el vigente es el primero.
const intentoVigente = (userData: TestUserData) => {
  const esSegundo = userData.hasRetakenTest === true
  return {
    esSegundo,
    answers: esSegundo ? userData.answers2 : userData.answers,
    lastTestDate: esSegundo ? userData.lastTestDate2 : userData.lastTestDate,
  }
}

export interface ProgresoActividades {
  completadas: number
  total: number
  // Solo los modos en nivel BAJO generan actividades. Sin ninguno, no hay plan
  // que seguir ni intervención que medir.
  tieneModosBajos: boolean
}

export const progresoDeActividades = (
  userData: TestUserData
): ProgresoActividades => {
  const { answers } = intentoVigente(userData)
  if (!answers) {
    return { completadas: 0, total: 0, tieneModosBajos: false }
  }

  const results = calculateResults(answers)
  let completadas = 0
  let total = 0
  let tieneModosBajos = false

  MODES.forEach((mode) => {
    if (results[mode].level !== "BAJO") return
    tieneModosBajos = true

    const recomendaciones = getRecommendationsForMode(mode, "BAJO", answers)
    const guardado = userData.recommendationProgress?.[mode]?.recommendationProgress

    recomendaciones.forEach((rec) => {
      total += 1
      if (guardado?.[rec.id]?.isCompleted === true) completadas += 1
    })
  })

  return { completadas, total, tieneModosBajos }
}

export const evaluarAccesoAlTest = (
  userData: TestUserData | undefined
): EstadoTest => {
  if (!userData) return { tipo: "sin-intento" }

  const vigente = intentoVigente(userData)

  // El segundo intento ya se autorizó y todavía no se ha enviado: hay que
  // dejar entrar, es la continuación de ese permiso.
  if (vigente.esSegundo && !userData.answers2) {
    return { tipo: "segundo-intento-en-curso" }
  }

  if (!vigente.lastTestDate) return { tipo: "sin-intento" }

  if (vigente.esSegundo) return { tipo: "sin-intentos-restantes" }

  const { completadas, total, tieneModosBajos } = progresoDeActividades(userData)

  // Sin modos bajos no hay actividades, y el segundo intento existe para medir
  // el efecto de esas actividades. El programa trabaja con quienes obtuvieron
  // afrontamiento bajo.
  if (!tieneModosBajos) return { tipo: "sin-actividades-asignadas" }

  if (completadas < total) {
    return { tipo: "actividades-pendientes", completadas, total }
  }

  return { tipo: "puede-repetir" }
}

const PERMITEN_ENTRAR: EstadoTest["tipo"][] = [
  "sin-intento",
  "segundo-intento-en-curso",
  "puede-repetir",
]

export const permiteEntrarAlTest = (estado: EstadoTest): boolean =>
  PERMITEN_ENTRAR.includes(estado.tipo)
