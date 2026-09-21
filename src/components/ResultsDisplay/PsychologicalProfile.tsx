// components/ResultsDisplay/PsychologicalProfile.tsx
//
// Tabla e interpretación de los resultados. Los textos no se escriben aquí:
// salen de constants/interpretations.ts, transcritos del instrumento.
import React from "react";
import { MODES, MODE_LABELS } from "@/constants/questions";
import {
  MODE_INTERPRETATIONS,
  TOTAL_INTERPRETATIONS,
} from "@/constants/interpretations";
import type { Results, TotalScore, Level } from "@/lib/scoring";

interface Props {
  results: Results;
  total: TotalScore;
  getLevelClass: (level: string) => string;
}

// Los tres modos tienen máximos distintos —60, 40 y 20, según cuántos ítems
// los componen—, así que las barras van en porcentaje del máximo de cada uno.
// Dibujarlas con el puntaje crudo haría parecer que el modo responsable es
// siempre el más fuerte solo por tener el triple de ítems que el activador.
const porcentaje = (score: number, max: number) =>
  max > 0 ? Math.round((score / max) * 100) : 0;

const colorDeNivel = (level: Level) =>
  level === "ALTO" ? "#28a745" : level === "MEDIO" ? "#ffc107" : "#dc3545";

const PsychologicalProfile: React.FC<Props> = ({
  results,
  total,
  getLevelClass,
}) => {
  const interpretacionTotal = TOTAL_INTERPRETATIONS[total.level];

  return (
    <div className="mb-6 sm:mb-8 bg-celeste p-4 sm:p-6 rounded-lg shadow-lg w-full">
      <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">
        Perfil psicológico
      </h2>

      {/* Modo de afronte total. Tiene su propia escala de 0 a 120, no es la
          media de los tres modos. */}
      <div className="mb-4 p-3 sm:p-4 bg-white rounded-md border border-gray-300">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <span className="font-semibold text-sm sm:text-base">
            Modo de afronte total
          </span>
          <span className="text-sm sm:text-base">
            {total.score} / {total.max}
          </span>
          <span
            className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${getLevelClass(
              total.level
            )}`}
          >
            {total.level}
          </span>
        </div>
        <p className="text-sm sm:text-base font-medium text-gray-800">
          {interpretacionTotal.label}: {interpretacionTotal.description}
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse border-2 border-black text-xs sm:text-sm">
          <thead>
            <tr className="bg-mi-color-rgb text-white">
              <th className="py-2 sm:py-3 px-2 sm:px-4 text-left border-2 border-black">
                Modo de afrontamiento
              </th>
              <th className="py-2 sm:py-3 px-2 sm:px-4 text-center border-2 border-black">
                Puntuación
              </th>
              <th className="py-2 sm:py-3 px-2 sm:px-4 text-center border-2 border-black">
                Nivel
              </th>
              <th className="py-2 sm:py-3 px-2 sm:px-4 text-left border-2 border-black">
                Interpretación
              </th>
            </tr>
          </thead>
          <tbody>
            {MODES.map((mode) => {
              const result = results[mode];
              return (
                <tr key={mode} className="bg-white">
                  <td className="py-2 sm:py-3 px-2 sm:px-4 border-2 border-black font-medium">
                    {MODE_LABELS[mode]}
                  </td>
                  <td className="py-2 sm:py-3 px-2 sm:px-4 text-center border-2 border-black">
                    {result.score} / {result.max}
                  </td>
                  <td className="py-2 sm:py-3 px-2 sm:px-4 text-center border-2 border-black">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getLevelClass(
                        result.level
                      )}`}
                    >
                      {result.level}
                    </span>
                  </td>
                  <td className="py-2 sm:py-3 px-2 sm:px-4 border-2 border-black">
                    {MODE_INTERPRETATIONS[mode][result.level].description}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Comparativa en porcentaje del máximo de cada modo. */}
      <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-white rounded-lg border border-gray-200">
        <p className="font-medium text-blue-800 text-sm sm:text-base mb-3">
          Comparativa entre modos
        </p>

        <div className="space-y-3">
          {MODES.map((mode) => {
            const result = results[mode];
            const pct = porcentaje(result.score, result.max);
            return (
              <div key={mode}>
                <div className="flex justify-between text-xs sm:text-sm mb-1">
                  <span>{MODE_LABELS[mode]}</span>
                  <span>
                    {result.score} / {result.max} ({pct}%)
                  </span>
                </div>
                <div
                  className="w-full bg-gray-200 rounded-full h-3"
                  role="img"
                  aria-label={`${MODE_LABELS[mode]}: ${result.score} de ${result.max}, nivel ${result.level}`}
                >
                  <div
                    className="h-3 rounded-full transition-all duration-300"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: colorDeNivel(result.level),
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-3 text-xs sm:text-sm text-gray-700">
          Las barras van en porcentaje del máximo de cada modo, porque no tienen
          el mismo número de ítems: el responsable suma hasta 60 puntos, el
          organizado hasta 40 y el activador fisiológico hasta 20.
        </p>
      </div>
    </div>
  );
};

export default PsychologicalProfile;
