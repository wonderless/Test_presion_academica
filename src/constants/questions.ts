// src/constants/questions.ts
// Escala breve de modos de afrontamiento a la tensión académica
// (Grajeda et al., 2024).
//
// Son 24 ítems, todos redactados en positivo: más puntaje siempre significa
// mejor afrontamiento, así que no hay ítems inversos que haya que recodificar.
// Se responden en una escala Likert de 1 a 5 y el nivel de cada modo sale de
// *sumar* los puntajes de sus ítems. No hay clave de respuestas correctas ni
// escala de veracidad: todos los ítems puntúan y el valor marcado es el
// puntaje.

export interface Question {
  id: number
  text: string
}

// Las cinco opciones de respuesta. El valor es el puntaje que suma el ítem.
export interface AnswerOption {
  value: number
  label: string
}

export const ANSWER_OPTIONS: AnswerOption[] = [
  { value: 1, label: "Nunca" },
  { value: 2, label: "Casi nunca" },
  { value: 3, label: "A veces" },
  { value: 4, label: "Casi siempre" },
  { value: 5, label: "Siempre" },
]


// Qué ítems componen cada modo de afrontamiento. Mantener esta asignación en
// un solo sitio es lo que garantiza que el participante y el administrador
// vean el mismo puntaje para las mismas respuestas.
export const modeQuestions = {
  responsable: [4, 9, 11, 12, 13, 17, 18, 19, 21, 22, 23, 24],
  organizado: [1, 2, 3, 5, 6, 7, 8, 10],
  activadorFisiologico: [14, 15, 16, 20],
}

export type Mode = keyof typeof modeQuestions

export const MODES = Object.keys(modeQuestions) as Mode[]

// Nombre legible de cada modo, para no repetir estas cadenas por la interfaz.
export const MODE_LABELS: Record<Mode, string> = {
  responsable: "Responsable",
  organizado: "Organizado",
  activadorFisiologico: "Activador fisiológico",
}

// Cortes de nivel, tal como los fija el instrumento. `bajoMax` es el último
// puntaje que todavía cuenta como bajo, y `medioMax` el último que cuenta como
// medio; de ahí para arriba es alto. Los máximos posibles son 5 puntos por
// ítem, así que cuadran con el número de ítems de cada modo (12·5=60, 8·5=40,
// 4·5=20) y con el total (24·5=120).
export interface LevelThresholds {
  bajoMax: number
  medioMax: number
  max: number
}

export const MODE_THRESHOLDS: Record<Mode, LevelThresholds> = {
  responsable: { bajoMax: 24, medioMax: 47, max: 60 },
  organizado: { bajoMax: 16, medioMax: 31, max: 40 },
  activadorFisiologico: { bajoMax: 8, medioMax: 15, max: 20 },
}

export const TOTAL_THRESHOLDS: LevelThresholds = {
  bajoMax: 48,
  medioMax: 95,
  max: 120,
}

// Un ítem abre actividades cuando se respondió con 1 o 2, y solo dentro de un
// modo que haya salido BAJO. Así lo define el programa: el bloque de
// orientaciones de cada modo está encabezado por el nivel "Bajo", y dentro de
// él aplica el filtro por ítem ("si ha contestado 1 o 2, deberá seguir los
// ejercicios").
export const ITEM_INTERVENTION_MAX_SCORE = 2

export const questions: Question[] = [
  { id: 1, text: "Conozco la fecha de los exámenes y me preparo con mucha anticipación." }, // organizado
  { id: 2, text: "Reviso el silabo y me ordeno para cumplir con lo planificado." }, // organizado
  { id: 3, text: "Luego que el docente deja un trabajo, me organizo e inicio casi de inmediato las tareas para completarlas antes de los plazos señalados." }, // organizado
  { id: 4, text: "Respeto las normas de elaboración de tareas propuestas por el docente." }, // responsable
  { id: 5, text: "Uso técnicas de autocontrol emocional cuando me siento presionado por la carga académica." }, // organizado
  { id: 6, text: "Organizo o escojo lugares apropiados para estudiar en los que no tenga distractores." }, // organizado
  { id: 7, text: "Planifico el tiempo para estudiar con un cronograma que incluye intervalos para reactivarme (pausas activas)." }, // organizado
  { id: 8, text: "Utilizo estrategias que me permitan aprendizajes duraderos." }, // organizado
  { id: 9, text: "Me comunico apropiadamente con mis compañeros de clase." }, // responsable
  { id: 10, text: "Me preparo para exponer con mucha anticipación." }, // organizado
  { id: 11, text: "Busco la manera de entender lo que se explica en clases." }, // responsable
  { id: 12, text: "Asisto puntualmente a las reuniones de trabajo grupal." }, // responsable
  { id: 13, text: "Cumplo con las obligaciones asumidas en los trabajos grupales o de equipo." }, // responsable
  { id: 14, text: "Cuando estudio o hago mis tareas, realizo ejercicios físicos o bailes en pequeños intervalos para mantenerme activo." }, // activador fisiológico
  { id: 15, text: "Consumo mis alimentos todos los días a las mismas horas." }, // activador fisiológico
  { id: 16, text: "Practico algún deporte por lo menos dos veces a la semana." }, // activador fisiológico
  { id: 17, text: "Reconozco los métodos de evaluación de los docentes y busco respetar los criterios planteados." }, // responsable
  { id: 18, text: "Me matriculo en horarios que me permitan desarrollarme sin tensión extrema." }, // responsable
  { id: 19, text: "Me focalizo en las tareas hasta cumplirlas." }, // responsable
  { id: 20, text: "Para poder estar atento en clases, duermo entre 6 a 9 horas diarias." }, // activador fisiológico
  { id: 21, text: "Durante las clases atiendo y tomo anotaciones de lo que se explica." }, // responsable
  { id: 22, text: "Salgo de mi casa con bastante anticipación para llegar puntual a clases." }, // responsable
  { id: 23, text: "Llevo mis útiles, materiales o indumentaria necesarios para las clases." }, // responsable
  { id: 24, text: "Me siento en una posición que me permita escuchar y ver la clase atentamente." }, // responsable
]

// Enunciado de un ítem por su número, para las pantallas que muestran el
// detalle de una recomendación.
export const questionText = (id: number): string =>
  questions.find((question) => question.id === id)?.text ?? ""
