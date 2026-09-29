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
//   · La música de cierre: unos segundos de fondo mientras se lee el mensaje
//     final, al terminar todas las actividades. No suena en ningún otro
//     momento.
//
// Casi todo suena después de pulsar un botón, así que el navegador lo permite.
// Lo que suena al abrir la pantalla —la alerta y la medalla— solo lo consigue
// si se llega desde el test: al recargar /results el navegador lo bloquea, y
// se falla en silencio.

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
// ahí la música suena siempre a volumen completo.
const VOLUMEN_MUSICA = 0.8

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
// Cuándo acaba el último efecto que se pidió, para que la música de cierre
// empiece después y no encima.
let finDelEfecto: Promise<unknown> = Promise.resolve()

// Reproduce un efecto. Resuelve true cuando termina de sonar entero, y false
// en cuanto el navegador no lo deja sonar o lo corta otro efecto. Nunca
// rechaza.
export const reproducirEfecto = (efecto: EfectoDeSonido): Promise<boolean> => {
  if (typeof window === "undefined") return Promise.resolve(false)

  if (efectoEnCurso) {
    efectoEnCurso.pause()
    efectoEnCurso.dispatchEvent(new Event("cortado"))
  }

  // Un efecto nuevo tiene prioridad sobre la música de cierre.
  pararMusicaDeCierre()

  const audio = new Audio(ARCHIVOS[efecto])
  audio.volume = VOLUMEN_EFECTOS
  efectoEnCurso = audio

  const fin = new Promise<boolean>((resolve) => {
    let resuelto = false
    const terminar = (entero: boolean) => {
      if (resuelto) return
      resuelto = true
      if (efectoEnCurso === audio) efectoEnCurso = null
      resolve(entero)
    }
    audio.addEventListener("ended", () => terminar(true), { once: true })
    audio.addEventListener("cortado", () => terminar(false), { once: true })
    audio.addEventListener("error", () => terminar(false), { once: true })
    audio.play().catch(() => terminar(false))
  })
  finDelEfecto = fin
  return fin
}

// La medalla: la subida de nivel y, al acabar, la fanfarria. Si además algún
// modo salió bajo (`conModoBajo`), tras la subida de nivel no va la fanfarria
// sino la alarma: el aviso de que hay actividades pendientes no debe esperar
// los 15 segundos de fanfarria.
//
// Si algo corta la subida de nivel, lo que va detrás ya no suena: si no,
// llegaría tarde y cortaría a su vez lo que la interrumpió. Lo mismo pasa en
// desarrollo, donde React carga los resultados dos veces y la segunda medalla
// corta a la primera.
export const reproducirMedalla = async (conModoBajo = false) => {
  if (await reproducirEfecto("subidaDeNivel")) {
    await reproducirEfecto(conModoBajo ? "alerta" : "medalla")
  }
}

// ---------------------------------------------------------------------------
// Música de cierre
// ---------------------------------------------------------------------------

// Suena solo al terminar todas las actividades, de fondo mientras se lee el
// mensaje final: unos segundos y se apaga sola, bajando el volumen al final
// para no cortar en seco (en iPhone, que ignora el volumen, sí corta).
const DURACION_MUSICA_DE_CIERRE_MS = 15000
const FUNDIDO_MS = 1500
const PASOS_DEL_FUNDIDO = 15

let musica: HTMLAudioElement | null = null
let temporizadoresDeMusica: ReturnType<typeof setTimeout>[] = []
// Sube cada vez que se para la música. Arrancarla tarda (`play()` es
// asíncrono), y si mientras tanto se pidió pararla —la persona salió de la
// pantalla o empezó otro efecto—, al acabar de arrancar tiene que enterarse.
let turnoDeMusica = 0

export const pararMusicaDeCierre = () => {
  turnoDeMusica++
  temporizadoresDeMusica.forEach(clearTimeout)
  temporizadoresDeMusica = []
  if (musica) {
    musica.pause()
    musica.currentTime = 0
  }
}

// Espera a que acabe el efecto en curso —la ovación del programa o la campana
// de la retroalimentación— y a los que se encadenen detrás. `cancelada` deja
// saber si mientras tanto la persona salió de la pantalla.
export const sonarMusicaDeCierre = async (cancelada?: () => boolean) => {
  if (typeof window === "undefined") return
  let esperado: Promise<unknown>
  do {
    esperado = finDelEfecto
    await esperado
  } while (esperado !== finDelEfecto)
  if (cancelada?.()) return

  pararMusicaDeCierre()
  if (!musica) musica = new Audio("/sonidos/musica-resultados.mp3")
  const audio = musica
  audio.volume = VOLUMEN_MUSICA
  const turno = turnoDeMusica
  try {
    await audio.play()
  } catch {
    // El navegador no la dejó sonar: el mensaje se lee igual.
    return
  }
  if (turno !== turnoDeMusica || cancelada?.()) {
    pararMusicaDeCierre()
    return
  }

  const inicioDelFundido = DURACION_MUSICA_DE_CIERRE_MS - FUNDIDO_MS
  for (let paso = 1; paso <= PASOS_DEL_FUNDIDO; paso++) {
    temporizadoresDeMusica.push(
      setTimeout(() => {
        audio.volume = VOLUMEN_MUSICA * (1 - paso / PASOS_DEL_FUNDIDO)
      }, inicioDelFundido + (FUNDIDO_MS * paso) / PASOS_DEL_FUNDIDO)
    )
  }
  temporizadoresDeMusica.push(
    setTimeout(pararMusicaDeCierre, DURACION_MUSICA_DE_CIERRE_MS)
  )
}
