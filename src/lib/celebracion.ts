// src/lib/celebracion.ts
// Confeti al avanzar en las actividades, para que la persona se mantenga
// motivada. Lo pide el documento "Consideraciones - Test de Tensión Académica".
//
// La celebración crece con lo que se completa: una actividad suelta es un
// estallido pequeño —a la trigésima uno grande ya cansa—, y el final del
// programa, el más grande. Si todo celebrara igual, el final no se notaría.
//
// Cada celebración suena además con la campanita de src/lib/sonido.ts, que
// crece en la misma escala. El confeti no sale para quien
// pidió al sistema reducir el movimiento (`disableForReducedMotion`); el sonido
// sí, porque esa preferencia es sobre el movimiento, no sobre el audio.
//
// La librería se carga al primer uso: toca `window`, y así no entra en el
// renderizado del servidor ni pesa en la carga inicial de /results.
import type { Options } from "canvas-confetti";
import { sonarLogro } from "@/lib/sonido";

const lanzar = async (opciones: Options[], reiniciar = false) => {
  try {
    const { default: confetti } = await import("canvas-confetti");
    if (reiniciar) confetti.reset();
    opciones.forEach((o) => confetti({ disableForReducedMotion: true, ...o }));
  } catch (error) {
    // Una celebración que falla no debe afectar al progreso, que ya se guardó.
    console.error("Error al lanzar el confeti:", error);
  }
};

// Al marcar una actividad que no cierra el día.
//
// El confeti mide lo mismo en píxeles en cualquier pantalla: el estallido que
// en un celular ocupa media pantalla, en un monitor queda como un punto en el
// centro. En pantallas anchas se agranda, pero sin llegar al de culminar el
// día, para que la escala de celebraciones se mantenga.
export const celebrarActividad = () => {
  sonarLogro("actividad");
  return lanzar([
    window.innerWidth >= 768
      ? { particleCount: 70, spread: 80, startVelocity: 38, scalar: 1.1, ticks: 110, origin: { y: 0.7 } }
      : { particleCount: 40, spread: 55, startVelocity: 30, ticks: 90, origin: { y: 0.7 } },
  ]);
};

// Al culminar un día que no es el último.
export const celebrarDia = () => {
  sonarLogro("dia");
  return lanzar([
    { particleCount: 100, spread: 80, startVelocity: 40, origin: { y: 0.65 } },
  ]);
};

// Al completar los dos días de una recomendación.
export const celebrarRecomendacion = () => {
  sonarLogro("recomendacion");
  return lanzar([
    { particleCount: 90, angle: 60, spread: 70, origin: { x: 0, y: 0.7 } },
    { particleCount: 90, angle: 120, spread: 70, origin: { x: 1, y: 0.7 } },
    { particleCount: 60, spread: 100, startVelocity: 45, origin: { y: 0.6 } },
  ]);
};

// Al terminar todas las actividades del programa. Reinicia lo que hubiera en
// pantalla: suele coincidir con la celebración de la última recomendación, y
// esta debe verse como el final, no mezclada con la otra.
export const celebrarPrograma = () => {
  sonarLogro("programa");
  const duracion = 3500;
  const fin = Date.now() + duracion;
  const rafaga = () => {
    lanzar([
      { particleCount: 6, angle: 60, spread: 60, origin: { x: 0, y: 0.75 } },
      { particleCount: 6, angle: 120, spread: 60, origin: { x: 1, y: 0.75 } },
    ]);
    if (Date.now() < fin) setTimeout(rafaga, 120);
  };
  lanzar([{ particleCount: 160, spread: 120, startVelocity: 50, origin: { y: 0.6 } }], true)
    .then(rafaga);
};
