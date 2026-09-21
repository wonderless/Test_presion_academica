'use client';
import { useState } from "react";
import { useRouter } from "next/navigation";
import { hasAcceptedTerms, setTermsAccepted } from "@/lib/terms";

export default function ConsentPage() {
  // Arranca marcada si la persona ya aceptó antes: al volver a "/" no tiene
  // sentido pedirle el consentimiento como si fuera la primera vez.
  const [isChecked, setIsChecked] = useState(hasAcceptedTerms);
  const router = useRouter();

  // El consentimiento se persiste al marcar la casilla, no al pulsar el botón:
  // Redirect lee `hasAcceptedTerms()` en cada navegación y es lo que abre el
  // resto de rutas de invitado.
  const handleCheckChange = (accepted: boolean) => {
    setIsChecked(accepted);
    setTermsAccepted(accepted);
  };

  const handleConsent = () => {
    if (isChecked) {
      setTermsAccepted(true);
      router.push('/home');
    } else {
      // Mostrar un mensaje si intentan continuar sin marcar la casilla
      alert("Debe aceptar los términos y condiciones para continuar.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-full px-4 py-10">
      <div className="w-full max-w-lg bg-celeste text-mi-color-rgb rounded-2xl shadow-xl p-6 sm:p-8">
        <h1 className="text-xl sm:text-2xl font-bold text-center mb-6">
          Programa de evaluación y orientación del afrontamiento a la tensión
          académica
        </h1>

        <h2 className="text-sm font-semibold uppercase tracking-wide mb-2 text-center">
          Términos y condiciones
        </h2>

        <div className="bg-white/70 rounded-lg border border-black/10 p-4 max-h-56 overflow-y-auto text-sm text-left mb-5">
          <p>
            El presente es un programa experimental que busca medir y orientar
            tus modos de afrontamiento a la tensión académica. En el caso que
            algún modo de afronte se encuentre bajo, te orientará para que
            realices actividades que mejoren el déficit y evitar problemas
            psicológicos mayores.
          </p>
          <p className="mt-3">
            Tu participación es voluntaria. En el momento que desees puedes
            abandonar el programa.
          </p>
        </div>

        <label
          htmlFor="consent"
          className="flex items-start gap-3 cursor-pointer select-none"
        >
          <input
            type="checkbox"
            id="consent"
            checked={isChecked}
            onChange={(e) => handleCheckChange(e.target.checked)}
            className="mt-1 h-4 w-4 flex-shrink-0"
          />
          <span className="text-sm font-medium">
            He leído y acepto los términos y condiciones.
          </span>
        </label>
        {!isChecked && (
          <p className="text-red-600 text-xs mt-1 ml-7">
            * Es necesario marcar esta casilla para continuar
          </p>
        )}

        <button
          disabled={!isChecked}
          className={`w-full mt-6 px-4 py-3 text-white rounded-lg font-medium transition-colors ${
            isChecked
              ? "bg-blue-600 hover:bg-blue-700"
              : "bg-gray-400 cursor-not-allowed"
          }`}
          onClick={handleConsent}
        >
          {isChecked ? "Continuar" : "Marque la casilla para continuar"}
        </button>
      </div>
    </div>
  );
}
