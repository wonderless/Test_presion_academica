"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { useAuth } from "@/contexts/AuthContext";

// El reparto de ítems por modo y los cortes de nivel son los mismos que ve el
// participante, y se leen de questions.ts. Tenerlos copiados aquí es lo que
// hace que el mismo test acabe dando puntajes distintos según quién lo mire:
// basta con que una copia se quede atrás al retocar el instrumento.
import {
  MODES,
  MODE_LABELS,
  MODE_THRESHOLDS,
  TOTAL_THRESHOLDS,
  type Mode,
} from "@/constants/questions";
import {
  calculateModeScore,
  calculateTotal,
  levelFor,
  type Answers,
} from "@/lib/scoring";

// Quien se registró pero nunca abrió el test. Antes esto se mostraba como
// "0 BAJO" en rojo, indistinguible de alguien que respondió y de verdad puntuó
// el mínimo: 67 participantes aparecían con afrontamiento bajo sin haber
// contestado una sola pregunta.
const SinResponder = () => (
  <span className="text-sm italic text-gray-400">Sin responder</span>
);

const CeldaModo = ({
  respondio,
  score,
  max,
  level,
}: {
  respondio: boolean;
  score: number;
  max: number;
  level: string;
}) => {
  if (!respondio) return <SinResponder />;

  return (
    <div className="flex flex-col">
      <span>
        {score}/{max}
      </span>
      <span
        className={`text-sm ${
          level === "ALTO"
            ? "text-green-600"
            : level === "MEDIO"
            ? "text-yellow-600"
            : "text-red-600"
        }`}
      >
        {level}
      </span>
    </div>
  );
};

interface StoredScore {
  score: number;
  level: string;
}

interface UserData {
  email: string;
  invitationCode: string;
  personalInfo: {
    nombres: string;
    apellidos: string;
    sexo: string;
  };
  testResults?: Partial<Record<Mode | "total", StoredScore>>;
  testDuration?: number;
  answers?: Answers;
}

export default function ListaUsers() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, loading: authLoading } = useAuth();
  const adminCode = user?.invitationCode ?? "";

  useEffect(() => {
    // Redirect (en el layout) ya garantiza sesión y rol para esta ruta, y el
    // código de invitación viene del propio documento del administrador, así
    // que no hace falta recorrer la colección `admins` buscándose por email.
    if (authLoading || !user) return;

    if (!adminCode) {
      setError("Tu cuenta de administrador no tiene código de invitación.");
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchData = async () => {
      try {
        // El filtro va en la consulta, no después de recibir los datos: antes
        // se descargaba la colección `users` entera al navegador y se
        // descartaban en el cliente los que no eran de este administrador.
        const usersQuery = query(
          collection(db, "users"),
          where("invitationCode", "==", adminCode)
        );
        const usersSnapshot = await getDocs(usersQuery);
        const usersData = usersSnapshot.docs.map(
          (doc) => doc.data() as UserData
        );

        if (!cancelled) {
          setUsers(usersData);
          setError(null);
        }
      } catch (err) {
        console.error("Error al cargar los usuarios:", err);
        if (!cancelled) {
          setError("Error al cargar los datos");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [user, authLoading, adminCode]);

  const formatTime = (seconds: number | undefined) => {
    if (!seconds) return "N/A";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-black text-xl">Cargando...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-red-500 text-xl">{error}</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Invitation Code Display */}
      <div className="flex justify-end mb-8">
        <div className="bg-white rounded-lg p-4 shadow-md">
          <h3 className="text-lg font-semibold mb-2">Código de Invitación:</h3>
          <p className="text-2xl font-bold text-blue-600">{adminCode}</p>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-gray-50 rounded-lg shadow-md overflow-x-auto">
        <table className="w-full table-auto">
          <thead className="bg-mi-color-rgb">
            <tr>
              {["Email", "Nombre", "Sexo"].map((titulo) => (
                <th
                  key={titulo}
                  className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider"
                >
                  {titulo}
                </th>
              ))}
              {MODES.map((mode) => (
                <th
                  key={mode}
                  className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider"
                >
                  {MODE_LABELS[mode]}
                </th>
              ))}
              <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                Total
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                Tiempo
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user, index) => {
              // Un expediente sin respuestas y sin resultados es de alguien
              // que se registró y nunca hizo el test.
              const haRespondido = !!user.answers || !!user.testResults;

              // El puntaje guardado manda; si no está —expediente antiguo o
              // resultados aún sin escribir— se recalcula de las respuestas.
              const puntajeDeModo = (mode: Mode) => {
                const almacenado = user.testResults?.[mode];
                if (almacenado?.score !== undefined) {
                  return {
                    score: almacenado.score,
                    level:
                      almacenado.level ??
                      levelFor(almacenado.score, MODE_THRESHOLDS[mode]),
                  };
                }
                const score = user.answers
                  ? calculateModeScore(user.answers, mode)
                  : 0;
                return { score, level: levelFor(score, MODE_THRESHOLDS[mode]) };
              };

              const totalAlmacenado = user.testResults?.total;
              const total =
                totalAlmacenado?.score !== undefined
                  ? {
                      score: totalAlmacenado.score,
                      level:
                        totalAlmacenado.level ??
                        levelFor(totalAlmacenado.score, TOTAL_THRESHOLDS),
                    }
                  : user.answers
                  ? calculateTotal(user.answers)
                  : { score: 0, level: levelFor(0, TOTAL_THRESHOLDS) };

              return (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap">{user.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {user.personalInfo?.nombres && user.personalInfo?.apellidos
                      ? `${user.personalInfo?.nombres} ${user.personalInfo?.apellidos}`
                      : "N/A"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {user.personalInfo?.sexo || "N/A"}
                  </td>
                  {MODES.map((mode) => {
                    const { score, level } = puntajeDeModo(mode);
                    return (
                      <td key={mode} className="px-6 py-4 whitespace-nowrap">
                        <CeldaModo
                          respondio={haRespondido}
                          score={score}
                          max={MODE_THRESHOLDS[mode].max}
                          level={level}
                        />
                      </td>
                    );
                  })}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <CeldaModo
                      respondio={haRespondido}
                      score={total.score}
                      max={TOTAL_THRESHOLDS.max}
                      level={total.level}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {haRespondido ? (
                      formatTime(user.testDuration)
                    ) : (
                      <SinResponder />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
