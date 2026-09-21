"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { useAuth } from "@/contexts/AuthContext";
import {
  evaluarAccesoAlTest,
  permiteEntrarAlTest,
  type EstadoTest,
  type TestUserData,
} from "@/lib/testAccess";
import { LogOut } from "lucide-react";

const UserDashboard = () => {
  const router = useRouter();
  // Quién decide si se puede hacer el test es src/lib/testAccess.ts, el mismo
  // módulo que usan /test y el botón de resultados. Aquí solo se pinta.
  const [estado, setEstado] = useState<EstadoTest | null>(null);
  const [loading, setLoading] = useState(true);
  const {user, loading: authLoading, signOut} = useAuth();

  useEffect(() => {
    const checkTestAvailability = async () => {
      try {
        if (authLoading) {
          return; // Esperar a que la autenticación termine de cargar
        }

        // Redirect (en el layout) ya garantiza sesión y rol para esta ruta.
        if (!user) {
          return;
        }

        const userDoc = await getDoc(doc(db, "users", user.uid));
        const resultado = evaluarAccesoAlTest(
          userDoc.data() as TestUserData | undefined
        );

        setEstado(resultado);
        setLoading(false);
      } catch (error) {
        console.error("Error checking test availability:", error);
        setLoading(false);
      }
    };

    checkTestAvailability();
  }, [user, authLoading]);

  // Empezar el test no escribe nada en Firestore. Que este intento sea el
  // segundo lo resuelve TestForm al enviarlo, junto con las respuestas: marcar
  // aquí dejaba el intento consumido a quien abría el test y lo abandonaba.
  const handleStartTest = () => {
    localStorage.setItem("testStartTime", Date.now().toString());
    router.push("/test");
  };

  const handleSignOut = async () => {
    try {
      // Al quedarse sin sesión, Redirect devuelve al consentimiento.
      await signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="p-6 w-full max-w-lg bg-celeste rounded-xl shadow-md flex flex-col items-center">
          <p className="text-black">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-celeste p-8 rounded-lg shadow-md w-full max-w-md">
      
      {/* Sign Out Button */}
      <div className="flex justify-end mb-4">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          title="Cerrar Sesión"
        >
          <LogOut size={20} />
          <span className="text-sm">Cerrar Sesión</span>
        </button>
      </div>

      <h1 className="text-center text-2xl font-bold mb-4">
        Programa de evaluación y orientación de los modos de afrontamiento a la tensión académica
      </h1>

      <div className="mb-4 text-center">
        <h2 className="text-lg font-semibold">AUTORES:</h2>
        {[
          "Alex Grajeda-Montalvo",
          "Ashley Arteaga",
          "Eliane Aynaya",
          "Alexa Casas",
          "Joao Salvador",
          "Manuel Sosa",
          "Aragon Tafur",
          "Yasmin Castillo",
        ].map((autor) => (
          <p key={autor}>{autor}</p>
        ))}
      </div>

      {estado && permiteEntrarAlTest(estado) ? (
        <>
          <div className="mb-4 text-center">
            <h2 className="text-lg font-semibold">INSTRUCCIONES:</h2>
            <p>
              Lee cada una de las siguientes situaciones y marca con qué
              frecuencia te ocurrieron de manera regular durante el último
              ciclo: 1 (nunca), 2 (casi nunca), 3 (a veces), 4 (casi siempre)
              o 5 (siempre). No hay respuestas buenas ni malas.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row justify-center gap-3">
            {/* Quien ya completó sus actividades tiene las dos opciones a la
                vez: repetir el test o volver a consultar lo que obtuvo la
                primera vez. Los demás casos que llegan aquí —primer intento y
                segundo intento a medias— no tienen todavía un resultado que
                enseñar. */}
            {estado.tipo === "puede-repetir" && (
              <button
                onClick={() => router.push("/results")}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
              >
                Ver mis resultados
              </button>
            )}

            <button
              onClick={handleStartTest}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              {estado.tipo === "puede-repetir"
                ? "Realizar el test otra vez"
                : "Iniciar Test"}
            </button>
          </div>
        </>
      ) : (
        // Ya hizo el test y no puede repetirlo ahora. Sus puntajes, su nivel
        // por modo y sus actividades están en /results; aquí solo se le
        // da la entrada, sin adelantarle un resumen que sustituya a esa
        // pantalla.
        <div className="flex justify-center">
          <button
            onClick={() => router.push("/results")}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Ver mis resultados
          </button>
        </div>
      )}
      </div>
    </div>
  );
};

export default UserDashboard;
