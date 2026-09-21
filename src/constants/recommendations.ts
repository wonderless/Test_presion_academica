// src/constants/recommendations.ts
//
// Los 24 planes de actividades, transcritos del documento "Programa para
// mejorar modos de afrontamiento a la tensión académica" (Grajeda et al.,
// 2025). La transcripción se hizo una sola vez, al montar el sistema; a partir
// de aquí **este archivo es la fuente**: se edita directamente, como cualquier
// otro del proyecto. No hay que volver al Word ni regenerar nada.
//
// El texto de cada ejercicio es el del documento, palabra por palabra: son
// ejercicios clínicos y una paráfrasis los altera. Si hay que corregir algo,
// corríjalo aquí.
//
// Los enunciados de los ítems (`title`) coinciden con los de questions.ts, y
// hay una prueba que lo comprueba: el documento del programa tiene pequeñas
// variantes respecto del instrumento —"realizó" por "realizo" en el ítem 14,
// por ejemplo— y manda el instrumento.
//
// Cada ítem abre un plan de DOS días. A un participante solo se le abren los
// ítems que respondió con 1 o 2 dentro de un modo que salió BAJO.
import type { Mode } from "@/constants/questions"

export interface FeedbackQuestion {
  // Texto de la pregunta, que se responde SÍ / NO.
  question: string
  // Clave con la que se guarda la respuesta en Firestore.
  key: string
}

// El cuerpo de un ejercicio es una sucesión de párrafos y listas, porque en el
// documento original los hay intercalados: un párrafo que presenta, la lista de
// puntos y otro párrafo que cierra. Aplanarlo a una sola cadena perdía las
// viñetas y dejaba la pantalla plana.
export type ActivityBlock =
  | { tipo: "parrafo"; texto: string }
  | { tipo: "lista"; puntos: string[] }

export interface Activity {
  title: string
  cuerpo: ActivityBlock[]
}

export interface DayActivities {
  day: number
  activities: Activity[]
}

export interface RecommendationItem {
  id: string
  // Ítem del instrumento que abre esta recomendación.
  relatedQuestion: number
  // Enunciado de ese ítem, que es también el título del plan.
  title: string
  days: DayActivities[]
  feedbackQuestions: FeedbackQuestion[]
}

export const allRecommendations: Record<Mode, RecommendationItem[]> = {
  responsable: [
    {
      id: "recItem4",
      relatedQuestion: 4,
      title: `Respeto las normas de elaboración de tareas propuestas por el docente.`,
      days: [
        {
          day: 1,
          activities: [
            {
              title: `Ejercicio para enfocarse correctamente 1`,
              cuerpo: [
                { tipo: "parrafo", texto: `Antes de dormir reflexiono sobre los trabajos que dejan los profesores y repito 10 veces en mi interior (dejando intervalos de 5 segundos) “las reglas de la estructura de los trabajos que dejan los profesores son muy importantes para así poder desarrollar las competencias de mi profesión".` },
              ],
            },
            {
              title: `Ejercicio para enfocarse correctamente 2`,
              cuerpo: [
                { tipo: "parrafo", texto: `Luego del ejercicio uno repito en mi interior y con una fuerte convicción "si sigo con precisión las pautas de las tareas voy a tener una buena calificación y además aprenderé mejor el tema" (repetir 10 veces dejando un intervalo de 05 segundos).` },
              ],
            },
            {
              title: `Ejercicio de auto instrucciones`,
              cuerpo: [
                { tipo: "parrafo", texto: `Toma un lapicero y en una hoja escribe: Primero leo la rúbrica; segundo, verifico el formato antes de escribir; tercero, chequeo mi trabajo revisando que cumpla con las mas altas puntuaciones de la rubrica o cualquier tipo de esquema de calificación del profesor. Lee lo que has escrito 5 veces y repítelo 5 veces sin leerlo. Recuerda siempre esto antes de hacer una tarea.` },
              ],
            },
          ],
        },
        {
          day: 2,
          activities: [
            {
              title: `Ejercicio para enfocarse correctamente 1`,
              cuerpo: [
                { tipo: "parrafo", texto: `Antes de dormir reflexiono sobre los trabajos que dejan los profesores y repito 10 veces en mi interior (dejando intervalos de 5 segundos) “las reglas de la estructura de los trabajos que dejan los profesores son muy importantes para así poder desarrollar las competencias de mi profesión".` },
              ],
            },
            {
              title: `Ejercicio para enfocarse correctamente 2`,
              cuerpo: [
                { tipo: "parrafo", texto: `Luego del ejercicio uno repito en mi interior y con una fuerte convicción "si sigo con precisión las pautas de las tareas voy a tener una buena calificación y además aprenderé mejor el tema" (repetir 10 veces dejando un intervalo de 05 segundos).` },
              ],
            },
            {
              title: `Ejercicio de auto instrucciones`,
              cuerpo: [
                { tipo: "parrafo", texto: `Toma un lapicero y en una hoja escribe: Primero leo la rúbrica; segundo, verifico el formato antes de escribir; tercero, chequeo mi trabajo revisando que cumpla con las más altas puntuaciones de la rúbrica o cualquier tipo de esquema de calificación del profesor. Lee lo que has escrito 5 veces y repítelo 5 veces sin leerlo. Recuerda siempre esto antes de hacer una tarea.` },
              ],
            },
          ],
        },
      ],
      feedbackQuestions: [
        { question: `¿Crees que las rubricas para calificar los trabajos académicos son importantes?`, key: "item4Q1" },
        { question: `¿Notaste que ha mejorado la forma en que valoras las rubricas y reglas de las tareas`, key: "item4Q2" },
        { question: `¿Piensas que ahora eres más consciente de la importancia de seguir las reglas en las tareas?`, key: "item4Q3" },
      ],
    },
    {
      id: "recItem9",
      relatedQuestion: 9,
      title: `Me comunico apropiadamente con mis compañeros de clase.`,
      days: [
        {
          day: 1,
          activities: [
            {
              title: `Ejercicio de entrenamiento asertivo`,
              cuerpo: [
                { tipo: "parrafo", texto: `Razona sobre los importante y efectivo que será el que Antes de hacer un trabajo en equipo practiques las maneras en que hablaras con ellos manteniendo un tono amigable y respetuoso. Es necesario que tengas palabras o frases claves que usarás como “muy buena idea” “me parece excelente tu idea y será super si agregamos…….”, “creo que el trabajo podría mejorar si…..”` },
              ],
            },
            {
              title: `Ejercicio reestructurativo`,
              cuerpo: [
                { tipo: "parrafo", texto: `Si tu eres de los que piensan que "Si les pido que avancen van a pensar que soy pesado" o "Nadie tomará en cuenta mi opinión", es importante que cambies esa forma errada de pensar por una más funcional. Para ello repite en tu interior 5 veces y de manera convincente cuando trabaje en equipo y vea que se están demorando “les pediré que avancemos para tener a tiempo el trabajo y obtener una mejor calificación”.
Luego de ello repite en tu interior 5 veces y de manera convincente “mi opinión es importante y será tomada en cuenta”. Elabora un banner con esa frase y colócala frente a tu cama.` },
              ],
            },
            {
              title: `Ejercicio de escucha activa`,
              cuerpo: [
                { tipo: "parrafo", texto: `Recuerda que para una buena comunicación hay que saber escuchar y para ello debes atender al interlocutor. Imagina que estás con alguna persona con la que generalmente haces trabajos en equipo. Escucha lo que dice e interiormente parafrasea lo que ha dicho. Luego imagina que le respondes diciéndole “si entendí bien propones que……………………………………………….?.
Ahora llama a alguien de confianza y escúchalo, luego parafrasea en tu cabeza algo que te pareció interesante y dile “creo haber entendido que………….(repite lo que parafraseaste interiormente).` },
              ],
            },
          ],
        },
        {
          day: 2,
          activities: [
            {
              title: `Ejercicio de entrenamiento asertivo`,
              cuerpo: [
                { tipo: "parrafo", texto: `Razona sobre los importante y efectivo que será el que Antes de hacer un trabajo en equipo practiques las maneras en que hablaras con ellos manteniendo un tono amigable y respetuoso. Es necesario que tengas palabras o frases claves que usaras como “muy buena idea” “me parece excelente tu idea y será super si agregamos…….”, “creo que el trabajo podría mejorar si…..”` },
              ],
            },
            {
              title: `Ejercicio reestructurativo`,
              cuerpo: [
                { tipo: "parrafo", texto: `Si tu eres de los que piensan que "Si les pido que avancen van a pensar que soy pesado" o "Nadie tomará en cuenta mi opinión", es importante que cambies esa forma errada de pensar por una más funcional. Para ello repite en tu interior 5 veces y de manera convincente cuando trabaje en equipo y vea que se están demorando “les pediré que avancemos para tener a tiempo el trabajo y obtener una mejor calificación”.
Luego de ello repite en tu interior 5 veces y de manera convincente “mi opinión es importante y será tomada en cuenta”. Elabora un banner con esa frase y colócala frente a tu cama.` },
              ],
            },
            {
              title: `Ejercicio de escucha activa`,
              cuerpo: [
                { tipo: "parrafo", texto: `Recuerda que para una buena comunicación hay que saber escuchar y para ello debes atender al interlocutor. Imagina que estas con alguna persona con la que generalmente haces trabajos en equipo. Escucha lo que dice e interiormente parafrasea lo que ha dicho. Luego imagina que le respondes diciéndole “si entendí bien propones que……………………………………………….?.
Ahora llama a alguien de confianza y escúchalo, luego parafrasea en tu cabeza algo que te pareció interesante y dile “creo haber entendido que………….(repite lo que parafraseaste interiormente).` },
              ],
            },
          ],
        },
      ],
      feedbackQuestions: [
        { question: `¿Crees que practicar una comunicación amable, respetuosa y asertiva mejora tus relaciones con los compañeros de clase?`, key: "item9Q1" },
        { question: `¿Notaste que cambiar pensamientos como “si les pido que avancen van a pensar que soy pesado” o “nadie tomará en cuenta mi opinión” te permite expresarte y coordinar mejor el trabajo en equipo?`, key: "item9Q2" },
        { question: `¿Piensas que ahora eres más consciente de que la escucha activa y el parafraseo facilitan comprender a los demás y comunicarte apropiadamente?`, key: "item9Q3" },
      ],
    },
    {
      id: "recItem11",
      relatedQuestion: 11,
      title: `Busco la manera de entender lo que se explica en clases.`,
      days: [
        {
          day: 1,
          activities: [
            {
              title: `Termómetro de comprensión`,
              cuerpo: [
                { tipo: "parrafo", texto: `Es importante tomar apuntes de lo que se explica en clase pues la memoria es traicionera y que mejor si la tenemos impresa para recordar, pero también es importante entender. Para ello en clase tomaras apuntes en tu cuaderno y al final colocaras una V a los comprendido perfectamente una A a los medianamente entendido y una R a lo que no se ha comprendido. Trata de hacer preguntas al docente sobre lo que esta con R o busca otros medios para entender (como la IA). Cuando estes en clase ponlo en practica y veras como mejora tu aprendizaje.` },
              ],
            },
            {
              title: `Ejercicio reestructurativo`,
              cuerpo: [
                { tipo: "parrafo", texto: `Cierra los ojos y repite de manera convincente en tu interior 5 veces con intervalos de 5 segundos "Preguntar me ahorra horas de estudio frustrante en casa; aclarar dudas en clase es una conducta inteligente y eficiente".
Escribe en un banner ese mensaje y ponlo frente a tu cama.` },
              ],
            },
            {
              title: `Ejercicio con la Técnica Feynman`,
              cuerpo: [
                { tipo: "parrafo", texto: `Durante la clase o inmediatamente después, intento explicarme la idea central con mis propias palabras y con un lenguaje simple. Si encuentro vacíos en mi explicación, identificare exactamente qué debo investigar o consultar.` },
              ],
            },
          ],
        },
        {
          day: 2,
          activities: [
            {
              title: `Termómetro de comprensión`,
              cuerpo: [
                { tipo: "parrafo", texto: `Es importante tomar apuntes de lo que se explica en clase pues la memoria es traicionera y que mejor si la tenemos impresa para recordar, pero también es importante entender. Para ello en clase tomaras apuntes en tu cuaderno y al final colocaras una V a los comprendido perfectamente una A a los medianamente entendido y una R a lo que no se ha comprendido. Trata de hacer preguntas al docente sobre lo que esta con R o busca otros medios para entender (como la IA). Cuando estes en clase ponlo en práctica y veras como mejora tu aprendizaje.` },
              ],
            },
            {
              title: `Ejercicio reestructurativo`,
              cuerpo: [
                { tipo: "parrafo", texto: `Cierra los ojos y repite de manera convincente en tu interior 5 veces con intervalos de 5 segundos "Preguntar me ahorra horas de estudio frustrante en casa; aclarar dudas en clase es una conducta inteligente y eficiente".
Escribe en tu cuaderno ese mensaje con una letra bonita.` },
              ],
            },
            {
              title: `Ejercicio con la Técnica Feynman`,
              cuerpo: [
                { tipo: "parrafo", texto: `Durante la clase o inmediatamente después, intento explicarme la idea central con mis propias palabras y con un lenguaje simple. Si encuentro vacíos en mi explicación, identificare exactamente qué es lo que debo investigar o consultar.` },
              ],
            },
          ],
        },
      ],
      feedbackQuestions: [
        { question: `¿Crees que es necesario comprender lo que el docente explica en clase?`, key: "item11Q1" },
        { question: `¿Notaste que ha mejorado la forma en que valoras tu comprensión de las tareas?`, key: "item11Q2" },
        { question: `¿Piensas que ahora eres más consciente de la importancia de entender lo que se enseña en clase?`, key: "item11Q3" },
      ],
    },
    {
      id: "recItem12",
      relatedQuestion: 12,
      title: `Asisto puntualmente a las reuniones de trabajo grupal.`,
      days: [
        {
          day: 1,
          activities: [
            {
              title: `Ejercicio de planificación ambiental (control de estímulos)`,
              cuerpo: [
                { tipo: "parrafo", texto: `Toma tu agenda física o virtual y escribe de manera inmediata la fecha, hora y enlace de todas las reuniones grupales programadas para la semana. No dejes esta tarea para "después". Configura dos alarmas para cada reunión: una con 24 horas de anticipación (para recordar que se acerca) y otra con 15 minutos de anticipación (para prepararte y salir o conectarte).` },
              ],
            },
            {
              title: `Contrato conductual con reforzador`,
              cuerpo: [
                { tipo: "parrafo", texto: `Elabora un pequeño contrato contigo mismo. En una hoja, escribe:` },
                { tipo: "lista", puntos: [`"Yo, [tu nombre], me comprometo a asistir puntualmente a todas mis reuniones grupales. Por cada vez que lo logre, me daré un reforzador inmediato (ej. un dulce, escuchar una canción, ver un video corto)."`] },
                { tipo: "parrafo", texto: `Firma el contrato y colócalo en un lugar visible` },
              ],
            },
            {
              title: `Ejercicio Planifico mi llegada`,
              cuerpo: [
                { tipo: "parrafo", texto: `Antes de tu próxima reunión grupal, anota en tu cuaderno la hora en que empieza, cuánto tiempo necesitas para llegar y qué imprevistos podrían retrasarte. Después, establece una hora de salida que te permita llegar con anticipación.` },
              ],
            },
            {
              title: `Ejercicio Cambio mi forma de pensar`,
              cuerpo: [
                { tipo: "parrafo", texto: `Identifica un pensamiento que pueda hacerte llegar tarde, como “todavía tengo tiempo” o “unos minutos tarde no importan”. Luego, cierra los ojos y repite 3 veces:
“Llegar puntualmente es parte de mi responsabilidad con el grupo y me permite evitar la tensión de llegar apresurado.”` },
              ],
            },
          ],
        },
        {
          day: 2,
          activities: [
            {
              title: `Ejercicio de generalización y espaciamiento del esfuerzo`,
              cuerpo: [
                { tipo: "parrafo", texto: `Mantén el sistema de alarmas del Día 1. Sin embargo, el refuerzo ya no será inmediato, sino que se acumulará. Por ejemplo, si asistes puntualmente a todas las reuniones de la semana, el fin de semana te darás un reforzador mayor (ej. ver una película, comprar algo que te guste). Esto entrena a tu cerebro para mantener la conducta sin necesidad de una recompensa instantánea, consolidando el hábito a largo plazo.` },
              ],
            },
            {
              title: `Auto-registro de progreso`,
              cuerpo: [
                { tipo: "parrafo", texto: `Lleva un registro simple en tu agenda:` },
                { tipo: "lista", puntos: [`Reunión: _____ Hora: _______ ¿Llegué puntual? (SÍ / NO)`, `Si la respuesta es “NO “, anota brevemente qué impidió tu puntualidad y cómo podrías solucionarlo para la próxima.`] },
              ],
            },
            {
              title: `Ejercicio Planifico mi llegada`,
              cuerpo: [
                { tipo: "parrafo", texto: `Antes de tu próxima reunión grupal, anota en tu cuaderno la hora en que empieza, cuánto tiempo necesitas para llegar y qué imprevistos podrían retrasarte. Después, establece una hora de salida que te permita llegar con anticipación.` },
              ],
            },
            {
              title: `Ejercicio Cambio mi forma de pensar`,
              cuerpo: [
                { tipo: "parrafo", texto: `Identifica un pensamiento que pueda hacerte llegar tarde, como “todavía tengo tiempo” o “unos minutos tarde no importan”. Luego, cierra los ojos y repite 3 veces:
“Llegar puntualmente es parte de mi responsabilidad con el grupo y me permite evitar la tensión de llegar apresurado.”` },
              ],
            },
          ],
        },
      ],
      feedbackQuestions: [
        { question: `¿Crees que usar dos alarmas (una con 24h y otra con 15 min de anticipación) te ayuda a organizar mejor tu tiempo para las reuniones?`, key: "item12Q1" },
        { question: `¿Notaste que darte un pequeño premio por ser puntual aumenta tu motivación para llegar a tiempo?`, key: "item12Q2" },
        { question: `¿Piensas que ahora eres más consciente de que la puntualidad es una conducta que puedes entrenar y mejorar?`, key: "item12Q3" },
      ],
    },
    {
      id: "recItem13",
      relatedQuestion: 13,
      title: `Cumplo con las obligaciones asumidas en los trabajos grupales o de equipo.`,
      days: [
        {
          day: 1,
          activities: [
            {
              title: `Ejercicio de descomposición de tareas`,
              cuerpo: [
                { tipo: "parrafo", texto: `Elige una de las tareas que tienes pendiente para tu equipo. Descompón la tarea en al menos 5 pasos pequeños, muy específicos y ejecutables en no más de 15-20 minutos cada uno.` },
                { tipo: "lista", puntos: [`Ejemplo (para una investigación):
1) Buscar 2 artículos relevantes.
2) Leer el resumen de cada artículo.
3) Escribir un párrafo con las ideas principales del primer artículo.
4) Escribir un párrafo con las ideas del segundo.
5) Unir los párrafos y enviarlos al documento grupal.`] },
              ],
            },
            {
              title: `Ejercicio de "primero lo más difícil"`,
              cuerpo: [
                { tipo: "parrafo", texto: `Identifica cuál de esos pasos te genera más ansiedad o rechazo. Comprométete a hacer ese paso primero en tu sesión de trabajo. Una vez que lo inicies, la resistencia disminuirá y te será más fácil continuar con los siguientes.` },
              ],
            },
          ],
        },
        {
          day: 2,
          activities: [
            {
              title: `Ejercicio de “regla de los 2 minutos”`,
              cuerpo: [
                { tipo: "parrafo", texto: `Si un paso de la descomposición del Día 1 te parece aún muy grande, aplícala regla de los 2 minutos: comprométete a hacer solo 2 minutos de esa tarea. Si después de 2 minutos quieres parar, lo haces sin culpa. Lo más probable es que, una vez iniciada, la inercia te lleve a continuar.` },
              ],
            },
            {
              title: `Ejercicio de señalización conductual`,
              cuerpo: [
                { tipo: "parrafo", texto: `Elige un estímulo que sirva como señal para iniciar tu trabajo. Por ejemplo, preparar tu bebida favorita, poner una lista de reproducción específica, o limpiar tu escritorio. Realiza siempre esta acción justo antes de comenzar a trabajar en tus pasos. Con el tiempo, esa señal se asociará con el estado de "trabajo enfocado".` },
              ],
            },
          ],
        },
      ],
      feedbackQuestions: [
        { question: `¿Crees que dividir una tarea grande en pasos pequeños te ayuda a sentir menos ansiedad y a empezar con más facilidad?`, key: "item13Q1" },
        { question: `¿Notaste que comenzar con el paso que más temor te generaba redujo tu procrastinación general?`, key: "item13Q2" },
        { question: `¿Piensas que ahora eres más consciente de que el "todo" se construye paso a paso y que no necesitas tenerlo todo resuelto desde el principio?`, key: "item13Q3" },
      ],
    },
    {
      id: "recItem17",
      relatedQuestion: 17,
      title: `Reconozco los métodos de evaluación de los docentes y busco respetar los criterios planteados.`,
      days: [
        {
          day: 1,
          activities: [
            {
              title: `Ejercicio de reestructuración cognitiva`,
              cuerpo: [
                { tipo: "parrafo", texto: `Identifica y escribe los pensamientos automáticos que te vienen a la mente cuando piensas en revisar la rúbrica de un trabajo. Ejemplos: "Ya sé lo que pide", "Solo es un formato", "No necesito leerlo, el profesor ya lo explicó".
Al lado de cada pensamiento, escríbete una alternativa más funcional y realista:` },
                { tipo: "lista", puntos: [`"Revisar la rúbrica es la hoja de ruta para conseguir la máxima nota."`, `"La rúbrica me ahorra tiempo porque sé exactamente qué y cómo hacerlo."`, `"Entender los criterios del profesor es una muestra de profesionalismo y respeto."`] },
              ],
            },
            {
              title: `Ejercicio de codificación activa`,
              cuerpo: [
                { tipo: "parrafo", texto: `Toma una rúbrica de un trabajo actual y, con un marcador, subraya las palabras clave (verbos de acción como "analizar", "comparar", "argumentar" y los criterios de mayor puntuación). Luego, en una hoja aparte, reescribe esos criterios con tus propias palabras, como si se los estuvieras explicando a un compañero.` },
              ],
            },
          ],
        },
        {
          day: 2,
          activities: [
            {
              title: `Ejercicio de auto-instrucciones`,
              cuerpo: [
                { tipo: "parrafo", texto: `Antes de empezar a redactar tu trabajo, cierra los ojos y repite en voz baja o mentalmente la siguiente secuencia de pasos 5 veces: "
Paso 1: Abro la rúbrica.
Paso 2: Releo los criterios de máxima puntuación.
Paso 3: Reviso mi borrador comparándolo con esos criterios.
Paso 4: Ajusto lo que sea necesario.
Paso 5: Entrego con confianza." El objetivo es que esta secuencia se convierta en un hábito mental automático.` },
              ],
            },
            {
              title: `Ejercicio de práctica conductual`,
              cuerpo: [
                { tipo: "parrafo", texto: `Elige una tarea que hayas entregado recientemente y evalúala tú mismo con la rúbrica. Asígnate una puntuación y reflexiona: ¿En qué criterios obtuve mejor puntuación? ¿En cuáles podría mejorar? Este ejercicio te entrena para "pensar como el evaluador".` },
              ],
            },
          ],
        },
      ],
      feedbackQuestions: [
        { question: `¿Crees que leer y comprender a fondo la rúbrica antes de empezar un trabajo te ayuda a obtener mejores calificaciones?`, key: "item17Q1" },
        { question: `¿Notaste que cambiar tus pensamientos sobre la rúbrica (de "opcional" a "esencial") te motiva a usarla más?`, key: "item17Q2" },
        { question: `¿Piensas que ahora eres más consciente de que la rúbrica es una guía para el aprendizaje, no solo un instrumento de calificación?`, key: "item17Q3" },
      ],
    },
    {
      id: "recItem18",
      relatedQuestion: 18,
      title: `Me matriculo en horarios que me permitan desarrollarme sin tensión extrema.`,
      days: [
        {
          day: 1,
          activities: [
            {
              title: `Mapear`,
              cuerpo: [
                { tipo: "parrafo", texto: `Mapea tus horarios disponibles de costo-beneficios, horas de traslado, sueño etc. Analiza las opciones según y clasificarlo según el nivel de tensión percibido.
De preferencia, elige la opción que te permita dormir al menos 6 horas, tener tiempo para comer sin prisas y cuyo nivel de tensión estimado sea el más bajo.` },
              ],
            },
            {
              title: `Ejercicio de identificación de distorsiones cognitivas`,
              cuerpo: [
                { tipo: "parrafo", texto: `Reflexiona y escribe las creencias que guían tu elección. ¿Creo que debo llevar la máxima cantidad de cursos para ser buen estudiante? ¿Miedo a atrasarme si no llevo X cursos? ¿Siento que debo demostrar mi capacidad con un horario muy pesado? Al lado de cada creencia, escribe una alternativa equilibrada.` },
              ],
            },
          ],
        },
        {
          day: 2,
          activities: [
            {
              title: `Ejercicio de toma de decisiones y confirmación conductual`,
              cuerpo: [
                { tipo: "parrafo", texto: `Toma la decisión final basándote en tu análisis del Día 1, priorizando tu salud mental como factor clave para tu éxito y permanencia en la universidad. Una vez tomada la decisión, inscríbete en ese horario. La acción concreta es lo que cierra el ciclo y reduce la ansiedad.` },
              ],
            },
            {
              title: `Ejercicio de planificación de contingencias`,
              cuerpo: [
                { tipo: "parrafo", texto: `Una vez matriculado, si identificas que hay cruces de horarios o que la carga es excesiva, investiga de inmediato los procedimientos para un cambio de matrícula o ratificación. Tener un “plan B” reduce la sensación de impotencia y te da control sobre la situación.` },
              ],
            },
          ],
        },
      ],
      feedbackQuestions: [
        { question: `¿Crees que elegir un horario pensado en tu descanso y bienestar es una decisión inteligente y no un signo de debilidad?`, key: "item18Q1" },
        { question: `¿Notaste que analizar el costo-beneficio de tus opciones te ayuda a tomar decisiones más objetivas y menos impulsivas?`, key: "item18Q2" },
        { question: `¿Piensas que ahora eres más consciente de que un horario equilibrado es una inversión en tu rendimiento a largo plazo?`, key: "item18Q3" },
      ],
    },
    {
      id: "recItem19",
      relatedQuestion: 19,
      title: `Me focalizo en las tareas hasta cumplirlas.`,
      days: [
        {
          day: 1,
          activities: [
            {
              title: `Ejercicio de control de estímulos (higiene ambiental)`,
              cuerpo: [
                { tipo: "parrafo", texto: `Identifica tus 3 principales distractores (ej. el celular, las notificaciones, el ruido externo). Aplica un cambio físico para cada uno: pon el celular en modo avión y fuera de tu alcance, cierra las pestañas irrelevantes del navegador, usa auriculares con ruido blanco o música instrumental si el ruido es un problema.` },
              ],
            },
            {
              title: `Ejercicio de enfoque estructurado (Técnica Pomodoro modificada)`,
              cuerpo: [
                { tipo: "parrafo", texto: `Coloca un temporizador en 25 minutos. Durante ese tiempo, tu única tarea es trabajar en lo que te propusiste. Si surge un pensamiento distractor, escríbelo en un papel para atenderlo después y vuelve a tu tarea. Cuando suene el temporizador, tómate un descanso de 5 minutos (levántate, estírate, toma agua). Realiza 4 ciclos de 25/5 y luego tómate un descanso más largo de 15-30 minutos.` },
              ],
            },
          ],
        },
        {
          day: 2,
          activities: [
            {
              title: `Ejercicio de reestructuración cognitiva para pensamientos catastróficos`,
              cuerpo: [
                { tipo: "parrafo", texto: `Los pensamientos como "No voy a terminar", "Esto es demasiado difícil" interrumpen el foco. Cuando aparezcan, no los enfrentes con lógica, sino con humor o exageración absurda. Por ejemplo, si piensas "Nunca terminaré", respóndete mentalmente con "Claro que no, y seguramente los extraterrestres me vendrán a ayudar". Esta técnica, llamada "detención del pensamiento con humor", rompe la cadena de rumiación y le quita poder a la idea catastrófica sin generar un debate interno agotador.` },
              ],
            },
            {
              title: `Ejercicio de “estado de fluidez”`,
              cuerpo: [
                { tipo: "parrafo", texto: `Antes de empezar tu siguiente bloque Pomodoro, visualiza por 1 minuto cómo te sientes cuando estás completamente enfocado. Imagina la sensación de progreso y logro. Esta visualización positiva te predispone a entrar en ese estado de concentración profunda.` },
              ],
            },
          ],
        },
      ],
      feedbackQuestions: [
        { question: `¿Crees que la técnica Pomodoro (25 min de foco / 5 de descanso) te ayuda a mantener la concentración por más tiempo?`, key: "item19Q1" },
        { question: `¿Notaste que modificar tu ambiente (ej. apagar el celular) reduce la cantidad de veces que te distraes?`, key: "item19Q2" },
        { question: `¿Piensas que ahora eres más consciente de que los pensamientos distractores son solo eso, pensamientos, y que puedes elegir no seguirlos?`, key: "item19Q3" },
      ],
    },
    {
      id: "recItem21",
      relatedQuestion: 21,
      title: `Durante las clases atiendo y tomo anotaciones de lo que se explica.`,
      days: [
        {
          day: 1,
          activities: [
            {
              title: `Ejercicio de reestructuración cognitiva`,
              cuerpo: [
                { tipo: "parrafo", texto: `Si sueles pensar “No es necesario tomar apuntes porque después puedo revisar las diapositivas” o “Puedo prestar atención sin escribir nada”, identifica si este pensamiento realmente te ayuda a aprender. Luego, reemplázalo por una idea más funcional. Cierra los ojos y repite en tu interior 5 veces, dejando intervalos de 5 segundos: “Tomar apuntes me ayuda a mantener la atención, organizar la información y recordar mejor lo aprendido.” Después, escribe esta frase en una hoja y colócala en un lugar visible de tu espacio de estudio.` },
              ],
            },
            {
              title: `Ejercicio de auto-instrucciones`,
              cuerpo: [
                { tipo: "parrafo", texto: `Antes de ingresar a clase, escribe en una hoja:` },
                { tipo: "lista", puntos: [`Primero, preparo mi cuaderno o dispositivo para tomar apuntes.`, `Segundo, mantengo mi atención en la explicación del docente.`, `Tercero, registro las ideas principales y los ejemplos importantes.`, `Cuarto, al finalizar la clase reviso brevemente lo que anoté.`] },
                { tipo: "parrafo", texto: `Lee estas instrucciones 5 veces y posteriormente repítelas 5 veces sin mirar la hoja.` },
              ],
            },
            {
              title: `Ejercicio de autorregistro de atención`,
              cuerpo: [
                { tipo: "parrafo", texto: `Durante la clase, identifica tres ideas principales explicadas por el docente y escríbelas con tus propias palabras. Al finalizar, califica del 1 al 10 cuánto consideras que estuviste atento durante la clase.` },
              ],
            },
          ],
        },
        {
          day: 2,
          activities: [
            {
              title: `Ejercicio de reestructuración cognitiva`,
              cuerpo: [
                { tipo: "parrafo", texto: `Si aparece nuevamente el pensamiento “Después puedo aprenderlo” o “No necesito anotar porque recordaré la explicación”, cuestiónalo preguntándote: ¿Cuántas veces he olvidado información después de una clase? ¿Qué beneficio obtengo al escribir las ideas principales? ¿Qué puedo hacer durante la clase para facilitar mi aprendizaje?
Luego repite 5 veces: “Prestar atención y tomar apuntes durante la clase reduce la necesidad de aprender todo nuevamente después.”` },
              ],
            },
            {
              title: `Ejercicio de auto-instrucciones`,
              cuerpo: [
                { tipo: "parrafo", texto: `Antes de la clase repite:` },
                { tipo: "lista", puntos: [`Escucho`, `Identifico lo importante`, `Anoto`, `Rreviso`] },
                { tipo: "parrafo", texto: `Durante la clase intenta aplicar esta secuencia.` },
              ],
            },
            {
              title: `Ejercicio de autorregistro`,
              cuerpo: [
                { tipo: "parrafo", texto: `Al finalizar la clase, vuelve a calificar del 1 al 10 tu nivel de atención y compara el resultado con el Día 1.` },
              ],
            },
          ],
        },
      ],
      feedbackQuestions: [
        { question: `¿Crees que tomar apuntes ayuda a mantener la atención durante las clases?`, key: "item21Q1" },
        { question: `¿Notaste que ha mejorado tu disposición para tomar apuntes durante las explicaciones?`, key: "item21Q2" },
        { question: `¿Consideras que ahora eres más consciente de la importancia de mantener la atención durante las clases?`, key: "item21Q3" },
      ],
    },
    {
      id: "recItem22",
      relatedQuestion: 22,
      title: `Salgo de mi casa con bastante anticipación para llegar puntual a clases.`,
      days: [
        {
          day: 1,
          activities: [
            {
              title: `Ejercicio de reestructuración cognitiva`,
              cuerpo: [
                { tipo: "parrafo", texto: `Es común pensar: "Tardaré solo 20 minutos" o "El tráfico no estará tan pesado". Esto se llama sesgo de planificación. Toma una hoja y escribe tres veces que sí llegaste tarde en el último mes. Al lado, anota el tiempo REAL que necesitaste y el tiempo que HABÍAS CALCULADO. Ahora, repite en tu interior 5 veces esta nueva creencia funcional: "Siempre sumo 10 minutos extra a mi cálculo mental. Salir antes no es pérdida de tiempo, es mi seguro contra imprevistos."` },
              ],
            },
            {
              title: `Ejercicio de encadenamiento hacia atrás`,
              cuerpo: [
                { tipo: "parrafo", texto: `Define la hora EXACTA a la que debes estar sentado en el aula (ej. 8:00 a.m.). Resta el tiempo de traslado real (ej. 25 minutos) → 7:35 a.m. salir. Resta el tiempo de preparación (ej. vestirse, recoger mochila = 10 min) → 7:25 a.m. empezar a prepararse. Resta el tiempo de aseo/desayuno (ej. 20 min) → 7:05 a.m. levantarse. Escribe esta cadena en un post-it y pégalo en tu espejo. Tu meta es cumplir la hora de inicio (7:05 a.m.).` },
              ],
            },
          ],
        },
        {
          day: 2,
          activities: [
            {
              title: `Ejercicio de exposición conductual con “regla de los 5 minutos”`,
              cuerpo: [
                { tipo: "parrafo", texto: `El día de hoy, programa una alarma 5 minutos ANTES de la hora de salida que calculaste. Esa alarma será tu señal para ponerte los zapatos y tomar tus llaves, sin revisar el celular ni hacer nada más. Esa acción física te "engancha" a la salida.` },
              ],
            },
            {
              title: `Ejercicio de asociación de reforzadores`,
              cuerpo: [
                { tipo: "parrafo", texto: `Al llegar puntual y con tiempo, siéntate, respira hondo y recompénsate. No con algo material, sino con un minuto de gratitud: cierra los ojos y di: "Llegar temprano me regala paz. Este minuto de calma es mi premio." Esto asocia la puntualidad con una sensación placentera de control.` },
              ],
            },
          ],
        },
      ],
      feedbackQuestions: [
        { question: `¿Crees que sumar 10 minutos extra a tu cálculo de tiempo reduce la ansiedad por llegar tarde?`, key: "item22Q1" },
        { question: `¿Notaste que planificar tu salida hacia atrás (desde la hora de llegada) hace más realista tu organización?`, key: "item22Q2" },
        { question: `¿Piensas que ahora eres más consciente de que la puntualidad no es solo "no llegar tarde", sino "llegar tranquilo"?`, key: "item22Q3" },
      ],
    },
    {
      id: "recItem23",
      relatedQuestion: 23,
      title: `Llevo mis útiles, materiales o indumentaria necesarios para las clases.`,
      days: [
        {
          day: 1,
          activities: [
            {
              title: `Ejercicio de reestructuración cognitiva`,
              cuerpo: [
                { tipo: "parrafo", texto: `Identifica pensamientos como “Seguro no necesitaré ese material”, “Si me olvido algo puedo solucionarlo después” o “No es necesario preparar mis cosas con anticipación”. Reflexiona sobre cómo olvidar materiales puede generar preocupación, interrupciones y dificultades para participar adecuadamente en clase. Luego repite 5 veces: “Preparar mis materiales con anticipación me permite estar preparado, participar mejor y reducir imprevistos durante la clase.”` },
              ],
            },
            {
              title: `Ejercicio de control de estímulos y planificación`,
              cuerpo: [
                { tipo: "parrafo", texto: `Elabora una lista de los materiales que necesitas llevar habitualmente a clases. Por ejemplo:
☐ Cuaderno
☐ Lapiceros
☐ Laptop/tablet
☐ Cargador
☐ Lecturas
☐ Material solicitado por el docente
☐ Indumentaria específica
☐ Otros: __________
Coloca esta lista cerca de la puerta de tu casa o en un lugar que puedas observar antes de salir.` },
              ],
            },
            {
              title: `Ejercicio de auto-instrucciones`,
              cuerpo: [
                { tipo: "parrafo", texto: `Repite: “Antes de salir reviso mi lista → preparo mis materiales → compruebo que llevo lo necesario → salgo.”` },
              ],
            },
          ],
        },
        {
          day: 2,
          activities: [
            {
              title: `Ejercicio de reestructuración cognitiva`,
              cuerpo: [
                { tipo: "parrafo", texto: `Si aparece el pensamiento “Hoy probablemente no necesitaré esos materiales”, pregúntate: ¿Qué podría ocurrir si el docente los solicita? ¿Cómo me sentiría si no los tuviera? ¿Cuánto esfuerzo me cuesta prepararlos previamente? Después repite: “Prepararme antes es más sencillo que solucionar un imprevisto durante la clase.”` },
              ],
            },
            {
              title: `Ejercicio de práctica conductual`,
              cuerpo: [
                { tipo: "parrafo", texto: `Antes de salir de casa, utiliza nuevamente tu lista del Día 1. Evita confiar únicamente en la memoria y realiza físicamente la comprobación de cada elemento. Al finalizar, registra:` },
                { tipo: "lista", puntos: [`¿Llevé todos los materiales? SÍ / NO`, `¿Olvidé algún material? SÍ / NO`, `¿Cuánto estrés sentí por la preparación? 1–10`] },
              ],
            },
          ],
        },
      ],
      feedbackQuestions: [
        { question: `¿Crees que preparar tus materiales previamente ayuda a reducir los imprevistos durante las clases?`, key: "item23Q1" },
        { question: `¿Notaste que ha mejorado tu hábito de revisar tus materiales antes de salir?`, key: "item23Q2" },
        { question: `¿Piensas que ahora eres más consciente de la importancia de estar preparado para las actividades académicas?`, key: "item23Q3" },
      ],
    },
    {
      id: "recItem24",
      relatedQuestion: 24,
      title: `Me siento en una posición que me permita escuchar y ver la clase atentamente.`,
      days: [
        {
          day: 1,
          activities: [
            {
              title: `Ejercicio de reestructuración cognitiva`,
              cuerpo: [
                { tipo: "parrafo", texto: `Identifica pensamientos como “Cualquier lugar está bien”, “No importa dónde me siente” o “Puedo escuchar aunque esté lejos o tenga obstáculos visuales”. Reflexiona sobre cómo una ubicación poco adecuada puede generar distracciones y dificultar la recepción de la información. Luego repite 5 veces: “Elegir un lugar adecuado facilita mi atención y me permite participar mejor en clase.”` },
              ],
            },
            {
              title: `Ejercicio de control de estímulos`,
              cuerpo: [
                { tipo: "parrafo", texto: `Antes de iniciar la clase, observa el aula y elige una posición desde donde puedas:` },
                { tipo: "lista", puntos: [`Ver claramente al docente o la pantalla.`, `Escuchar adecuadamente.`, `Tomar apuntes cómodamente.`, `Reducir distractores cercanos.`] },
                { tipo: "parrafo", texto: `Una vez elegido el lugar, permanece allí durante la mayor parte de la clase.` },
              ],
            },
            {
              title: `Ejercicio de auto-instrucciones`,
              cuerpo: [
                { tipo: "parrafo", texto: `Escribe: “Primero observo el aula; segundo, identifico el lugar donde pueda ver y escuchar mejor; tercero, me ubico allí; cuarto, mantengo mi atención en la clase.”
Lee las instrucciones 5 veces y repítelas posteriormente sin leerlas.` },
              ],
            },
          ],
        },
        {
          day: 2,
          activities: [
            {
              title: `Ejercicio de reestructuración cognitiva`,
              cuerpo: [
                { tipo: "parrafo", texto: `Si aparece el pensamiento “No importa dónde me siente”, pregúntate: ¿Puedo ver y escuchar claramente desde donde estoy? ¿Qué distractores existen a mi alrededor? ¿Cambiar de lugar podría ayudarme a concentrarme? Después repite 5 veces: “Mi entorno influye en mi atención; elegir conscientemente dónde sentarme es una forma de cuidar mi aprendizaje.”` },
              ],
            },
            {
              title: `Ejercicio de práctica conductual`,
              cuerpo: [
                { tipo: "parrafo", texto: `Antes de iniciar la clase, elige nuevamente un lugar que favorezca tu atención. Durante la clase registra tu nivel de concentración del 1 al 10.
Al finalizar, compara:
Día 1: ____ /10
Día 2: ____ /10
Reflexiona brevemente: ¿Qué características del lugar me ayudaron o dificultaron prestar atención?` },
              ],
            },
          ],
        },
      ],
      feedbackQuestions: [
        { question: `¿Crees que el lugar donde te sientas puede influir en tu atención durante la clase?`, key: "item24Q1" },
        { question: `¿Notaste que ha mejorado tu disposición para elegir un lugar que facilite tu concentración?`, key: "item24Q2" },
        { question: `¿Piensas que ahora eres más consciente de la importancia de reducir los distractores durante las clases?`, key: "item24Q3" },
      ],
    },
  ],
  organizado: [
    {
      id: "recItem1",
      relatedQuestion: 1,
      title: `Conozco la fecha de los exámenes y me preparo con mucha anticipación.`,
      days: [
        {
          day: 1,
          activities: [
            {
              title: `Ejercicio de reestructuración cognitiva`,
              cuerpo: [
                { tipo: "parrafo", texto: `Identifica la creencia: "Aún falta mucho, empezaré después". Reflexiona sobre cuántas veces has tenido que estudiar apurado y con ansiedad. Sustituye esa creencia por: "El tiempo pasa volando. Empezar hoy es un acto de autoprotección, no de exageración". Repite esta frase en tu interior 10 veces mientras marcas en tu calendario la fecha exacta del examen.` },
              ],
            },
            {
              title: `Ejercicio de “Cuenta regresiva inversiva”`,
              cuerpo: [
                { tipo: "parrafo", texto: `Toma la fecha del examen y resta 7 días (una semana antes). Esa será tu fecha límite personal para tener todo el temario repasado al menos una vez. Luego, desde ese día hacia atrás, distribuye los temas en bloques diarios de 30-40 minutos. Escribe en tu agenda: "Día X: repasar tema Y".` },
              ],
            },
          ],
        },
        {
          day: 2,
          activities: [
            {
              title: `Ejercicio de “Primer paso mínimo”`,
              cuerpo: [
                { tipo: "parrafo", texto: `Para vencer la inercia inicial, tu única meta hoy es abrir el material del primer tema y leerlo durante 5 minutos. Si después de 5 minutos quieres parar, lo haces sin culpa. Lo más probable es que la curiosidad te lleve a continuar. Este ejercicio rompe la barrera de la "tarea gigante" y transforma el inicio en algo indoloro.` },
              ],
            },
            {
              title: `Ejercicio de señalización temprana`,
              cuerpo: [
                { tipo: "parrafo", texto: `Coloca dos alarmas en tu celular: una con 15 días de anticipación (recordatorio de que "ya falta poco") y otra con 7 días (recordatorio de tu fecha límite personal). Esto externaliza el recuerdo y no depende de tu memoria.` },
              ],
            },
          ],
        },
      ],
      feedbackQuestions: [
        { question: `¿Crees que marcar una fecha límite personal (una semana antes del examen) te ayuda a distribuir mejor el estudio?`, key: "item1Q1" },
        { question: `¿Notaste que empezar con solo 5 minutos de lectura reduce la resistencia a estudiar?`, key: "item1Q2" },
        { question: `¿Piensas que ahora eres más consciente de que la anticipación no es ansiedad, sino una estrategia de control?`, key: "item1Q3" },
      ],
    },
    {
      id: "recItem2",
      relatedQuestion: 2,
      title: `Reviso el silabo y me ordeno para cumplir con lo planificado.`,
      days: [
        {
          day: 1,
          activities: [
            {
              title: `Ejercicio de "Traducción del sílabo" (Codificación activa)`,
              cuerpo: [
                { tipo: "parrafo", texto: `Imprime o abre el sílabo de una de tus asignaturas actuales. Con un resaltador, subraya las unidades, los logros de aprendizaje y las fechas de evaluación. Luego, en una hoja aparte, escribe una versión resumida con tus propias palabras, como si fueras a explicarle a un compañero qué es lo más importante que deben aprender y en qué fechas.` },
              ],
            },
            {
              title: `Ejercicio de reestructuración cognitiva (Del "debería" al "quiero")`,
              cuerpo: [
                { tipo: "parrafo", texto: `Cambia la frase interna "Tengo que revisar el sílabo" (obligación) por "Revisar el sílabo me da el superpoder de saber qué viene y no llevarme sorpresas". Repite esta versión 5 veces mientras hojeas el sílabo.` },
              ],
            },
          ],
        },
        {
          day: 2,
          activities: [
            {
              title: `Ejercicio de "Planificación semanal" (Micro-planificación)`,
              cuerpo: [
                { tipo: "parrafo", texto: `Toma tu versión resumida del sílabo y elige solo la unidad de esta semana. Anota en tu agenda qué actividad, lectura o avance necesitas completar para estar al día con esa unidad antes de la próxima clase.` },
              ],
            },
            {
              title: `Ejercicio de "Revisión del mapa" (Checklist semanal)`,
              cuerpo: [
                { tipo: "parrafo", texto: `Programa un bloque de 10 minutos cada domingo por la noche para revisar el sílabo de la semana entrante. Este acto ritual evita que el sílabo se convierta en un documento olvidado y te convierte en el "piloto" de tu propio aprendizaje.` },
              ],
            },
          ],
        },
      ],
      feedbackQuestions: [
        { question: `¿Crees que resumir el sílabo con tus propias palabras te ayuda a entender mejor el plan del curso?`, key: "item2Q1" },
        { question: `¿Notaste que dedicar 10 minutos los domingos a planificar la semana reduce la sensación de estar "perdido" en el curso?`, key: "item2Q2" },
        { question: `¿Piensas que ahora eres más consciente de que el sílabo es una herramienta de navegación y no solo un requisito administrativo?`, key: "item2Q3" },
      ],
    },
    {
      id: "recItem3",
      relatedQuestion: 3,
      title: `Luego que el docente deja un trabajo, me organizo e inicio casi de inmediato las tareas para completarlas antes de los plazos señalados.`,
      days: [
        {
          day: 1,
          activities: [
            {
              title: `Ejercicio de "Regla de los 2 minutos" (Romper la inercia)`,
              cuerpo: [
                { tipo: "parrafo", texto: `El mismo día que el profesor deja el trabajo, en los siguientes 30 minutos, realiza una acción mínima que no tome más de 2 minutos: leer el enunciado, descargar el formato, o escribir el título en un documento en blanco. Esta pequeña acción cumple el objetivo psicológico de "abrir el expediente". Una vez abierto, tu cerebro ya no lo ve como una tarea nueva y aterradora, sino como algo ya iniciado.` },
              ],
            },
            {
              title: `Ejercicio de reestructuración cognitiva (Atacar la idealización del "futuro yo")`,
              cuerpo: [
                { tipo: "parrafo", texto: `Identifica el pensamiento: "Lo haré mañana con más tiempo y energía". Pregúntate: "¿Realmente mañana tendré MENOS cosas que hacer que hoy?". Reemplázalo por: "Empezar hoy, aunque sea un borrador, es un regalo que le hago a mi yo del futuro". Repítelo 5 veces.` },
              ],
            },
          ],
        },
        {
          day: 2,
          activities: [
            {
              title: `Ejercicio de "Compromiso público" (Contrato conductual)`,
              cuerpo: [
                { tipo: "parrafo", texto: `En tu grupo de trabajo o con un compañero de confianza, comunica en voz alta: "Hoy voy a hacer el esquema del trabajo". El compromiso social aumenta la probabilidad de cumplirlo.` },
              ],
            },
            {
              title: `Ejercicio de "Tarea mínima viable" (Primer entregable)`,
              cuerpo: [
                { tipo: "parrafo", texto: `El día 2, tu meta no es hacer todo el trabajo, sino producir un "entregable cero": un índice, un mapa conceptual o un párrafo introductorio. Eso ya te da una ventaja de 3 días sobre tus compañeros y disminuye drásticamente la ansiedad.` },
              ],
            },
          ],
        },
      ],
      feedbackQuestions: [
        { question: `¿Crees que hacer una tarea de 2 minutos justo después de que el docente la deja reduce tu tendencia a posponer?`, key: "item3Q1" },
        { question: `¿Notaste que hacer un "entregable cero" (aunque sea pequeño) te da la tranquilidad de saber que ya avanzaste?`, key: "item3Q2" },
        { question: `¿Piensas que ahora eres más consciente de que el "mañana" es un espejismo y el "hoy" es el único día que realmente puedes controlar?`, key: "item3Q3" },
      ],
    },
    {
      id: "recItem5",
      relatedQuestion: 5,
      title: `Uso técnicas de autocontrol emocional cuando me siento presionado por la carga académica.`,
      days: [
        {
          day: 1,
          activities: [
            {
              title: `Ejercicio de "Parada de emergencia" (Técnica de anclaje fisiológico - Respiración 4-7-8)`,
              cuerpo: [
                { tipo: "parrafo", texto: `Cuando sientas que la presión te desborda, aplica este protocolo inmediato:` },
                { tipo: "lista", puntos: [`Inhala por la nariz durante 4 segundos.`, `Mantén el aire 7 segundos.`, `Exhala lentamente por la boca durante 8 segundos.`] },
                { tipo: "parrafo", texto: `Repite este ciclo 3 veces. Esta respiración activa el sistema parasimpático y reduce el cortisol en minutos. Practica esto 3 veces al día aunque no estés estresado, para automatizarlo.` },
              ],
            },
            {
              title: `Ejercicio de reestructuración cognitiva (Separar "hechos" de "interpretaciones")`,
              cuerpo: [
                { tipo: "parrafo", texto: `Cuando sientas presión, escribe en una hoja:` },
                { tipo: "lista", puntos: [`Hecho objetivo: "Tengo 3 entregas para esta semana".`, `Interpretación catastrófica: "No voy a llegar, es imposible".`, `Alternativa realista: "Tengo 3 entregas. Puedo priorizar, dividir y pedir ayuda si es necesario".`] },
                { tipo: "parrafo", texto: `Este ejercicio te entrena para no confundir la realidad con tus miedos.` },
              ],
            },
          ],
        },
        {
          day: 2,
          activities: [
            {
              title: `Ejercicio de "Diálogo interno compasivo"`,
              cuerpo: [
                { tipo: "parrafo", texto: `Cuando aparezca la autocrítica dura ("No doy abasto, soy un desastre"), respóndete como le responderías a un buen amigo en la misma situación: "Estás bajo mucha presión, es normal sentirse así. Vamos paso a paso".` },
              ],
            },
            {
              title: `Ejercicio de "Escalera de regulación"`,
              cuerpo: [
                { tipo: "parrafo", texto: `Crea tu propia escalera de 3 pasos para momentos de sobrecarga:` },
                { tipo: "lista", puntos: [`Pausa: Dejo lo que estoy haciendo y respiro (4-7-8).`, `Re-evalúo: ¿Qué es lo más urgente ahora mismo?`, `Actúo: Elijo UNA sola tarea y la hago durante 10 minutos.`, `Escribe esta escalera en un post-it y pégalo en tu monitor o cuaderno.`] },
              ],
            },
          ],
        },
      ],
      feedbackQuestions: [
        { question: `¿Crees que la técnica de respiración 4-7-8 te ayuda a bajar la ansiedad en momentos de presión?`, key: "item5Q1" },
        { question: `¿Notaste que escribir tus pensamientos catastróficos y reformularlos te da una perspectiva más clara de la realidad?`, key: "item5Q2" },
        { question: `¿Piensas que ahora eres más consciente de que las emociones intensas son pasajeras y que tienes herramientas para gestionarlas?`, key: "item5Q3" },
      ],
    },
    {
      id: "recItem6",
      relatedQuestion: 6,
      title: `Organizo o escojo lugares apropiados para estudiar en los que no tenga distractores.`,
      days: [
        {
          day: 1,
          activities: [
            {
              title: `Ejercicio de auditoría del lugar de estudio (Análisis funcional)`,
              cuerpo: [
                { tipo: "parrafo", texto: `Siéntate en tu lugar de estudio habitual y durante 5 minutos escribe una lista de todos los distractores que identificas (ej. celular, televisor, ruido de la calle, gente pasando, cama cerca). Clasifícalos en: a) Eliminables (poner el celular en otra habitación, cerrar puerta) y b) Gestionables (usar auriculares con ruido blanco, avisar a tu familia que estás estudiando).` },
              ],
            },
            {
              title: `Ejercicio de reestructuración cognitiva (Desactivar la excusa)`,
              cuerpo: [
                { tipo: "parrafo", texto: `Si piensas "Puedo concentrarme aunque tenga distracciones", recuerda un momento en que fallaste. Sustitúyelo por: "El mejor luchador no pelea contra el ring; elige un ring donde pueda ganar". Repite 5 veces.` },
              ],
            },
          ],
        },
        {
          day: 2,
          activities: [
            {
              title: `Ejercicio de "Configuración previa" (Preparación del campo de batalla)`,
              cuerpo: [
                { tipo: "parrafo", texto: `Antes de empezar a estudiar, dedica 3 minutos a preparar tu escritorio: solo deja los materiales de la tarea actual, un vaso de agua y tus útiles. Todo lo demás, fuera de la vista. El simple hecho de "preparar el espacio" ya es una señal para tu cerebro de que empezará el modo trabajo.` },
              ],
            },
            {
              title: `Ejercicio de "Lugar exclusivo"`,
              cuerpo: [
                { tipo: "parrafo", texto: `Si es posible, designa un solo lugar para estudiar (que no sea tu cama ni el comedor donde comes). Usar el mismo lugar de forma consistente crea una asociación estímulo-respuesta: tu cerebro automáticamente se pone en "modo estudio" al sentarte ahí.` },
              ],
            },
          ],
        },
      ],
      feedbackQuestions: [
        { question: `¿Crees que identificar y eliminar tus distractores principales mejora tu capacidad de concentración?`, key: "item6Q1" },
        { question: `¿Notaste que preparar tu escritorio antes de empezar te ayuda a entrar en "modo estudio" más rápido?`, key: "item6Q2" },
        { question: `¿Piensas que ahora eres más consciente de que el entorno tiene más poder sobre tu concentración que tu fuerza de voluntad?`, key: "item6Q3" },
      ],
    },
    {
      id: "recItem7",
      relatedQuestion: 7,
      title: `Planifico el tiempo para estudiar con un cronograma que incluye intervalos para reactivarme (pausas activas).`,
      days: [
        {
          day: 1,
          activities: [
            {
              title: `Ejercicio de "Bloques de 45 minutos" (Técnica de ritmo ultradiano)`,
              cuerpo: [
                { tipo: "parrafo", texto: `El cerebro humano mantiene la atención profunda alrededor de 45 minutos. Diseña tu cronograma con bloques de 45 min de estudio y 15 min de descanso activo. Durante el descanso activo, levántate, camina, estira los brazos, o mira por la ventana (nada de pantallas, porque sobrecargan el mismo sistema atencional).` },
              ],
            },
            {
              title: `Ejercicio de implementación de intenciones (Formato "Si-Entonces")`,
              cuerpo: [
                { tipo: "lista", puntos: [`Escribe: "SI son las [hora de inicio], ENTONCES abro mi libro y empiezo el bloque 1".`, `"SI suena la alarma de los 45 min, ENTONCES me levanto y hago mi pausa activa".`] },
                { tipo: "parrafo", texto: `Esta técnica convierte la planificación en una orden automática y reduce la indecisión.` },
              ],
            },
          ],
        },
        {
          day: 2,
          activities: [
            {
              title: `Ejercicio de "Auto-registro de fatiga"`,
              cuerpo: [
                { tipo: "parrafo", texto: `Antes de cada bloque, regístralo en una escala del 1 al 10. Si tu nivel de fatiga supera el 7, acorta el bloque a 25 minutos y alarga el descanso. Escuchar a tu cuerpo es parte de la autorregulación.` },
              ],
            },
            {
              title: `Ejercicio de "Cronograma visual" (Panel de control)`,
              cuerpo: [
                { tipo: "parrafo", texto: `Dibuja un horario semanal en una hoja grande y pinta los bloques de estudio de un color y los descansos de otro. Coloca este panel frente a tu escritorio. Verlo físicamente te da una sensación de control y orden.` },
              ],
            },
          ],
        },
      ],
      feedbackQuestions: [
        { question: `¿Crees que los bloques de 45 minutos con pausas activas te permiten rendir mejor que estudiar largas horas sin parar?`, key: "item7Q1" },
        { question: `¿Notaste que usar un cronograma visual (pintado) te ayuda a respetar mejor tus descansos?`, key: "item7Q2" },
        { question: `¿Piensas que ahora eres más consciente de que planificar pausas no es "perder tiempo", sino "cuidar el motor" de tu cerebro?`, key: "item7Q3" },
      ],
    },
    {
      id: "recItem8",
      relatedQuestion: 8,
      title: `Utilizo estrategias que me permitan aprendizajes duraderos.`,
      days: [
        {
          day: 1,
          activities: [
            {
              title: `Ejercicio de "Técnica Feynman" (Explicación simplificada)`,
              cuerpo: [
                { tipo: "parrafo", texto: `Elige un concepto difícil de tu asignatura actual. Toma una hoja en blanco y escribe una explicación como si se la estuvieras dando a un niño de 10 años. Usa ejemplos cotidianos y analogías. Si te quedas atascado, ahí está exactamente el punto que no has comprendido bien. Ese es tu "hueco de aprendizaje" a resolver.` },
              ],
            },
            {
              title: `Ejercicio de reestructuración cognitiva (Estudiar vs. Aprender)`,
              cuerpo: [
                { tipo: "parrafo", texto: `Cambia la creencia "Mi meta es leer el capítulo" por "Mi meta es poder explicar este capítulo sin mirar el libro". Repite: "No subrayo para recordar, explico para entender".` },
              ],
            },
          ],
        },
        {
          day: 2,
          activities: [
            {
              title: `Ejercicio de "Recuperación activa" (Prueba sin apuntes)`,
              cuerpo: [
                { tipo: "parrafo", texto: `Hoy, en lugar de repasar el tema, cierra tu libro y escribe todo lo que recuerdes sobre el concepto en un mapa mental o lista. Luego, abre el libro y compara lo que escribiste con lo que dice realmente. Lo que olvidaste es exactamente lo que necesitas reforzar.` },
              ],
            },
            {
              title: `Ejercicio de "Espaciado"`,
              cuerpo: [
                { tipo: "parrafo", texto: `Programa un recordatorio para dentro de 3 días para hacer otra recuperación activa del mismo tema. Este espaciado (repasar justo cuando estás a punto de olvidar) es lo que fija el aprendizaje de forma casi definitiva.` },
              ],
            },
          ],
        },
      ],
      feedbackQuestions: [
        { question: `¿Crees que explicar un concepto con tus propias palabras (Técnica Feynman) te ayuda a darte cuenta de lo que realmente entiendes y lo que no?`, key: "item8Q1" },
        { question: `¿Notaste que cerrar el libro y escribir lo que recuerdas es más efectivo que solo leerlo?`, key: "item8Q2" },
        { question: `¿Piensas que ahora eres más consciente de que el aprendizaje duradero requiere esfuerzo activo (recordar, explicar) y no solo lectura pasiva?`, key: "item8Q3" },
      ],
    },
    {
      id: "recItem10",
      relatedQuestion: 10,
      title: `Me preparo para exponer con mucha anticipación.`,
      days: [
        {
          day: 1,
          activities: [
            {
              title: `Ejercicio de "Desglose de la exposición")`,
              cuerpo: [
                { tipo: "parrafo", texto: `Dividir la exposición en pasos específicos:` },
                { tipo: "lista", puntos: [`Crear el guión/esquema.`, `Hacer las diapositivas.`, `Practicar en voz alta solo (sin público).`, `Practicar frente a un espejo o grabándose.`, `Practicar con un amigo (público controlado).`, `Asigna una fecha límite pequeña para cada paso, empezando por el primero hoy mismo.`] },
              ],
            },
            {
              title: `Ejercicio de reestructuración cognitiva`,
              cuerpo: [
                { tipo: "parrafo", texto: `Escribe tu miedo más grande sobre exponer (ej. "Se me va a olvidar todo" o "Se van a reír de mí"). Al lado, escribe la evidencia en tu contra: "He visto a otros equivocarse y nadie se rió", "Si llevo un esquema pequeño, no me puede faltar nada". Reemplaza el miedo por: "Estar preparado es la mejor vacuna contra el nerviosismo".` },
              ],
            },
          ],
        },
        {
          day: 2,
          activities: [
            {
              title: `Ejercicio de "Grabación y autocrítica constructiva"`,
              cuerpo: [
                { tipo: "parrafo", texto: `Grábate haciendo tu exposición (puede ser solo frente al celular). Mírate y responde:` },
                { tipo: "lista", puntos: [`¿Mi tono es seguro?`, `¿El ritmo es adecuado? (ni muy rápido ni muy lento)`, `¿Qué parte es la que mejor explico? ¿Cuál debo reforzar?`] },
                { tipo: "parrafo", texto: `Este ejercicio te da un feedback realista y te quita el miedo a lo "desconocido" de cómo te ves.` },
              ],
            },
            {
              title: `Ejercicio de "Ensayo en condiciones reales"`,
              cuerpo: [
                { tipo: "parrafo", texto: `Antes de la exposición oficial, busca un momento para exponerle a un compañero, familiar o incluso a tu mascota (en voz alta). El simple hecho de escuchar tu propia voz diciendo el contenido en voz alta crea un "camino neuronal" que se activará el día de la exposición real.` },
              ],
            },
          ],
        },
      ],
      feedbackQuestions: [
        { question: `¿Crees que dividir la preparación de una exposición en pasos pequeños te da más control y reduce la ansiedad?`, key: "item10Q1" },
        { question: `¿Notaste que practicar en voz alta (aunque sea solo) te hace sentir más seguro que solo leer mentalmente?`, key: "item10Q2" },
        { question: `¿Piensas que ahora eres más consciente de que el nerviosismo baja cuando la preparación sube?`, key: "item10Q3" },
      ],
    },
  ],
  activadorFisiologico: [
    {
      id: "recItem14",
      relatedQuestion: 14,
      title: `Cuando estudio o hago mis tareas, realizo ejercicios físicos o bailes en pequeños intervalos para mantenerme activo.`,
      days: [
        {
          day: 1,
          activities: [
            {
              title: `Ejercicio reestructurativo`,
              cuerpo: [
                { tipo: "parrafo", texto: `Si sueles pensar "Hacer pausas me hace perder el tiempo" o "Si me detengo se me va la concentración", sustituye esa creencia por una más funcional. Cierra los ojos y repite en tu interior 5 veces con intervalos de 5 segundos y con fuerte convicción: "Mover mi cuerpo oxigena mi cerebro; una pausa de 3 minutos multiplica mi concentración al estudiar".` },
              ],
            },
            {
              title: `Ejercicio de auto instrucciones (Técnica Pomodoro Activa)`,
              cuerpo: [
                { tipo: "parrafo", texto: `Toma un lapicero y escribe en una hoja:` },
                { tipo: "lista", puntos: [`Primero, coloco una alarma cada 45 minutos de estudio.`, `Segundo, al sonar, me pongo de pie de inmediato sin dudar.`, `Tercero, estiro mis brazos, cuello y hago 1 o 2 minutos de baile o movimiento antes de retomar.`] },
                { tipo: "parrafo", texto: `Lee lo que has escrito 5 veces y repítelo 5 veces sin leerlo. Pega la hoja visible en tu mesa de estudio.` },
              ],
            },
            {
              title: `Activación conductual (Ensayo guiado)`,
              cuerpo: [
                { tipo: "parrafo", texto: `Pon una canción que te motive y realiza una secuencia corta: estiramiento de columna, movimiento circular de hombros y 1 minuto de baile o marcha en el sitio. Registra en una escala del 1 al 10 tu nivel de energía y ánimo antes y después de moverte.` },
              ],
            },
          ],
        },
        {
          day: 2,
          activities: [
            {
              title: `Ejercicio reestructurativo`,
              cuerpo: [
                { tipo: "parrafo", texto: `Si sueles pensar "Hacer pausas me hace perder el tiempo" o "Si me detengo se me va la concentración", sustituye esa creencia por una más funcional. Cierra los ojos y repite en tu interior 5 veces con intervalos de 5 segundos y con fuerte convicción: "Mover mi cuerpo oxigena mi cerebro; una pausa de 3 minutos multiplica mi concentración al estudiar".` },
              ],
            },
            {
              title: `Ejercicio de auto instrucciones (Técnica Pomodoro Activa)`,
              cuerpo: [
                { tipo: "parrafo", texto: `Toma un lapicero y escribe en una hoja:` },
                { tipo: "lista", puntos: [`Primero, coloco una alarma cada 45 minutos de estudio.`, `Segundo, al sonar, me pongo de pie de inmediato sin dudar.`, `Tercero, estiro mis brazos, cuello y hago 1 o 2 minutos de baile o movimiento antes de retomar.`] },
                { tipo: "parrafo", texto: `Lee lo que has escrito 5 veces y repítelo 5 veces sin leerlo. Pega la hoja visible en tu mesa de estudio.` },
              ],
            },
            {
              title: `Activación conductual (Ensayo guiado)`,
              cuerpo: [
                { tipo: "parrafo", texto: `Pon una canción que te motive y realiza una secuencia corta: estiramiento de columna, movimiento circular de hombros y 1 minuto de baile o marcha en el sitio. Registra en una escala del 1 al 10 tu nivel de energía antes y después de moverte.` },
              ],
            },
          ],
        },
      ],
      feedbackQuestions: [
        { question: `¿Crees que realizar pausas con movimiento físico mejora tu rendimiento al estudiar?`, key: "item14Q1" },
        { question: `¿Notaste que ha mejorado tu disposición para levantarte y estirarte mientras haces tareas?`, key: "item14Q2" },
        { question: `¿Piensas que ahora eres más consciente de que el cansancio físico y mental disminuye tras una pausa activa?`, key: "item14Q3" },
      ],
    },
    {
      id: "recItem15",
      relatedQuestion: 15,
      title: `Consumo mis alimentos todos los días a las mismas horas.`,
      days: [
        {
          day: 1,
          activities: [
            {
              title: `Ejercicio reestructurativo`,
              cuerpo: [
                { tipo: "parrafo", texto: `Si te dices a ti mismo "Termino esta tarea y luego como, no pasa nada si me retraso", reflexiona sobre cómo saltarte comidas nubla tu atención. Repite en tu interior 5 veces con convicción y dejando 5 segundos de intervalo: "Mi cuerpo y cerebro necesitan combustible regular; respetar mis horas de comida protege mi rendimiento y mi salud".` },
              ],
            },
            {
              title: `Ejercicio de control de estímulos y planificación`,
              cuerpo: [
                { tipo: "parrafo", texto: `En una hoja o en el bloc de notas de tu celular, define tus 3 horarios fijos (desayuno, almuerzo y cena) adaptados a tu ciclo. Programa 3 alarmas en tu celular con una etiqueta motivadora (por ejemplo: "Alimentando mi mente para aprender mejor").` },
              ],
            },
            {
              title: `Ejercicio de auto instrucciones`,
              cuerpo: [
                { tipo: "parrafo", texto: `Antes del almuerzo o cena, repite mentalmente 3 veces: "Es hora de comer. Apago o aparto la pantalla de estudio, me siento a comer con calma y luego regreso con mayor energía a mis pendientes".` },
              ],
            },
          ],
        },
        {
          day: 2,
          activities: [
            {
              title: `Ejercicio reestructurativo`,
              cuerpo: [
                { tipo: "parrafo", texto: `Si te dices a ti mismo "Termino esta tarea y luego como, no pasa nada si me retraso", reflexiona sobre cómo saltarte comidas nubla tu atención. Repite en tu interior 5 veces con convicción y dejando 5 segundos de intervalo: "Mi cuerpo y cerebro necesitan combustible regular; respetar mis horas de comida protege mi rendimiento y mi salud".` },
              ],
            },
            {
              title: `Ejercicio de control de estímulos y planificación`,
              cuerpo: [
                { tipo: "parrafo", texto: `En una hoja o en el bloc de notas de tu celular, define tus 3 horarios fijos (desayuno, almuerzo y cena) adaptados a tu ciclo. Programa 3 alarmas en tu celular con una etiqueta motivadora (por ejemplo: "Alimentando mi mente para aprender mejor").` },
              ],
            },
            {
              title: `Ejercicio de auto instrucciones`,
              cuerpo: [
                { tipo: "parrafo", texto: `Antes del almuerzo o cena, repite mentalmente 3 veces: "Es hora de comer. Apago o aparto la pantalla de estudio, me siento a comer con calma y luego regreso con mayor energía a mis pendientes".` },
              ],
            },
          ],
        },
      ],
      feedbackQuestions: [
        { question: `¿Crees que mantener un horario fijo para alimentarte impacta directamente en tu rendimiento académico?`, key: "item15Q1" },
        { question: `¿Notaste que ha mejorado tu compromiso con respetar la hora de tus alimentos sin posponerla por los deberes?`, key: "item15Q2" },
        { question: `¿Piensas que ahora eres más consciente de la importancia de nutrir tu cuerpo a horas regulares para evitar la fatiga?`, key: "item15Q3" },
      ],
    },
    {
      id: "recItem16",
      relatedQuestion: 16,
      title: `Practico algún deporte por lo menos dos veces a la semana.`,
      days: [
        {
          day: 1,
          activities: [
            {
              title: `Ejercicio para enfocar el valor de la actividad física`,
              cuerpo: [
                { tipo: "parrafo", texto: `Reflexiona sobre la acumulación de tensión que genera la vida universitaria. Cierra los ojos y repite en tu interior 10 veces (dejando intervalos de 5 segundos): "El deporte no es un premio para cuando termine todo, es la herramienta con la que libero el estrés y recargo mi motivación".` },
              ],
            },
            {
              title: `Reestructuración contra la procrastinación`,
              cuerpo: [
                { tipo: "parrafo", texto: `Si aparece el pensamiento "Estoy muy cansado o no tengo tiempo para hacer deporte", cámbialo repitiendo 5 veces de forma firme: "Hacer 30 minutos de ejercicio me da más energía de la que me quita; moverme renueva mi mente". Escribe esta frase en un papel y colócala cerca de tu ropa deportiva.` },
              ],
            },
            {
              title: `Contrato conductual y asignación de tiempos`,
              cuerpo: [
                { tipo: "parrafo", texto: `Elige el deporte o ejercicio que más disfrutes (correr, fútbol, natación, rutina en casa, etc.). En tu horario semanal, fija exactamente 2 días y horas concretas en las que lo realizarás, tratándolas como si fueran una clase obligatoria de tu carrera.` },
              ],
            },
          ],
        },
        {
          day: 2,
          activities: [
            {
              title: `Ejercicio para enfocar el valor de la actividad física`,
              cuerpo: [
                { tipo: "parrafo", texto: `Reflexiona sobre la acumulación de tensión que genera la vida universitaria. Cierra los ojos y repite en tu interior 10 veces (dejando intervalos de 5 segundos): "El deporte no es un premio para cuando termine todo, es la herramienta con la que libero el estrés y recargo mi motivación".` },
              ],
            },
            {
              title: `Reestructuración contra la procrastinación`,
              cuerpo: [
                { tipo: "parrafo", texto: `Si aparece el pensamiento "Estoy muy cansado o no tengo tiempo para hacer deporte", cámbialo repitiendo 5 veces de forma firme: "Hacer 30 minutos de ejercicio me da más energía de la que me quita; moverme renueva mi mente". Escribe esta frase en un papel y colócala cerca de tu ropa deportiva.` },
              ],
            },
            {
              title: `Contrato conductual y asignación de tiempos`,
              cuerpo: [
                { tipo: "parrafo", texto: `Elige el deporte o ejercicio que más disfrutes (correr, fútbol, natación, rutina en casa, etc.). En tu horario semanal, fija exactamente 2 días y horas concretas en las que lo realizarás, tratándolas como si fueran una clase obligatoria de tu carrera.` },
              ],
            },
          ],
        },
      ],
      feedbackQuestions: [
        { question: `¿Crees que practicar un deporte o ejercicio al menos dos veces a la semana ayuda a reducir tu tensión académica?`, key: "item16Q1" },
        { question: `¿Notaste que ha mejorado tu motivación para programar y defender un espacio para hacer deporte en tu semana?`, key: "item16Q2" },
        { question: `¿Piensas que ahora eres más consciente de los beneficios del deporte para tu claridad mental y estado de ánimo?`, key: "item16Q3" },
      ],
    },
    {
      id: "recItem20",
      relatedQuestion: 20,
      title: `Para poder estar atento en clases, duermo entre 6 a 9 horas diarias.`,
      days: [
        {
          day: 1,
          activities: [
            {
              title: `Ejercicio reestructurativo de higiene del sueño`,
              cuerpo: [
                { tipo: "parrafo", texto: `Desafía la creencia errónea de "Amanecerme estudiando es señal de compromiso". Cierra los ojos antes de acostarte y repite en tu interior 10 veces (dejando intervalos de 5 segundos): "Dormir bien fija lo que aprendo en mi memoria; dormir entre 6 y 9 horas diarias me garantiza lucidez y rapidez mental en mis clases".` },
              ],
            },
            {
              title: `Protocolo de control de estímulos (Desconexión cognitiva)`,
              cuerpo: [
                { tipo: "parrafo", texto: `40 minutos antes de tu hora meta de dormir, apaga o deja en modo silencioso el celular fuera del alcance de tu mano. Toma una hoja y anota rápidamente los pendientes del día siguiente bajo el título: "Esto ya está registrado y lo atenderé mañana despierto". Con esto liberas la memoria de trabajo de tu cerebro.` },
              ],
            },
            {
              title: `Ejercicio de relajación fisiológica (Respiración diafragmática 4-7-8)`,
              cuerpo: [
                { tipo: "parrafo", texto: `Acostado boca arriba, inhala por la nariz en 4 segundos inflando el abdomen, mantén el aire 7 segundos y exhala suavemente por la boca en 8 segundos. Repite este ciclo 5 veces diciéndote mentalmente al exhalar: "Mi cuerpo descansa, mi mente se recupera".` },
              ],
            },
          ],
        },
        {
          day: 2,
          activities: [
            {
              title: `Ejercicio reestructurativo de higiene del sueño`,
              cuerpo: [
                { tipo: "parrafo", texto: `Desafía la creencia errónea de "Amanecerme estudiando es señal de compromiso". Cierra los ojos antes de acostarte y repite en tu interior 10 veces (dejando intervalos de 5 segundos): "Dormir bien fija lo que aprendo en mi memoria; dormir entre 6 y 9 horas diarias me garantiza lucidez y rapidez mental en mis clases".` },
              ],
            },
            {
              title: `Protocolo de control de estímulos (Desconexión cognitiva)`,
              cuerpo: [
                { tipo: "parrafo", texto: `40 minutos antes de tu hora meta de dormir, apaga o deja en modo silencioso el celular fuera del alcance de tu mano. Toma una hoja y anota rápidamente los pendientes del día siguiente bajo el título: "Esto ya está registrado y lo atenderé mañana despierto". Con esto liberas la memoria de trabajo de tu cerebro.` },
              ],
            },
            {
              title: `Ejercicio de relajación fisiológica (Respiración diafragmática 4-7-8)`,
              cuerpo: [
                { tipo: "parrafo", texto: `Acostado boca arriba, inhala por la nariz en 4 segundos inflando el abdomen, mantén el aire 7 segundos y exhala suavemente por la boca en 8 segundos. Repite este ciclo 5 veces diciéndote mentalmente al exhalar: "Mi cuerpo descansa, mi mente se recupera".` },
              ],
            },
          ],
        },
      ],
      feedbackQuestions: [
        { question: `¿Crees que dormir un promedio de 6 a 9 horas diarias es determinante para mantener la atención en clases?`, key: "item20Q1" },
        { question: `¿Notaste que ha mejorado tu disposición para preparar un entorno libre de pantallas antes de ir a dormir?`, key: "item20Q2" },
        { question: `¿Piensas que ahora eres más consciente de que el descanso nocturno es un pilar indispensable de tu rendimiento académico?`, key: "item20Q3" },
      ],
    },
  ],
}
