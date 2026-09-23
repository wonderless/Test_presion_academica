// src/lib/sonido.ts
// Sonido de campanita que acompaña al confeti al avanzar en las actividades.
//
// Se genera en el navegador con la Web Audio API: no hay archivos que
// descargar ni licencias que revisar. Las cuatro celebraciones usan las mismas
// notas (do-mi-sol-do) y crecen igual que el confeti, para que el final del
// programa suene como la versión grande de lo que la persona ya conoce.
//
// Suena siempre después de pulsar un botón, así que el navegador lo permite.
// No hay control propio para silenciarlo: son sonidos cortos que solo siguen a
// un clic de la persona, y quien no los quiera usa el volumen del dispositivo.

export type NivelDeLogro = "actividad" | "dia" | "recomendacion" | "programa";

const VOLUMEN = 0.6;

// Do5, mi5, sol5, do6 y mi6, en Hz.
const DO5 = 523.25;
const MI5 = 659.25;
const SOL5 = 783.99;
const DO6 = 1046.5;
const MI6 = 1318.5;
const ARPEGIO = [DO5, MI5, SOL5, DO6];

// Timbre de campana: la fundamental y dos armónicos más suaves.
const PARCIALES: Array<[number, number]> = [
  [1, 1],
  [2.01, 0.35],
  [3.98, 0.12],
];

let contexto: AudioContext | null = null;
// Salida del sonido en curso. Al terminar el programa suenan a la vez la
// última recomendación y el final: el final corta al otro para no mezclarse,
// como hace el confeti.
let salidaEnCurso: GainNode | null = null;

const obtenerContexto = (): AudioContext | null => {
  if (typeof window === "undefined") return null;
  if (!contexto) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;
    contexto = new Ctor();
  }
  if (contexto.state === "suspended") void contexto.resume();
  return contexto;
};

const campana = (
  ctx: AudioContext,
  salida: AudioNode,
  frecuencia: number,
  inicio: number,
  duracion: number,
  ganancia = 0.28
) => {
  PARCIALES.forEach(([multiplo, relativa]) => {
    const oscilador = ctx.createOscillator();
    const envolvente = ctx.createGain();
    oscilador.type = "sine";
    oscilador.frequency.setValueAtTime(frecuencia * multiplo, inicio);
    envolvente.gain.setValueAtTime(0.0001, inicio);
    envolvente.gain.exponentialRampToValueAtTime(ganancia * relativa, inicio + 0.008);
    envolvente.gain.exponentialRampToValueAtTime(
      0.0001,
      inicio + duracion / Math.sqrt(multiplo)
    );
    oscilador.connect(envolvente).connect(salida);
    oscilador.start(inicio);
    oscilador.stop(inicio + duracion + 0.05);
  });
};

const PARTITURAS: Record<
  NivelDeLogro,
  (ctx: AudioContext, salida: AudioNode, t: number) => void
> = {
  // Las cuatro notas, rápidas y sin nada que quede sonando.
  actividad: (ctx, salida, t) =>
    ARPEGIO.forEach((f, i) => campana(ctx, salida, f, t + i * 0.07, 0.5)),

  // La de actividad, rematada con una nota aguda que se queda sonando.
  dia: (ctx, salida, t) => {
    ARPEGIO.forEach((f, i) => campana(ctx, salida, f, t + i * 0.07, 0.5));
    campana(ctx, salida, MI6, t + 0.3, 0.6, 0.18);
  },

  // Más pausada y con un acorde breve al final.
  recomendacion: (ctx, salida, t) => {
    ARPEGIO.forEach((f, i) => campana(ctx, salida, f, t + i * 0.09, 0.7));
    ARPEGIO.forEach((f) => campana(ctx, salida, f, t + 0.4, 0.8, 0.1));
  },

  // La completa: el arpegio pausado y el acorde sostenido.
  programa: (ctx, salida, t) => {
    ARPEGIO.forEach((f, i) => campana(ctx, salida, f, t + i * 0.11, 0.9));
    ARPEGIO.forEach((f) => campana(ctx, salida, f, t + 0.5, 1.4, 0.12));
  },
};

export const sonarLogro = (nivel: NivelDeLogro) => {
  try {
    const ctx = obtenerContexto();
    if (!ctx) return;

    if (nivel === "programa" && salidaEnCurso) {
      salidaEnCurso.disconnect();
    }

    const salida = ctx.createGain();
    salida.gain.value = VOLUMEN;
    salida.connect(ctx.destination);
    salidaEnCurso = salida;

    PARTITURAS[nivel](ctx, salida, ctx.currentTime + 0.02);
  } catch (error) {
    // Un sonido que falla no debe afectar al progreso, que ya se guardó.
    console.error("Error al reproducir el sonido:", error);
  }
};
