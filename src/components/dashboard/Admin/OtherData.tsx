"use client";

import { Fragment, useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { useAuth } from "@/contexts/AuthContext";
import * as XLSX from "xlsx";

// El reparto de ítems por modo es el mismo que ve el participante, y se lee de
// questions.ts. Tenerlo copiado aquí es lo que hace que el mismo test acabe
// dando puntajes distintos según quién lo mire.
import {
  MODES,
  MODE_LABELS,
  questions,
  type Mode,
} from "@/constants/questions";
import {
  calculateModeScore,
  calculateTotal,
  type Answers,
} from "@/lib/scoring";

// Quien se registró y nunca abrió el test. Aparece en la tabla y también en el
// Excel, con este texto en lugar de los puntajes, para poder hacerle
// seguimiento; al analizar los datos hay que filtrarlo.
const SIN_RESPONDER = "Sin responder";

const SinResponder = () => (
  <span className="text-sm italic text-gray-400">{SIN_RESPONDER}</span>
);

// Número de ítems del instrumento. Se lee de `questions` para que añadir o
// quitar un ítem no obligue a tocar este archivo.
const NUM_ITEMS = questions.length;

interface StoredScore {
  score: number;
  level: string;
}

type StoredResults = Partial<Record<Mode | "total", StoredScore>>;

interface UserTestData {
  email: string;
  testDuration?: number;
  testDuration2?: number;
  personalInfo: {
    edad: number;
    departamento: string;
    universidad: string;
    nombres: string;
    sexo: string;
    apellidos: string;
    carrera: string;
    ciclo: string;
  };
  answers?: Answers;
  answers2?: Answers;
  invitationCode: string;
  testResults?: StoredResults;
  testResults2?: StoredResults;
  hasRetakenTest?: boolean;
}

// El puntaje guardado manda; si no está —expediente antiguo, o resultados aún
// sin escribir— se recalcula de las respuestas.
const puntajeDeModo = (
  answers: Answers,
  stored: StoredResults | undefined,
  mode: Mode
): number => stored?.[mode]?.score ?? calculateModeScore(answers, mode);

const puntajeTotal = (
  answers: Answers,
  stored: StoredResults | undefined
): number => stored?.total?.score ?? calculateTotal(answers).score;

export default function OtherData() {
  const [users, setUsers] = useState<UserTestData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, loading: authLoading } = useAuth();
  const adminCode = user?.invitationCode ?? "";

  const formatTime = (seconds: number | undefined) => {
    if (!seconds) return "N/A";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  useEffect(() => {
    // Redirect (en el layout) ya garantiza sesión y rol para esta ruta, y el
    // código de invitación viene del propio documento del administrador.
    if (authLoading || !user) return;

    if (!adminCode) {
      setError("Tu cuenta de administrador no tiene código de invitación.");
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchData = async () => {
      try {
        // El filtro va en la consulta: antes se descargaba la colección
        // `users` entera al navegador para descartar luego a los que no son
        // de este administrador.
        const usersQuery = query(
          collection(db, "users"),
          where("invitationCode", "==", adminCode)
        );
        const usersSnapshot = await getDocs(usersQuery);

        // Se cargan todos, incluidos los que aún no han respondido: la tabla
        // los muestra como "Sin responder" para poder hacerles seguimiento.
        const usersData = usersSnapshot.docs.map(
          (doc) => doc.data() as UserTestData
        );

        if (!cancelled) {
          setUsers(usersData);
          setError(null);
        }
      } catch (err) {
        console.error("Error al cargar los datos:", err);
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

  const handleExportToExcel = () => {
    try {
      const excelData = users.map((user, index) => {
        // Quien se registró y nunca abrió el test también sale en el archivo,
        // marcado, para poder hacerle seguimiento desde la misma hoja.
        const haRespondido = !!user.answers;

        // Las respuestas se exportan como el número marcado (1 a 5), no como
        // su etiqueta: es lo que hace falta para analizarlas en SPSS o R sin
        // tener que recodificar la columna.
        const respuestas = (answers: Answers | undefined, sufijo: string) =>
          Object.fromEntries(
            Array.from({ length: NUM_ITEMS }, (_, i) => [
              `P${i + 1}${sufijo}`,
              answers?.[i + 1] ?? "N/A",
            ])
          );

        const puntajes = (
          answers: Answers | undefined,
          stored: StoredResults | undefined,
          sufijo: string,
          ausente: string
        ) => {
          const porModo = MODES.map((mode) => [
            `${MODE_LABELS[mode]}${sufijo}`,
            answers ? puntajeDeModo(answers, stored, mode) : ausente,
          ]);
          return Object.fromEntries([
            ...porModo,
            [
              `Total${sufijo}`,
              answers ? puntajeTotal(answers, stored) : ausente,
            ],
          ]);
        };

        return {
          "N°": index + 1,
          Email: user.email || "N/A",
          "Nombre y Apellido":
            user.personalInfo?.nombres && user.personalInfo?.apellidos
              ? `${user.personalInfo.nombres} ${user.personalInfo.apellidos}`
              : "N/A",
          Edad: user.personalInfo?.edad || "N/A",
          Sexo: user.personalInfo?.sexo || "N/A",
          Región: user.personalInfo?.departamento || "N/A",
          Universidad: user.personalInfo?.universidad || "N/A",
          Carrera: user.personalInfo?.carrera || "N/A",
          Ciclo: user.personalInfo?.ciclo || "N/A",
          Tiempo: haRespondido ? formatTime(user.testDuration) : SIN_RESPONDER,
          // Primer intento
          ...respuestas(user.answers, ""),
          ...puntajes(user.answers, user.testResults, "", SIN_RESPONDER),
          // Segundo intento
          ...respuestas(user.answers2, " S"),
          ...puntajes(user.answers2, user.testResults2, " S", "N/A"),
        };
      });

      const ws = XLSX.utils.json_to_sheet(excelData);

      // Los anchos van en el orden de las columnas de arriba.
      const anchoDePuntajes = MODES.map(() => 14).concat([12]);
      ws["!cols"] = [
        5, 25, 30, 8, 15, 15, 25, 25, 25, 10, 15,
        ...Array.from({ length: NUM_ITEMS }, () => 6),
        ...anchoDePuntajes,
        ...Array.from({ length: NUM_ITEMS }, () => 6),
        ...anchoDePuntajes,
      ].map((width) => ({ width }));

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Datos Test");

      XLSX.writeFile(wb, "datos_afrontamiento_tension_academica.xlsx");
    } catch (error) {
      console.error("Error al exportar a Excel:", error);
      alert("Error al exportar a Excel");
    }
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

  const encabezadosFijos = [
    "N°",
    "Email",
    "Nombre y Apellido",
    "Edad",
    "Sexo",
    "Región",
    "Universidad",
    "Carrera",
    "Ciclo",
    "Tiempo",
  ];

  const th = (contenido: string, key: string) => (
    <th
      key={key}
      className="px-4 py-3 text-left text-xs font-medium text-white uppercase"
    >
      {contenido}
    </th>
  );

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-black">
          Datos Adicionales de Participantes
        </h1>
        <button
          onClick={handleExportToExcel}
          className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700
                   transition-colors font-medium flex items-center gap-2"
        >
          <span>Exportar a Excel</span>
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-x-auto">
        <table className="w-full table-auto">
          <thead className="bg-mi-color-rgb">
            <tr>
              {encabezadosFijos.map((titulo) => th(titulo, titulo))}
              {["", " S"].map((sufijo) => (
                // Fragment con key: un fragmento suelto dentro de un map
                // dispara el aviso de React por lista sin clave.
                <Fragment key={sufijo || "primero"}>
                  {Array.from({ length: NUM_ITEMS }, (_, i) =>
                    th(`P${i + 1}${sufijo}`, `p-${i}-${sufijo}`)
                  )}
                  {MODES.map((mode) =>
                    th(`${MODE_LABELS[mode]}${sufijo}`, `${mode}-${sufijo}`)
                  )}
                  {th(`Total${sufijo}`, `total-${sufijo}`)}
                </Fragment>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user, index) => {
              // Quien no ha respondido no tiene puntaje que calcular: mostrarle
              // un 0 lo dejaba indistinguible de quien puntuó el mínimo.
              const haRespondido = !!user.answers;

              const celdasDeIntento = (
                answers: Answers | undefined,
                stored: StoredResults | undefined,
                sufijo: string,
                ausente: string
              ) => (
                <>
                  {Array.from({ length: NUM_ITEMS }, (_, i) => (
                    <td
                      key={`p-${i}-${sufijo}`}
                      className="px-4 py-3 whitespace-nowrap"
                    >
                      {answers?.[i + 1] ?? ausente}
                    </td>
                  ))}
                  {MODES.map((mode) => (
                    <td
                      key={`${mode}-${sufijo}`}
                      className="px-4 py-3 whitespace-nowrap"
                    >
                      {answers ? puntajeDeModo(answers, stored, mode) : ausente}
                    </td>
                  ))}
                  <td className="px-4 py-3 whitespace-nowrap font-medium">
                    {answers ? puntajeTotal(answers, stored) : ausente}
                  </td>
                </>
              );

              return (
                <tr key={index} className={index % 2 === 0 ? "bg-gray-50" : ""}>
                  <td className="px-4 py-3 whitespace-nowrap">{index + 1}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {user.email || "N/A"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {user.personalInfo?.nombres && user.personalInfo?.apellidos
                      ? `${user.personalInfo.nombres} ${user.personalInfo.apellidos}`
                      : "N/A"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {user.personalInfo?.edad || "N/A"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {user.personalInfo?.sexo || "N/A"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {user.personalInfo?.departamento || "N/A"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {user.personalInfo?.universidad || "N/A"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {user.personalInfo?.carrera || "N/A"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {user.personalInfo?.ciclo || "N/A"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {haRespondido ? (
                      formatTime(user.testDuration)
                    ) : (
                      <SinResponder />
                    )}
                  </td>
                  {celdasDeIntento(user.answers, user.testResults, "", "—")}
                  {celdasDeIntento(
                    user.answers2,
                    user.testResults2,
                    " S",
                    "N/A"
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
