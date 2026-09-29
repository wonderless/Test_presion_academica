// src/constants/frasesMotivacionales.ts
//
// Frases que se muestran al culminar el día 1 de una actividad, mientras
// espera a que se abra el día 2. Transcritas del documento "Frases
// motivacionales para el Programa", palabra por palabra; solo se quitaron las
// comillas que las rodean.
//
// Todas invitan a volver "mañana", así que solo encajan al cerrar el día 1:
// al cerrar el último día la actividad ya está completa y no hay mañana.
import type { Mode } from "@/constants/questions"

// Una lista por modo. El documento llama "Afrontamiento Fisiológico" al modo
// activador fisiológico.
export const FRASES_POR_MODO: Record<Mode, string[]> = {
  activadorFisiologico: [
    "¡Cuerpo suelto, mente enfocada! 🌬️ Hoy lograste canalizar esa tensión en energía pura. Descansa esta noche y vuelve mañana para seguir recargando baterías.",
    "Respirar profundo también es estudiar de forma inteligente. 🌬️ Al reducir la tensión muscular, preparas tu mente para procesar mejor la información. ¡Te espero mañana para otra recarga!",
    "Músculos relajados, mente clara. 🧘‍♂️ Hoy le enseñaste a tu sistema nervioso a desactivar la alarma del estrés. ¡Entra mañana y consolidemos este nuevo hábito!",
    "Esa sensación de ligereza significa que la actividad hizo su efecto. ✨ Tu cuerpo te lo agradecerá durante las clases de mañana. ¡Nos vemos en tu siguiente sesión!",
    "Has completado tus actividades de hoy. Al darle un respiro a tu cuerpo, le estás dando a tu cerebro el oxígeno que necesita para rendir. ¡Nos vemos mañana para seguir dominando el estrés! 💪🧠",
  ],
  organizado: [
    "¡Gran trabajo! 📅 Ordenar tus pendientes es tu mejor escudo contra la presión de la universidad. Tómate un descanso sin culpa y vuelve mañana por tu siguiente reto.",
    "Cada paso planificado que diste hoy es un dolor de cabeza menos para tus entregas. ¡Excelente esfuerzo! Ingresa mañana para completar tu plan de dos días y cerrar con todo. 🧩📈",
    "Dividir y vencer. Al desglosar tus obligaciones hoy, le quitaste poder a la procrastinación. ⚔️ ¡Vuelve mañana para tu siguiente victoria estratégica!",
    "Menos caos, más control. 🎯 Hoy demostraste que tener un buen plan es la mitad del trabajo de la u. ¡Descansa sabiendo que todo está mapeado y entra mañana para el día 2!",
    "Una mente estructurada es una mente en paz. 🗓️ Tienes las fechas y entregas bajo control. ¡Nos vemos mañana para ponerle el broche de oro a tu semana!",
  ],
  responsable: [
    "Tomar el control de tu bienestar es el mayor acto de responsabilidad académica que puedes hacer. 🏆 Celebra esta pequeña victoria y regresa mañana para ir por más.",
    "Hoy decidiste enfrentar la carga en lugar de evadirla, y eso ya es un éxito enorme. Disfruta tu noche y vuelve mañana a la app para cerrar tu ciclo con broche de oro. 🥇",
    "No dejaste que la presión decidiera por ti. 🛡️ Hacerte cargo de tu forma de afrontar la universidad es un paso gigante. ¡Regresa mañana para seguir fortaleciendo tu agencia personal!",
    "Aceptar el desafío de mejorar tu bienestar requiere valentía y responsabilidad. 💡 Estás construyendo recursos valiosos para tu carrera. ¡Nos vemos mañana para seguir creciendo!",
    "Ser proactivo frente a la tensión es la marca de un verdadero profesional en formación. 🎓 Hoy diste un paso firme y consciente. ¡Entra mañana y completa tu ciclo de afrontamiento!",
  ],
}

// Valen para cualquier modo.
export const FRASES_GENERALES: string[] = [
  "Sabemos que las lecturas, los trabajos y los parciales pueden ser pesados, pero hoy demostraste que tienes las herramientas para hacerles frente. 🌟 ¡Prepárate para seguir avanzando mañana!",
  "Un día menos de estrés, un paso más hacia tus metas. 🚀 El equilibrio entre rendir en la u y cuidarte comienza con acciones como las de hoy. ¡Nos vemos mañana para el último estirón!",
  "Lecturas densas, metodologías complejas y trabajos grupales... todo es más manejable cuando equilibras acción, orden y relajación. ⚖️ ¡Cierra la app, descansa y vuelve mañana por tu racha!",
  "Cada vez que completas una actividad aquí, estás aplicando la mejor psicología a tu propia vida. 🧠✨ ¡Nos vemos mañana para la segunda parte de tu entrenamiento!",
  "Validamos tu esfuerzo: no es fácil lidiar con la presión de la facultad, pero lo estás haciendo increíble. 🌟 ¡Desconéctate con tranquilidad y vuelve mañana con las pilas al 100%!",
]

// Frase para una actividad: una de las de su modo o una general. Sale de la
// actividad, no del azar, para que al recargar durante la espera se vea la
// misma frase y no otra; y como cada actividad da una distinta, quien tiene
// varias no lee siempre la misma.
export const fraseMotivacional = (mode: Mode, recommendationId: string): string => {
  const frases = [...FRASES_POR_MODO[mode], ...FRASES_GENERALES]
  let hash = 0
  for (const letra of recommendationId) {
    hash = (hash * 31 + letra.charCodeAt(0)) >>> 0
  }
  return frases[hash % frases.length]
}
