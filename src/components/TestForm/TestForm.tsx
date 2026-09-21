"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { questions, ANSWER_OPTIONS } from "@/constants/questions";
import { db } from "@/lib/firebase/config";
import {
  doc,
  updateDoc,
  getDoc,
  serverTimestamp,
  type DocumentData,
  type UpdateData,
} from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { evaluarAccesoAlTest, type TestUserData } from "@/lib/testAccess";
import type { Answers } from "@/lib/scoring";

export const TestForm = () => {
  const router = useRouter();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  // Cada respuesta es el puntaje marcado, de 1 a 5. Antes era un booleano
  // Sí/No; ahora el propio valor es lo que puntúa.
  const [answers, setAnswers] = useState<Answers>({});
  // Impide un segundo envío: sin esto, el botón seguía activo mientras se
  // guardaba y un doble clic reenviaba el test cuando testStartTime ya se
  // había consumido, pisando la duración con 0.
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  // Establecer el tiempo de inicio cada vez que se abre el test. El formulario
  // siempre arranca en la primera pregunta y sin respuestas, así que abrirlo ya
  // significa empezar de cero: conservar una marca anterior solo servía para
  // arrastrar el cronómetro de un intento abandonado horas antes.
  useEffect(() => {
    localStorage.setItem("testStartTime", Date.now().toString());
  }, []);

  const handleAnswerChange = (value: number) => {
    const questionId = questions[currentQuestion].id;
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const goToNextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion((prev) => prev + 1);
    }
  };

  const goToPreviousQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion((prev) => prev - 1);
    }
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      // Duración en segundos. Si la marca de inicio no está, se omite el campo:
      // guardar 0 pisaba en silencio la duración de un envío anterior.
      const startTime = localStorage.getItem("testStartTime");
      const testDuration = startTime
        ? Math.floor((Date.now() - parseInt(startTime, 10)) / 1000)
        : null;

      if (testDuration === null) {
        console.warn(
          "No se encontró testStartTime al enviar: no se registra la duración."
        );
      }

      if (!user) {
        console.error("No user logged in");
        router.push("/");
        return;
      }

      const userDoc = await getDoc(doc(db, "users", user.uid));
      const userData = userDoc.data() as TestUserData | undefined;

      // En qué casilla cae este intento lo decide la misma regla que abre el
      // acceso al test, y se decide AHORA, con las respuestas ya en la mano.
      // Antes se decidía al empezar: la pantalla anterior marcaba
      // `hasRetakenTest` y este formulario se limitaba a leerla. Quien abría el
      // test y lo abandonaba se quedaba con el segundo intento consumido sin
      // haber respondido nada, y así hay 15 expedientes.
      const estado = evaluarAccesoAlTest(userData);
      const esSegundoIntento =
        userData?.hasRetakenTest === true || estado.tipo === "puede-repetir";

      // Primer intento en las propiedades estándar; el segundo, con sufijo "2".
      const suffix = esSegundoIntento ? "2" : "";
      const updateData: UpdateData<DocumentData> = {
        [`answers${suffix}`]: answers,
        [`lastTestDate${suffix}`]: serverTimestamp(),
      };

      if (testDuration !== null) {
        updateData[`testDuration${suffix}`] = testDuration;
      }

      if (esSegundoIntento) {
        // La marca viaja en la MISMA escritura que las respuestas: o existen
        // las dos cosas o no existe ninguna. Nunca un intento consumido y
        // vacío.
        updateData.hasRetakenTest = true;

        // El panel de actividades arranca limpio para el intento nuevo, pero
        // el registro del anterior se archiva en lugar de destruirse: es la
        // evidencia de qué actividades hizo la persona entre un test y otro,
        // es decir, la intervención cuyo efecto se quiere medir. Antes se
        // vaciaba sin más, y cuando el administrador veía a alguien pasar de
        // BAJO a MEDIO ya no había forma de saber qué había hecho.
        const progresoAnterior = userData?.recommendationProgress;
        if (progresoAnterior && Object.keys(progresoAnterior).length > 0) {
          updateData.recommendationProgress1 = progresoAnterior;
        }

        updateData.recommendationProgress = {};
      }

      // Update user document in Firestore
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, updateData);

      // Clean up start time from localStorage
      localStorage.removeItem("testStartTime");

      router.push("/results");
    } catch (error) {
      console.error("Error saving test results:", error);
      alert(
        "Hubo un error al guardar tus respuestas. Por favor intenta nuevamente."
      );
      // Solo se reabre el botón si falló: en el camino bueno se navega a
      // /results y debe seguir bloqueado durante la transición.
      setIsSubmitting(false);
    }
  };

  const currentQuestionData = questions[currentQuestion];
  const isFirstQuestion = currentQuestion === 0;
  const isLastQuestion = currentQuestion === questions.length - 1;
  const isAnswered = answers[currentQuestionData.id] !== undefined;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-xl p-4 md:p-6">
        <div className="bg-celeste p-4 md:p-8 rounded-lg shadow-lg mb-4 md:mb-6">
          <h2 className="text-lg md:text-xl font-medium mb-4 md:mb-6 min-h-0 md:min-h-[80px] flex items-center">
            {currentQuestion + 1}. {currentQuestionData.text}
          </h2>

          {/* Las cinco opciones en fila, una al lado de la otra. Cada una es
              una columna de ancho igual (flex-1 + w-0), que es lo que impide
              que "Casi siempre" ensanche su celda y descuadre las demás: el
              texto largo parte de línea dentro de su propia columna. */}
          <div
            className="flex flex-row gap-1 sm:gap-2"
            role="radiogroup"
            aria-label={currentQuestionData.text}
          >
            {ANSWER_OPTIONS.map((option) => {
              const isSelected = answers[currentQuestionData.id] === option.value;
              return (
                <label
                  key={option.value}
                  className={`flex-1 w-0 flex flex-col items-center text-center gap-1 px-1 py-3 rounded-lg cursor-pointer border transition-colors ${
                    isSelected
                      ? "border-green-600 bg-green-50"
                      : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="radio"
                    name={`question-${currentQuestionData.id}`}
                    value={option.value}
                    checked={isSelected}
                    onChange={() => handleAnswerChange(option.value)}
                    className="w-4 h-4 text-blue-600"
                    // Nombre accesible explícito. Sin él sale de concatenar
                    // los dos <span> de al lado, y entonces depende de cómo
                    // el navegador junte "3" y "A veces": un lector de
                    // pantalla podía leer "3A veces".
                    aria-label={`${option.value} ${option.label}`}
                  />
                  <span className="font-semibold text-sm">{option.value}</span>
                  <span className="text-xs sm:text-sm leading-tight">
                    {option.label}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="flex justify-between">
          {!isFirstQuestion && (
            <button
              onClick={goToPreviousQuestion}
              disabled={isSubmitting}
              className="px-4 md:px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300
                      transition-colors font-medium disabled:opacity-50
                      disabled:cursor-not-allowed text-sm md:text-base"
            >
              Atrás
            </button>
          )}

          <div className="flex-1" />

          {!isLastQuestion ? (
            <button
              onClick={goToNextQuestion}
              disabled={!isAnswered}
              className="px-4 md:px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700
                      transition-colors font-medium disabled:opacity-50
                      disabled:cursor-not-allowed text-sm md:text-base"
            >
              Siguiente
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!isAnswered || isSubmitting}
              className="px-4 md:px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700
                      transition-colors font-medium disabled:opacity-50
                      disabled:cursor-not-allowed text-sm md:text-base"
            >
              {isSubmitting ? "Guardando..." : "Finalizar Test"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
