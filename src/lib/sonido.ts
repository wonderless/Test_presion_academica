// src/lib/sonido.ts
// Sonidos de la pantalla de resultados. Hay tres familias:
//
//   · La campanita de una actividad suelta, generada en el navegador con la
//     Web Audio API. Es el logro más pequeño y el más repetido: un sonido
//     corto y discreto que no canse a la trigésima vez.
//   · Efectos grabados, en public/sonidos/, para los momentos que el
//     documento "Nuevos cambios" pide distinguir: la alerta de un modo bajo,
//     la ovación al culminar un día, la campana de la retroalimentación y la
//     fanfarria de la medalla. Son de Pixabay (licencia libre, sin atribución
//     obligatoria); la alerta y la ovación están recortadas a unos segundos,
//     porque los originales duran 23 y 30.
//   · La música de fondo que acompaña la lectura de los resultados, en bucle y
//     con su propio botón para pararla.
//
// Casi todo suena después de pulsar un botón, así que el navegador lo permite.
// Lo que suena al abrir la pantalla —la alerta, la medalla, la música— solo lo
// consigue si se llega desde el test: al recargar /results el navegador lo
// bloquea, y se falla en silencio (la música deja su botón en "reproducir").

export type EfectoDeSonido =
  | "alerta"
  | "dia"
  | "retroalimentacion"
  | "subidaDeNivel"
  | "medalla"

const ARCHIVOS: Record<EfectoDeSonido, string> = {
  alerta: "/sonidos/alerta.mp3",
  dia: "/sonidos/ovacion.mp3",
  retroalimentacion: "/sonidos/campana-de-victoria.mp3",
  subidaDeNivel: "/sonidos/subida-de-nivel.mp3",
  medalla: "/sonidos/fanfarria-medalla.mp3",
}

const VOLUMEN_EFECTOS = 0.7
// El archivo de la música ya viene bajado unos 10 dB respecto del original.
// Hace falta: Safari en iPhone ignora el `volume` de los elementos de audio, y
// ahí la música suena siempre a volumen completo, encima de los efectos. En el
// resto de navegadores estos dos valores la ajustan un poco más.
const VOLUMEN_MUSICA = 0.8
// Mientras suena un efecto la música baja a este volumen, para que el efecto
// se oiga sin tener que pararla (en iPhone no baja, por lo mismo).
const VOLUMEN_MUSICA_ATENUADA = 0.25

// ---------------------------------------------------------------------------
// Campanita sintetizada
// ---------------------------------------------------------------------------

// Do5, mi5, sol5 y do6, en Hz.
const ARPEGIO = [523.25, 659.25, 783.99, 1046.5]

// Timbre de campana: la fundamental y dos armónicos más suaves.
const PARCIALES: Array<[number, number]> = [
  [1, 1],
  [2.01, 0.35],
  [3.98, 0.12],
]

let contexto: AudioContext | null = null

const obtenerContexto = (): AudioContext | null => {
  if (typeof window === "undefined") return null
  if (!contexto) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext
    if (!Ctor) return null
    contexto = new Ctor()
  }
  if (contexto.state === "suspended") void contexto.resume()
  return contexto
}

const campana = (
  ctx: AudioContext,
  salida: AudioNode,
  frecuencia: number,
  inicio: number,
  duracion: number
) => {
  PARCIALES.forEach(([multiplo, relativa]) => {
    const oscilador = ctx.createOscillator()
    const envolvente = ctx.createGain()
    oscilador.type = "sine"
    oscilador.frequency.setValueAtTime(frecuencia * multiplo, inicio)
    envolvente.gain.setValueAtTime(0.0001, inicio)
    envolvente.gain.exponentialRampToValueAtTime(0.28 * relativa, inicio + 0.008)
    envolvente.gain.exponentialRampToValueAtTime(
      0.0001,
      inicio + duracion / Math.sqrt(multiplo)
    )
    oscilador.connect(envolvente).connect(salida)
    oscilador.start(inicio)
    oscilador.stop(inicio + duracion + 0.05)
  })
}

// Las cuatro notas, rápidas y sin nada que quede sonando.
export const sonarCampanita = () => {
  try {
    const ctx = obtenerContexto()
    if (!ctx) return
    const salida = ctx.createGain()
    salida.gain.value = 0.6
    salida.connect(ctx.destination)
    const t = ctx.currentTime + 0.02
    ARPEGIO.forEach((f, i) => campana(ctx, salida, f, t + i * 0.07, 0.5))
  } catch (error) {
    // Un sonido que falla no debe afectar al progreso, que ya se guardó.
    console.error("Error al reproducir el sonido:", error)
  }
}

// ---------------------------------------------------------------------------
// Efectos grabados
// ---------------------------------------------------------------------------

// Efecto en curso. Suena uno cada vez: el nuevo corta al anterior, para que
// la ovación de un día no se pise con la campana de la retroalimentación que
// se abre justo después.
let efectoEnCurso: HTMLAudioElement | null = null
let musica: HTMLAudioElement | null = null

const restaurarMusica = () => {
  if (musica) musica.volume = VOLUMEN_MUSICA
}

// Reproduce un efecto. Resuelve true cuando termina de sonar entero, y false
// en cuanto el navegador no lo deja sonar o lo corta otro efecto. Nunca
// rechaza.
export const reproducirEfecto = (efecto: EfectoDeSonido): Promise<boolean> => {
  if (typeof window === "undefined") return Promise.resolve(false)

  if (efectoEnCurso) {
    efectoEnCurso.pause()
    efectoEnCurso.dispatchEvent(new Event("cortado"))
  }

  const audio = new Audio(ARCHIVOS[efecto])
  audio.volume = VOLUMEN_EFECTOS
  efectoEnCurso = audio
  if (musica) musica.volume = VOLUMEN_MUSICA_ATENUADA

  return new Promise((resolve) => {
    let resuelto = false
    const terminar = (entero: boolean) => {
      if (resuelto) return
      resuelto = true
      if (efectoEnCurso === audio) {
        efectoEnCurso = null
        restaurarMusica()
      }
      resolve(entero)
    }
    audio.addEventListener("ended", () => terminar(true), { once: true })
    audio.addEventListener("cortado", () => terminar(false), { once: true })
    audio.addEventListener("error", () => terminar(false), { once: true })
    audio.play().catch(() => terminar(false))
  })
}

// La medalla: la subida de nivel y, al acabar, la fanfarria. Si algo corta la
// subida de nivel, la fanfarria ya no suena: si no, llegaría tarde y cortaría
// a su vez lo que la interrumpió. Lo mismo pasa en desarrollo, donde React
// carga los resultados dos veces y la segunda medalla corta a la primera.
export const reproducirMedalla = async () => {
  if (await reproducirEfecto("subidaDeNivel")) {
    await reproducirEfecto("medalla")
  }
}

// ---------------------------------------------------------------------------
// Sonido de entrada
// ---------------------------------------------------------------------------

// Lo que suena al abrir los resultados: la alarma de un modo bajo o la
// medalla. La música que arranca sola espera a que termine, para no sonar
// encima de ella.
let sonidoDeEntrada: Promise<unknown> = Promise.resolve()

export const sonarAlEntrar = (sonido: Promise<unknown>) => {
  sonidoDeEntrada = sonido
}

// Espera al sonido de entrada. Si mientras tanto se registra otro —en
// desarrollo React carga los resultados dos veces, y la segunda alarma corta a
// la primera—, espera también a ese.
const esperarSonidoDeEntrada = async () => {
  let esperado: Promise<unknown>
  do {
    esperado = sonidoDeEntrada
    await esperado
  } while (esperado !== sonidoDeEntrada)
}

// ---------------------------------------------------------------------------
// Música de fondo
// ---------------------------------------------------------------------------

const obtenerMusica = (): HTMLAudioElement => {
  if (!musica) {
    musica = new Audio()
    // Sin precarga: el elemento se crea al abrir la pantalla aunque la
    // persona tenga la música apagada, y no hay por qué gastarle datos del
    // celular en un archivo que no va a sonar. Se descarga al darle a play.
    musica.preload = "none"
    musica.src = "/sonidos/musica-resultados.mp3"
    musica.loop = true
  }
  return musica
}

// Avisa cada vez que la música empieza o se para, venga de donde venga: el
// botón de la pantalla, los controles multimedia del celular, unos auriculares
// que se desconectan o una llamada entrante. Así el botón nunca dice "Pausar"
// con la música parada. Devuelve la función para dejar de escuchar.
export const escucharMusica = (
  alCambiar: (sonando: boolean) => void
): (() => void) => {
  if (typeof window === "undefined") return () => {}
  const audio = obtenerMusica()
  const alSonar = () => alCambiar(true)
  const alParar = () => alCambiar(false)
  audio.addEventListener("playing", alSonar)
  audio.addEventListener("pause", alParar)
  return () => {
    audio.removeEventListener("playing", alSonar)
    audio.removeEventListener("pause", alParar)
  }
}

// Resuelve true si empezó a sonar y false si el navegador la bloqueó.
//
// Al arrancar sola, al abrir la pantalla, espera al sonido de entrada
// (`trasElSonidoDeEntrada`), y `cancelada` le deja saber si mientras esperaba
// la persona salió de la pantalla o ya decidió con el botón: entonces no
// arranca. Al pulsar el botón suena en el acto.
export const iniciarMusica = async (
  opciones: {
    trasElSonidoDeEntrada?: boolean
    cancelada?: () => boolean
  } = {}
): Promise<boolean> => {
  if (typeof window === "undefined") return false
  if (opciones.trasElSonidoDeEntrada) await esperarSonidoDeEntrada()
  if (opciones.cancelada?.()) return false
  const musica = obtenerMusica()
  musica.volume = efectoEnCurso ? VOLUMEN_MUSICA_ATENUADA : VOLUMEN_MUSICA
  try {
    await musica.play()
    return true
  } catch {
    return false
  }
}

export const pausarMusica = () => {
  musica?.pause()
}
