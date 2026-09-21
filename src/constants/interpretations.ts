// src/constants/interpretations.ts
//
// Interpretación psicológica de cada nivel, transcrita literalmente del
// documento "Programa para medir y mejorar modos de afrontamiento a la tensión
// académica" (Grajeda et al., 2025).
//
// Los textos están redactados en tercera persona ("El usuario presenta…")
// porque así vienen en el instrumento. No se reescriben a segunda persona: son
// las definiciones de los autores y el administrador los cita tal cual en sus
// informes.
import type { Level } from "@/lib/scoring"
import type { Mode } from "@/constants/questions"

export interface Interpretation {
  // Nombre que el instrumento le da al nivel, cuando lo tiene. Solo la escala
  // global bautiza sus niveles (disfuncional / funcional / estratégico); los
  // modos no, y ahí queda vacío.
  label?: string
  description: string
}

// Interpretación del modo de afronte total (0–120).
export const TOTAL_INTERPRETATIONS: Record<Level, Interpretation> = {
  BAJO: {
    label: "Afrontamiento disfuncional",
    description:
      "El usuario posee pocos recursos para autorregular la tensión académica. Requiere seguir las orientaciones para gestionar mejor su tiempo, desarrollar más hábitos de salud y emplear ejercicios de regulación emocional.",
  },
  MEDIO: {
    label: "Afrontamiento funcional",
    description:
      "El usuario posee estrategias que le permiten autorregular la tensión académica de manera regular, enfrentándolas y superándolas con cierto esfuerzo.",
  },
  ALTO: {
    label: "Afrontamiento estratégico",
    description:
      "El usuario posee muy buenas estrategias para autorregular la tensión académica, supera altamente las expectativas y exigencias académicas.",
  },
}

// Interpretación de cada modo por nivel.
export const MODE_INTERPRETATIONS: Record<Mode, Record<Level, Interpretation>> = {
  responsable: {
    BAJO: {
      description:
        "El usuario presenta un riesgo elevado de procrastinación, fracaso académico y conflictos en los trabajos grupales que reflejan una baja autoeficacia percibida y déficits en la autorregulación relacionadas a un bajo cumplimiento académico.",
    },
    MEDIO: {
      description:
        "El usuario presenta un funcionamiento adaptable que le permite enfrentar de manera regular las exigencias académicas, pero con cierto esfuerzo.",
    },
    ALTO: {
      description:
        "El usuario presenta recursos metacognitivos y de responsabilidad personal altamente consolidados. Minimiza la tensión percibida mediante la reducción de imprevistos o conflictos de indoles interpersonal o académico.",
    },
  },
  organizado: {
    BAJO: {
      description:
        "El usuario presenta un afrontamiento reactivo e ineficaz, con gran probabilidad de experimentar distrés agudo, ansiedad ante exámenes y sobrecarga cognitiva.",
    },
    MEDIO: {
      description:
        "El usuario presenta modos de afrontamiento moderadamente efectivos, pero podría descompensarse durante períodos de tareas y evaluaciones excesivas.",
    },
    ALTO: {
      description:
        "El usuario posee adecuados modos de afrontamiento que van al problema y son altamente efectivas. Es capaz de gestionar estratégicamente el tiempo y las emociones, reduciendo significativamente la tensión académica.",
    },
  },
  activadorFisiologico: {
    BAJO: {
      description:
        "El usuario presenta indicadores de vulnerabilidad física y cognitiva, que incrementan el riesgo de somatización del estrés, agotamiento académico, problemas de atención y fatiga crónica.",
    },
    MEDIO: {
      description:
        "El usuario presenta modos de afrontamiento que permiten un equilibrio somático regular donde podría fatigarse física o cognitivamente de manera moderada si las exigencias académicas son extremas.",
    },
    ALTO: {
      description:
        "El usuario posee adecuados modos de afrontamiento excelentes, que permiten la autorregulación somática para optimizar su rendimiento académico.",
    },
  },
}

// Encabezado que abre el plan de actividades de un modo bajo. Es el párrafo con
// el que el programa introduce las orientaciones de cada modo.
export const planIntro = (modeLabel: string): string =>
  `Con respecto a los resultados obtenidos, se pudo observar un nivel bajo en el modo de afrontamiento ${modeLabel.toLowerCase()}. Con el propósito de mejorar este nivel se deben realizar actividades durante los próximos días.`
