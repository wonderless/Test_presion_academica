"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase/config";
import { TestForm } from "@/components/TestForm/TestForm";
import {
  evaluarAccesoAlTest,
  permiteEntrarAlTest,
  type EstadoTest,
  type TestUserData,
} from "@/lib/testAccess";

const TestPage = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  // La decisión la toma src/lib/testAccess.ts, igual que en el dashboard.
  // Aquí solo se comprueba, además, que se haya entrado por el botón que
  // arranca el cronómetro.
  const [estado, setEstado] = useState<EstadoTest | null>(null);
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    const checkTestAccess = async () => {
      try {
        // Redirect (en el layout) es quien decide si hay sesión y si esta ruta
        // corresponde al rol; aquí solo se resuelve el acceso al test.
        if (authLoading || !user) {
          return;
        }

        const userDoc = await getDoc(doc(db, "users", user.uid));
        const userData = userDoc.exists()
          ? (userDoc.data() as TestUserData)
          : undefined;

        const resultado = evaluarAccesoAlTest(userData);

        // Llegar aquí escribiendo la URL a mano, sin pasar por el botón, deja
        // el cronómetro sin arrancar: se devuelve al dashboard, que es donde
        // empieza el flujo. El segundo intento ya autorizado se exceptúa
        // porque su marca ya está puesta en Firestore.
        // Al panel en los dos casos: cuando la regla no permite hacer el test,
        // y cuando se ha llegado aquí escribiendo la URL sin pasar por el
        // botón, que es lo que arranca el cronómetro. El panel es la pantalla
        // de aterrizaje y desde ahí se llega a los resultados.
        // El segundo intento ya autorizado se exceptúa de lo del cronómetro
        // porque su marca ya está puesta en Firestore.
        if (
          !permiteEntrarAlTest(resultado) ||
          (resultado.tipo !== "segundo-intento-en-curso" &&
            !localStorage.getItem("testStartTime"))
        ) {
          router.replace("/dashboard/user");
          return;
        }

        setEstado(resultado);
        setLoading(false);
      } catch (error) {
        console.error("Error verificando acceso al test:", error);
        router.replace("/dashboard/user");
      }
    };

    checkTestAccess();
  }, [user, authLoading, router]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Si no se puede entrar ya se ha redirigido arriba; esto solo cubre el
  // instante entre la decisión y la navegación.
  if (!estado || !permiteEntrarAlTest(estado)) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Si puede acceder, mostrar el formulario del test
  return <TestForm />;
};

export default TestPage;
