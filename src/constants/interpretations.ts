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

// "Speech de interpretación": lo que se le dice a la persona, en segunda
// persona, en el recuadro de cada modo de la pantalla de resultados. Viene del
// documento "Consideraciones - Test de Tensión Académica", palabra por palabra.
//
// No sustituye a MODE_INTERPRETATIONS: la tabla del perfil sigue mostrando las
// definiciones del instrumento, que son las que cita el administrador.
//
// El documento escribe un solo texto para "Nivel bajo o medio" con un hueco
// "medio/bajo" que se rellena según el nivel alcanzado.
export const MODE_SPEECH: Record<
  Mode,
  { bajoOMedio: (nivel: "bajo" | "medio") => string; alto: string }
> = {
  responsable: {
    bajoOMedio: (nivel) =>
      `Con respecto a los resultados obtenidos, se evidencia que presentas un nivel ${nivel} del Modo de afrontamiento responsable, lo cual, indica la existencia de oportunidades de mejora para gestionar el tiempo, trabajar de manera óptima en equipos o enfrentar de forma adecuada las exigencias académicas.`,
    alto:
      "¡Felicitaciones! Los resultados obtenidos demuestran que posees un nivel alto en el Modo de afrontamiento responsable, lo cual explica que posees un sentido de responsabilidad altamente consolidado, así como la capacidad para minimizar la tensión percibida mediante un manejo adecuado de conflictos de índole interpersonal o académico.",
  },
  organizado: {
    bajoOMedio: (nivel) =>
      `En relación a los resultados obtenidos, se evidencia que presentas un nivel ${nivel} del Modo de afrontamiento organizado, lo cual, indica la existencia de oportunidades de mejora para gestionar el estrés y la ansiedad frente a exámenes, sobrecarga académica u otras actividades relacionadas.`,
    alto:
      "¡Felicitaciones! Los resultados obtenidos demuestran que posees un nivel alto en el Modo de afrontamiento organizado, lo cual explica que posees una capacidad óptima para gestionar el tiempo y las emociones durante procesos de exigencia académica, reduciendo de forma significativa el estrés percibido.",
  },
  activadorFisiologico: {
    bajoOMedio: (nivel) =>
      `Con respecto a los resultados obtenidos, se evidencia que presentas un nivel ${nivel} del Modo de afrontamiento activador fisiológico, lo cual, indica la existencia de oportunidades de mejora para el uso de técnicas orientadas a la regulación nerviosa para reducir el estrés y tensión académica.`,
    alto:
      "¡Felicitaciones! Los resultados obtenidos demuestran que posees un nivel alto en el Modo de afrontamiento activador fisiológico, lo cual indica que realizas de forma satisfactoria estrategias y técnicas de regulación nerviosa, lo que se evidencia en un mejor manejo del estrés para preservar un rendimiento académico óptimo.",
  },
}

export const modeSpeech = (mode: Mode, level: Level): string =>
  level === "ALTO"
    ? MODE_SPEECH[mode].alto
    : MODE_SPEECH[mode].bajoOMedio(level === "BAJO" ? "bajo" : "medio")

// Cierra el speech de "Nivel bajo o medio" en el documento, pero solo se
// muestra con nivel BAJO: con MEDIO no se abren actividades, y la frase
// anunciaría unas que nunca aparecen.
export const PLAN_INVITACION =
  "Con el propósito de mejorar en el modo descrito, se recomienda seguir con las siguientes actividades durante los próximos días."

// "Speech de finalización / compleción de actividades", del mismo documento.
// Se muestra al completar todas las actividades del primer intento, junto al
// botón para repetir el test al que invita.
export const SPEECH_FINALIZACION: string[] = [
  "¡Felicidades! Has culminado exitosamente con el programa de actividades para mejorar tus estrategias de afrontamiento al estrés. El esfuerzo realizado a través del tiempo invertido para culminar con las actividades planteadas demuestra un gran nivel de compromiso y responsabilidad, lo cual es un primer gran paso para poder mejorar en tu desempeño académico y ámbitos relacionados al estudio.",
  "Para poder revisar tu mejoría, te invitamos a completar nuevamente el test y obtener una nueva representación de tus resultados.",
  "De antemano, te deseamos lo mejor y esperamos que cada una de las técnicas descritas te permitan continuar mejorando para preservar un rendimiento académico satisfactorio.",
  "¡Muchos éxitos!",
]
