// src/lib/celebracion.ts
// Confeti al avanzar en las actividades, para que la persona se mantenga
// motivada. Lo pide el documento "Consideraciones - Test de Tensión Académica".
//
// La celebración crece con lo que se completa: una actividad suelta es un
// estallido pequeño —a la trigésima uno grande ya cansa—, y el final del
// programa, el más grande. Si todo celebrara igual, el final no se notaría.
//
// Cada celebración suena además (src/lib/sonido.ts): la actividad suelta, con
// una campanita; el día culminado, la recomendación y el programa, con una
// ovación; la retroalimentación, con una campana de victoria, y la medalla del
// segundo intento, con su propia fanfarria. El confeti no sale para quien
// pidió al sistema reducir el movimiento (`disableForReducedMotion`); el sonido
// sí, porque esa preferencia es sobre el movimiento, no sobre el audio.
//
// La librería se carga al primer uso: toca `window`, y así no entra en el
// renderizado del servidor ni pesa en la carga inicial de /results.
import type { Options } from "canvas-confetti";
import {
  reproducirEfecto,
  reproducirMedalla,
  sonarAlEntrar,
  sonarCampanita,
} from "@/lib/sonido";

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
  sonarCampanita();
  return lanzar([
    window.innerWidth >= 768
      ? { particleCount: 70, spread: 80, startVelocity: 38, scalar: 1.1, ticks: 110, origin: { y: 0.7 } }
      : { particleCount: 40, spread: 55, startVelocity: 30, ticks: 90, origin: { y: 0.7 } },
  ]);
};

// Al culminar un día que no es el último.
export const celebrarDia = () => {
  void reproducirEfecto("dia");
  return lanzar([
    { particleCount: 100, spread: 80, startVelocity: 40, origin: { y: 0.65 } },
  ]);
};

// Al completar los dos días de una recomendación. Completarla es culminar
// también las actividades de su último día, así que suena la misma ovación.
export const celebrarRecomendacion = () => {
  void reproducirEfecto("dia");
  return lanzar([
    { particleCount: 90, angle: 60, spread: 70, origin: { x: 0, y: 0.7 } },
    { particleCount: 90, angle: 120, spread: 70, origin: { x: 1, y: 0.7 } },
    { particleCount: 60, spread: 100, startVelocity: 45, origin: { y: 0.6 } },
  ]);
};

// Al terminar todas las actividades del programa. Reinicia lo que hubiera en
// pantalla: suele coincidir con la celebración de la última recomendación, y
// esta debe verse como el final, no mezclada con la otra. La ovación vuelve a
// empezar con ella.
export const celebrarPrograma = () => {
  void reproducirEfecto("dia");
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

// Al enviar la retroalimentación de una recomendación.
export const celebrarRetroalimentacion = () => {
  void reproducirEfecto("retroalimentacion");
  return lanzar([
    { particleCount: 80, spread: 90, startVelocity: 40, origin: { y: 0.6 } },
  ]);
};

// Al pulsar "¡Felicitaciones!" en un modo que salió medio o alto.
export const celebrarFelicitacion = () => {
  sonarCampanita();
  return lanzar([
    { particleCount: 90, spread: 90, startVelocity: 42, origin: { y: 0.6 } },
  ]);
};

// Al ver los resultados del segundo intento con algún modo que dejó el nivel
// bajo: la medalla. Confeti dorado, más largo que el del programa, porque es
// el logro que todo el plan de actividades perseguía. Suena al abrir los
// resultados, así que la música de fondo espera a que termine.
export const celebrarMedalla = () => {
  sonarAlEntrar(reproducirMedalla());
  const dorados = ["#FFD700", "#FFC107", "#F59E0B", "#FDE68A", "#FFFFFF"];
  const fin = Date.now() + 4500;
  const rafaga = () => {
    lanzar([
      { particleCount: 7, angle: 60, spread: 60, colors: dorados, origin: { x: 0, y: 0.75 } },
      { particleCount: 7, angle: 120, spread: 60, colors: dorados, origin: { x: 1, y: 0.75 } },
    ]);
    if (Date.now() < fin) setTimeout(rafaga, 120);
  };
  lanzar(
    [{ particleCount: 180, spread: 130, startVelocity: 55, colors: dorados, origin: { y: 0.55 } }],
    true
  ).then(rafaga);
};
