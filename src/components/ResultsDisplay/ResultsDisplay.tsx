import {
  MODES,
  MODE_LABELS,
  modeQuestions,
  ITEM_INTERVENTION_MAX_SCORE,
  questionText,
  type Mode,
} from "@/constants/questions";
import {
  calculateResults,
  calculateTotal,
  getRecommendationsForMode,
  type Answers,
  type Level,
  type Results,
  type TotalScore,
} from "@/lib/scoring";
import {
  modeSpeech,
  PLAN_INVITACION,
  SPEECH_FINALIZACION,
} from "@/constants/interpretations";
import type {
  ActivityBlock,
  RecommendationItem,
} from "../../constants/recommendations";
import { useEffect, useState, useRef, useCallback, useMemo, memo } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import PsychologicalProfile from "./PsychologicalProfile";
import {
  celebrarActividad,
  celebrarDia,
  celebrarRecomendacion,
  celebrarPrograma,
} from "@/lib/celebracion";

interface Props {
  userId: string;
}

// Tiempo de desbloqueo para pasar al siguiente día de actividades, en
// segundos. 12 horas = 43200.
//
// Aquí había, comentada justo debajo, una segunda definición con 10 segundos
// para poder probar el flujo sin esperar. Estaba a un carácter de activarse en
// un despliegue, y si eso pasa el desbloqueo se vuelve instantáneo sin que nada
// lo advierta. Para probar, defina NEXT_PUBLIC_UNLOCK_DELAY_SECONDS en su
// .env.local; nunca en producción.
const UNLOCK_DELAY_POR_DEFECTO = 12 * 60 * 60;

const leerRetardoDeDesbloqueo = (): number => {
  const configurado = Number(process.env.NEXT_PUBLIC_UNLOCK_DELAY_SECONDS);
  // Un valor mal escrito no debe romper las actividades ni, peor, dejarlas en
  // cero: se cae al valor de producción.
  return Number.isFinite(configurado) && configurado > 0
    ? configurado
    : UNLOCK_DELAY_POR_DEFECTO;
};

const UNLOCK_DELAY_SECONDS = leerRetardoDeDesbloqueo();

interface ActivityProgress {
  currentDay: number;
  currentActivityIndex: number;
  completedActivities: number[];
  isCompleted: boolean;
  countdown?: number | null;
  countdownStartTime?: number | null;
}

interface RecommendationStatus {
  [mode: string]: {
    // Hubo aquí un `isOpen` para plegar y desplegar cada modo. El cargador lo
    // resolvía desde Firestore, pero la interfaz nunca llegó a tener el
    // plegable: no había nada que lo leyera ni nada que lo escribiera.
    userAnswers: Answers;
    modeLevel: Level;
    recommendationProgress: {
      [recommendationId: string]: ActivityProgress;
    };
    currentQuestionIndex: number;
  };
}

// Momento en que se abre el día siguiente de una recomendación en espera.
const momentoDeDesbloqueo = (countdownStartTime: number): Date =>
  new Date(countdownStartTime + UNLOCK_DELAY_SECONDS * 1000);

// "21:30 del 8 de septiembre". La tarjeta en espera y el aviso de pendientes
// dan la hora igual, para que se reconozca como la misma.
const formatearDesbloqueo = (momento: Date): string =>
  `${momento.toLocaleTimeString("es-PE", {
    hour: "2-digit",
    minute: "2-digit",
  })} del ${momento.toLocaleDateString("es-PE", {
    day: "numeric",
    month: "long",
  })}`;

// Componente optimizado para mostrar el countdown sin re-renderizar el resto
const CountdownDisplay = memo<{
  countdownStartTime: number;
  onComplete: () => void;
}>(({ countdownStartTime, onComplete }) => {
  const [timeRemaining, setTimeRemaining] = useState(UNLOCK_DELAY_SECONDS);

  useEffect(() => {
    const actualizar = () => {
      const elapsed = Math.floor((Date.now() - countdownStartTime) / 1000);
      const remaining = Math.max(0, UNLOCK_DELAY_SECONDS - elapsed);
      setTimeRemaining(remaining);
      if (remaining <= 0) onComplete();
    };

    actualizar();
    const interval = setInterval(actualizar, 1000);
    return () => clearInterval(interval);
  }, [countdownStartTime, onComplete]);

  // No se muestra una cuenta atrás sino la hora absoluta de desbloqueo: con
  // doce horas por delante, una cuenta atrás obliga a hacer la suma mentalmente.
  const unlockTime = momentoDeDesbloqueo(countdownStartTime);

  return (
    <span>
      {timeRemaining > 0
        ? `Se desbloqueará la actividad a las ${formatearDesbloqueo(unlockTime)}`
        : "¡Ya disponible!"}
    </span>
  );
});
CountdownDisplay.displayName = "CountdownDisplay";

const OptimizedButton = memo<{
  onClick: () => void;
  disabled?: boolean;
  className: string;
  children: React.ReactNode;
}>((props) => (
  <button
    onClick={props.onClick}
    disabled={props.disabled}
    className={props.className}
  >
    {props.children}
  </button>
));
OptimizedButton.displayName = "OptimizedButton";

// Siguiente (o anterior) ítem del modo respondido con 1 o 2: son los únicos que
// tienen actividades. null si no queda ninguno en esa dirección.
const findNextLowItemIndex = (
  modeKey: string,
  answers: Answers | null,
  currentQuestionIndex: number,
  direction: "next" | "prev"
): number | null => {
  if (!answers) return null;

  const allQuestions = modeQuestions[modeKey as Mode];
  if (!allQuestions) return null;

  const paso = direction === "next" ? 1 : -1;
  for (
    let i = currentQuestionIndex + paso;
    i >= 0 && i < allQuestions.length;
    i += paso
  ) {
    const answer = answers[allQuestions[i]];
    if (answer !== undefined && answer <= ITEM_INTERVENTION_MAX_SCORE) {
      return i;
    }
  }
  return null;
};

interface NavegacionProps {
  modeKey: string;
  userTestAnswers: Answers | null;
  currentQuestionIndex: number;
  onQuestionChange: (modeKey: string, index: number) => void;
}

// Botonera Anterior/Siguiente. Estaba duplicada literalmente en los dos
// componentes, y cada botón recalculaba su índice destino hasta tres veces.
const NavegacionPreguntas = memo<NavegacionProps>(
  ({ modeKey, userTestAnswers, currentQuestionIndex, onQuestionChange }) => {
    const prevIndex = findNextLowItemIndex(
      modeKey,
      userTestAnswers,
      currentQuestionIndex,
      "prev"
    );
    const nextIndex = findNextLowItemIndex(
      modeKey,
      userTestAnswers,
      currentQuestionIndex,
      "next"
    );

    const estilo = (activo: boolean, color: string) =>
      `w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-medium transition-colors text-sm sm:text-base ${
        activo
          ? `${color} text-white`
          : "bg-gray-400 text-gray-200 cursor-not-allowed"
      }`;

    return (
      <div className="flex flex-col sm:flex-row justify-center gap-2 sm:gap-4">
        <OptimizedButton
          onClick={() =>
            prevIndex !== null && onQuestionChange(modeKey, prevIndex)
          }
          disabled={prevIndex === null}
          className={estilo(
            prevIndex !== null,
            "bg-yellow-600 hover:bg-yellow-700"
          )}
        >
          Anterior
        </OptimizedButton>
        <OptimizedButton
          onClick={() =>
            nextIndex !== null && onQuestionChange(modeKey, nextIndex)
          }
          disabled={nextIndex === null}
          className={estilo(
            nextIndex !== null,
            "bg-green-600 hover:bg-green-700"
          )}
        >
          Siguiente
        </OptimizedButton>
      </div>
    );
  }
);
NavegacionPreguntas.displayName = "NavegacionPreguntas";

// Cuerpo de un ejercicio: párrafos y listas de viñetas, en el mismo orden en
// que aparecen en el documento del programa. Varios ejercicios presentan con
// un párrafo, enumeran en viñetas y cierran con otro párrafo; renderizarlo todo
// como texto corrido perdía las viñetas y dejaba la pantalla plana.
const CuerpoDeActividad = memo<{ cuerpo: ActivityBlock[] }>(({ cuerpo }) => (
  <div className="mb-3 sm:mb-4 space-y-2">
    {cuerpo.map((bloque, i) =>
      bloque.tipo === "lista" ? (
        <ul
          key={i}
          className="list-disc pl-5 space-y-1 text-gray-700 text-sm sm:text-base"
        >
          {bloque.puntos.map((punto, j) => (
            // whitespace-pre-line también aquí: un punto de la lista puede
            // contener a su vez una enumeración "1) … 2) …" que el generador
            // ha partido en líneas.
            <li key={j} className="whitespace-pre-line">
              {punto}
            </li>
          ))}
        </ul>
      ) : (
        // whitespace-pre-line: dentro de un mismo párrafo el documento parte
        // líneas a propósito, por ejemplo en los pasos de una secuencia.
        <p
          key={i}
          className="text-gray-700 text-sm sm:text-base whitespace-pre-line"
        >
          {bloque.texto}
        </p>
      )
    )}
  </div>
));
CuerpoDeActividad.displayName = "CuerpoDeActividad";

interface DayActivitiesProps extends NavegacionProps {
  recommendation: RecommendationItem;
  currentProgress: ActivityProgress;
  onCompleteActivity: (modeKey: string, recommendationId: string) => void;
  onCountdownComplete: (modeKey: string, recommendationId: string) => void;
}

// Actividades del día en curso, o la espera hasta que se abra el siguiente.
const DayActivitiesRenderer = memo<DayActivitiesProps>((props) => {
  const {
    recommendation,
    modeKey,
    currentProgress,
    userTestAnswers,
    currentQuestionIndex,
    onQuestionChange,
    onCompleteActivity,
    onCountdownComplete,
  } = props;

  // El día se clampea al rango real del plan. Si por lo que sea el progreso
  // guardado apunta a un día que no existe —dos caminos distintos pueden
  // avanzarlo: esta pantalla al agotarse la espera y la limpieza periódica—,
  // sin esto el componente devolvía null y la tarjeta salía en blanco: el
  // título del ítem y nada debajo, sin ni siquiera los botones para navegar a
  // otro ítem, así que no había forma de salir de ahí salvo recargando.
  const totalDias = recommendation.days?.length ?? 0;
  if (totalDias === 0) return null;
  const diaVisible = Math.min(Math.max(currentProgress.currentDay, 1), totalDias);
  const currentDay = recommendation.days[diaVisible - 1];

  const indiceActividad = Math.min(
    Math.max(currentProgress.currentActivityIndex, 0),
    currentDay.activities.length - 1
  );
  const currentActivity = currentDay.activities[indiceActividad];
  const isLastActivityOfDay =
    indiceActividad === currentDay.activities.length - 1;
  const hasCountdown =
    currentProgress.countdown !== null &&
    currentProgress.countdown !== undefined;

  if (hasCountdown) {
    return (
      <div className="bg-blue-50 p-4 sm:p-6 rounded-lg border border-blue-200">
        <div className="text-center">
          <h3 className="text-lg sm:text-xl font-bold text-green-700 mb-3 sm:mb-4">
            ¡Felicidades!
          </h3>
          <p className="text-base sm:text-lg mb-3 sm:mb-4">
            Has completado todas las actividades del Día{" "}
            {diaVisible}.
          </p>
          <p className="text-base sm:text-lg mb-4 sm:mb-6">
            Las actividades del Día {diaVisible + 1} estarán
            disponibles en:
          </p>
          <div className="text-2xl sm:text-3xl font-bold text-blue-700 mb-4 sm:mb-6">
            <CountdownDisplay
              countdownStartTime={currentProgress.countdownStartTime!}
              onComplete={() => onCountdownComplete(modeKey, recommendation.id)}
            />
          </div>

          {/* Botones de navegación */}
          <NavegacionPreguntas
            modeKey={modeKey}
            userTestAnswers={userTestAnswers}
            currentQuestionIndex={currentQuestionIndex}
            onQuestionChange={onQuestionChange}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200">
      <h3 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">
        Día {diaVisible} de {totalDias}
      </h3>

      {currentActivity && (
        <div className="mb-4 sm:mb-6">
          <h4 className="text-base sm:text-lg font-semibold mb-2">
            {currentActivity.title}
          </h4>
          <CuerpoDeActividad cuerpo={currentActivity.cuerpo} />

          <OptimizedButton
            onClick={() => onCompleteActivity(modeKey, recommendation.id)}
            className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm sm:text-base"
          >
            {isLastActivityOfDay
              ? "Culminar Día"
              : "Marcar Actividad Completada"}
          </OptimizedButton>
        </div>
      )}

      {/* Progreso del día */}
      <div className="mb-3 sm:mb-4">
        <div className="flex justify-between text-xs sm:text-sm text-gray-600 mb-2">
          <span>Progreso del día:</span>
          <span>
            {indiceActividad + 1} de{" "}
            {currentDay.activities.length}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{
              width: `${
                ((indiceActividad + 1) /
                  currentDay.activities.length) *
                100
              }%`,
            }}
          />
        </div>
      </div>
    </div>
  );
});
DayActivitiesRenderer.displayName = "DayActivitiesRenderer";

interface RecommendationDisplayProps extends NavegacionProps {
  recommendation: RecommendationItem;
  currentProgress?: ActivityProgress;
  onCompleteActivity: (modeKey: string, recommendationId: string) => void;
  onCountdownComplete: (modeKey: string, recommendationId: string) => void;
}

const RecommendationDisplay = memo<RecommendationDisplayProps>((props) => {
  const {
    recommendation,
    modeKey,
    currentProgress,
    userTestAnswers,
    currentQuestionIndex,
    onQuestionChange,
  } = props;

  if (!currentProgress) return null;

  if (currentProgress.isCompleted) {
    return (
      <div className="bg-green-50 p-4 sm:p-6 rounded-lg border border-green-200">
        <h3 className="text-lg sm:text-xl font-bold text-green-700 mb-2">
          {recommendation.title}
        </h3>
        <p className="text-green-600 mb-3 sm:mb-4 text-sm sm:text-base">
          ¡Has completado todas las actividades de esta recomendación!
        </p>

        {/* Botones de navegación siempre visibles */}
        <NavegacionPreguntas
          modeKey={modeKey}
          userTestAnswers={userTestAnswers}
          currentQuestionIndex={currentQuestionIndex}
          onQuestionChange={onQuestionChange}
        />
      </div>
    );
  }

  return (
    <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200 mb-4 sm:mb-6">
      <p className="text-xs sm:text-sm text-gray-500 mb-1">
        Ítem {recommendation.relatedQuestion}
      </p>
      <h3 className="text-lg sm:text-xl font-bold mb-3">
        {recommendation.title}
      </h3>

      {recommendation.days && (
        <DayActivitiesRenderer {...props} currentProgress={currentProgress} />
      )}
    </div>
  );
});
RecommendationDisplay.displayName = "RecommendationDisplay";

export const ResultsDisplay = ({ userId }: Props) => {
  const router = useRouter();
  const [results, setResults] = useState<Results | null>(null);
  const [total, setTotal] = useState<TotalScore | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userTestAnswers, setUserTestAnswers] = useState<Answers | null>(null);
  const [recommendationStatus, setRecommendationStatus] =
    useState<RecommendationStatus>({});
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [currentFeedbackRec, setCurrentFeedbackRec] =
    useState<RecommendationItem | null>(null);
  const [hasRetakenTest, setHasRetakenTest] = useState(false);
  // Intento que se está mostrando. `hasRetakenTest` dice si la persona llegó a
  // repetir el test; esto dice en cuál de las dos casillas hay que escribir, y
  // no es lo mismo mientras el segundo intento no se haya enviado.
  const [esSegundoIntento, setEsSegundoIntento] = useState(false);
  const [feedbackAnswers, setFeedbackAnswers] = useState<
    Record<string, boolean>
  >({});
  // Se intentó enviar la retroalimentación con preguntas sin responder. Antes
  // se avisaba con un alert() del navegador; ahora el aviso va dentro del
  // propio cuadro y marca las preguntas que faltan.
  const [faltanRespuestas, setFaltanRespuestas] = useState(false);
  const [currentModeIndex, setCurrentModeIndex] = useState(0);

  // Temporizadores activos
  const activeTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Función para limpiar temporizadores expirados y actualizar el estado
  const cleanupExpiredTimers = useCallback(() => {
    setRecommendationStatus((prev) => {
      let hasChanges = false;
      const updatedStatus: RecommendationStatus = {};

      // Copia en profundidad hasta el nivel que se modifica. Antes se hacía
      // `{ ...prev }` y luego se escribía dentro de `prev[mode]`, que la copia
      // superficial comparte: el actualizador mutaba el estado anterior. React
      // los invoca dos veces en desarrollo precisamente para destapar eso, y
      // un actualizador impuro puede dar resultados distintos entre pasadas.
      Object.keys(prev).forEach((mode) => {
        const modeData = prev[mode];
        const progresos = { ...(modeData?.recommendationProgress ?? {}) };

        Object.keys(progresos).forEach((recommendationId) => {
          const progress = progresos[recommendationId];
          if (!progress?.countdownStartTime) return;

          const elapsed = Math.floor(
            (Date.now() - progress.countdownStartTime) / 1000
          );
          if (UNLOCK_DELAY_SECONDS - elapsed > 0) return;

          // La espera se agotó mientras esta recomendación no estaba a la
          // vista: se abre el día siguiente.
          progresos[recommendationId] = {
            ...progress,
            countdown: null,
            countdownStartTime: null,
            currentDay: progress.currentDay + 1,
            currentActivityIndex: 0,
          };
          hasChanges = true;

          const timerKey = `${mode}-${recommendationId}`;
          const timer = activeTimers.current.get(timerKey);
          if (timer) {
            clearTimeout(timer);
            activeTimers.current.delete(timerKey);
          }
        });

        updatedStatus[mode] = { ...modeData, recommendationProgress: progresos };
      });

      return hasChanges ? updatedStatus : prev;
    });
  }, []);

  // Limpiar temporizadores al desmontar y limpiar temporizadores expirados
  useEffect(() => {
    // Limpiar temporizadores expirados al montar el componente
    cleanupExpiredTimers();

    // Limpiar temporizadores expirados cada 30 segundos
    const cleanupInterval = setInterval(cleanupExpiredTimers, 30000);

    // Los temporizadores los limpia el efecto de abajo, que copia la
    // referencia al montar; leer activeTimers.current aquí dentro daría el
    // valor del momento del desmontaje, no el que este efecto vio.
    return () => clearInterval(cleanupInterval);
  }, [cleanupExpiredTimers]);

  // Función para limpiar temporizadores al desmontar
  useEffect(() => {
    const timers = activeTimers.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, []);

  // Función para iniciar un temporizador - optimizada con useCallback
  const startTimer = useCallback(
    (
      mode: string,
      recommendationId: string,
      duration: number = UNLOCK_DELAY_SECONDS
    ) => {
      const timerKey = `${mode}-${recommendationId}`;

      // Limpiar temporizador existente si lo hay
      if (activeTimers.current.has(timerKey)) {
        clearTimeout(activeTimers.current.get(timerKey)!);
      }

      // Actualizar estado con el tiempo inicial
      setRecommendationStatus((prev) => ({
        ...prev,
        [mode]: {
          ...prev[mode],
          recommendationProgress: {
            ...(prev[mode]?.recommendationProgress || {}),
            [recommendationId]: {
              ...(prev[mode]?.recommendationProgress?.[recommendationId] || {}),
              countdown: duration,
              countdownStartTime: Date.now(),
            },
          },
        },
      }));

      // El CountdownDisplay se encarga de mostrar el tiempo y completar
      // automáticamente. Solo hay que limpiar el temporizador al terminar.
      const timer = setTimeout(() => {
        activeTimers.current.delete(timerKey);
      }, duration * 1000);

      activeTimers.current.set(timerKey, timer);
    },
    []
  );

  // Función para completar una actividad - optimizada con useCallback
  const completeActivity = useCallback(
    async (mode: string, recommendationId: string) => {
      const currentProgress =
        recommendationStatus[mode]?.recommendationProgress?.[recommendationId];
      if (!currentProgress) return;

      if (!userTestAnswers) return;

      const recommendation = getRecommendationsForMode(
        mode as Mode,
        recommendationStatus[mode]?.modeLevel || "BAJO",
        userTestAnswers
      ).find((rec) => rec.id === recommendationId);

      if (!recommendation?.days) return;

      const currentDay = recommendation.days[currentProgress.currentDay - 1];
      if (!currentDay) return;

      const nextActivityIndex = currentProgress.currentActivityIndex + 1;
      const isLastActivityOfDay =
        nextActivityIndex >= currentDay.activities.length;
      const isLastDay =
        currentProgress.currentDay >= recommendation.days.length;
      // Una recomendación queda completa cuando se acaba la última actividad
      // DEL ÚLTIMO día, no cuando se empieza ese día. La escritura de abajo
      // guardaba `isCompleted: isLastDay`, así que marcar la primera actividad
      // del último día la daba por terminada en Firestore: al recargar
      // aparecía con el ✅ y el día a medias, la retroalimentación no se
      // llegaba a pedir nunca y `testAccess.progresoDeActividades` —que cuenta
      // este mismo campo— abría el segundo intento sin que la persona hubiera
      // hecho la intervención que ese intento existe para medir.
      const recomendacionCompletada = isLastActivityOfDay && isLastDay;

      // Confeti proporcional a lo que se acaba de completar.
      if (recomendacionCompletada) celebrarRecomendacion();
      else if (isLastActivityOfDay) celebrarDia();
      else celebrarActividad();

      if (isLastActivityOfDay) {
        if (isLastDay) {
          // Completar toda la recomendación
          setRecommendationStatus((prev) => ({
            ...prev,
            [mode]: {
              ...prev[mode],
              recommendationProgress: {
                ...(prev[mode]?.recommendationProgress || {}),
                [recommendationId]: {
                  ...currentProgress,
                  isCompleted: true,
                  countdown: null,
                  countdownStartTime: null,
                },
              },
            },
          }));

          // Mostrar feedback si existe. El ítem 9 no trae preguntas de
          // retroalimentación en el programa, así que ahí no se abre el modal.
          if (recommendation.feedbackQuestions?.length) {
            setCurrentFeedbackRec(recommendation);
            setFeedbackAnswers({});
            setFaltanRespuestas(false);
            setShowFeedbackModal(true);
          }
        } else {
          // Iniciar temporizador para el siguiente día
          startTimer(mode, recommendationId, UNLOCK_DELAY_SECONDS);
        }
      } else {
        // Avanzar a la siguiente actividad del mismo día
        setRecommendationStatus((prev) => ({
          ...prev,
          [mode]: {
            ...prev[mode],
            recommendationProgress: {
              ...(prev[mode]?.recommendationProgress || {}),
              [recommendationId]: {
                ...currentProgress,
                currentActivityIndex: nextActivityIndex,
              },
            },
          },
        }));
      }

      // Guardar en Firebase
      try {
        const userRef = doc(db, "users", userId);
        await updateDoc(userRef, {
          [`recommendationProgress.${mode}.recommendationProgress.${recommendationId}`]:
            {
              currentDay: currentProgress.currentDay,
              currentActivityIndex: isLastActivityOfDay ? 0 : nextActivityIndex,
              completedActivities: [
                ...(currentProgress.completedActivities || []),
                currentProgress.currentActivityIndex,
              ],
              isCompleted: recomendacionCompletada,
              countdown:
                isLastActivityOfDay && !isLastDay ? UNLOCK_DELAY_SECONDS : null,
              countdownStartTime:
                isLastActivityOfDay && !isLastDay ? Date.now() : null,
            },
        });
      } catch (error) {
        console.error("Error saving activity progress:", error);
      }
    },
    [recommendationStatus, userTestAnswers, startTimer, userId]
  );

  // Los dos callbacks siguientes se pasan a los componentes de recomendación.
  // Van con useCallback y reciben el modo por argumento en lugar de capturarlo:
  // así mantienen la misma identidad entre renders y el memo de los hijos
  // evita volver a dibujarlos.
  //
  // El ítem en el que se quedó la persona se guarda en Firestore. El cargador
  // lo lee —y lo clampea—, pero antes nadie lo escribía: el índice vivía solo
  // en memoria, así que al recargar /results se volvía siempre al primer ítem
  // bajo del modo y había que rehacer toda la navegación. La escritura no
  // bloquea la navegación: el estado local ya cambió, y si el guardado falla lo
  // único que se pierde es la posición al recargar.
  const handleQuestionChange = useCallback(
    (modeKey: string, index: number) => {
      setRecommendationStatus((prev) => ({
        ...prev,
        [modeKey]: { ...prev[modeKey], currentQuestionIndex: index },
      }));

      updateDoc(doc(db, "users", userId), {
        [`recommendationProgress.${modeKey}.currentQuestionIndex`]: index,
      }).catch((error) => {
        console.error("Error saving current question index:", error);
      });
    },
    [userId]
  );

  // Al agotarse la espera se abre el día siguiente. Se parte de `prev` y no
  // del progreso capturado al renderizar, que puede haber quedado atrás.
  const handleCountdownComplete = useCallback(
    (modeKey: string, recommendationId: string) => {
      setRecommendationStatus((prev) => {
        const progress =
          prev[modeKey]?.recommendationProgress?.[recommendationId];
        if (!progress) return prev;

        // Sin cuenta atrás activa no hay nada que desbloquear. Esta guardia es
        // lo que hace la operación idempotente: hay dos caminos que abren el
        // día siguiente —este, cuando se agota el temporizador en pantalla, y
        // `cleanupExpiredTimers`, que barre los que caducaron sin estar a la
        // vista—, y si los dos actúan sobre la misma recomendación el día
        // avanzaba dos veces y se salía del plan.
        if (progress.countdown === null || progress.countdown === undefined) {
          return prev;
        }

        return {
          ...prev,
          [modeKey]: {
            ...prev[modeKey],
            recommendationProgress: {
              ...prev[modeKey].recommendationProgress,
              [recommendationId]: {
                ...progress,
                countdown: null,
                countdownStartTime: null,
                currentDay: progress.currentDay + 1,
                currentActivityIndex: 0,
              },
            },
          },
        };
      });
    },
    []
  );

  const saveResultsToFirebase = useCallback(
    async (resultsData: Results, totalData: TotalScore) => {
      try {
        const userRef = doc(db, "users", userId);

        const testResults = {
          responsable: {
            score: resultsData.responsable.score,
            level: resultsData.responsable.level,
          },
          organizado: {
            score: resultsData.organizado.score,
            level: resultsData.organizado.level,
          },
          activadorFisiologico: {
            score: resultsData.activadorFisiologico.score,
            level: resultsData.activadorFisiologico.level,
          },
          // El modo de afronte total tiene su propia escala de 0 a 120: se
          // guarda calculado para que el panel del administrador no tenga que
          // volver a sumarlo y pueda exportarlo directamente.
          total: { score: totalData.score, level: totalData.level },
        };

        // Verificar si es una retoma del test para determinar dónde guardar
        const userDoc = await getDoc(userRef);
        const userData = userDoc.data();
        const isRetake = userData?.hasRetakenTest === true;

        // Solo los resultados: las respuestas ya las guardó TestForm y
        // sobrescribirlas aquí las pisaría.
        await updateDoc(
          userRef,
          isRetake ? { testResults2: testResults } : { testResults }
        );
      } catch (err) {
        console.error("Error saving results:", err);
        setError(
          "Hubo un error al guardar tus resultados. Por favor, inténtalo de nuevo."
        );
      }
    },
    [userId]
  );

  const handleFeedbackSubmit = useCallback(
    (questionKey: string, answer: boolean) => {
      setFeedbackAnswers((prev) => ({ ...prev, [questionKey]: answer }));
    },
    []
  );

  const submitAllFeedback = useCallback(async () => {
    if (!currentFeedbackRec || !currentFeedbackRec.feedbackQuestions) return;

    const allAnswered = currentFeedbackRec.feedbackQuestions.every((q) =>
      Object.prototype.hasOwnProperty.call(feedbackAnswers, q.key)
    );

    if (allAnswered) {
      try {
        const userRef = doc(db, "users", userId);
        // Con sufijo, como el resto de los campos por intento. Sin él, una
        // recomendación que reaparecía en el segundo intento —cosa probable,
        // porque se activan según los ítems bajos— pisaba en silencio la
        // retroalimentación que la persona había dado en el primero.
        const sufijo = esSegundoIntento ? "2" : "";
        await updateDoc(userRef, {
          [`activityFeedback${sufijo}.${currentFeedbackRec.id}`]:
            feedbackAnswers,
        });
      } catch (error) {
        console.error("Error saving activity feedback:", error);
      }
      setShowFeedbackModal(false);
      setCurrentFeedbackRec(null);
      setFeedbackAnswers({});
    } else {
      setFaltanRespuestas(true);
    }
  }, [currentFeedbackRec, feedbackAnswers, userId, esSegundoIntento]);

  useEffect(() => {
    const fetchAndProcessResults = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", userId));
        const userData = userDoc.data();

        // Un segundo intento marcado pero todavía sin enviar no es un segundo
        // intento: `answers2` aún no existe. Mirar solo `hasRetakenTest` dejaba
        // esta pantalla en "No se encontraron respuestas del test" a quien
        // pulsaba repetir y abandonaba antes de terminar, escondiéndole los
        // resultados del primer intento, que siguen intactos.
        const isRetake =
          userData?.hasRetakenTest === true && !!userData?.answers2;
        setEsSegundoIntento(isRetake);
        const answers: Answers | undefined = isRetake
          ? userData?.answers2
          : userData?.answers;

        if (!answers) {
          setError("No se encontraron respuestas del test");
          return;
        }

        setUserTestAnswers(answers);

        const calculatedResults = calculateResults(answers);
        const calculatedTotal = calculateTotal(answers);
        setResults(calculatedResults);
        setTotal(calculatedTotal);

        // Los resultados se escriben una sola vez por intento, con la clave
        // vigente en ese momento. TestForm guarda las respuestas, no los
        // resultados: se guardan aquí la primera vez que se muestran.
        const existingResults = isRetake
          ? userData?.testResults2
          : userData?.testResults;

        if (!existingResults) {
          await saveResultsToFirebase(calculatedResults, calculatedTotal);
        }

        const savedRecommendationProgress =
          userData?.recommendationProgress || {};

        const initialRecommendationStatus: RecommendationStatus = {};
        MODES.forEach((mode) => {
          const modeLevel = calculatedResults[mode].level;
          const recs = getRecommendationsForMode(mode, modeLevel, answers);

          const modeRecProgress: { [id: string]: ActivityProgress } = {};
          recs.forEach((rec) => {
            const savedRecData =
              savedRecommendationProgress[mode]?.recommendationProgress?.[
                rec.id
              ];
            modeRecProgress[rec.id] = {
              currentDay: savedRecData?.currentDay ?? 1,
              currentActivityIndex: savedRecData?.currentActivityIndex ?? 0,
              completedActivities: savedRecData?.completedActivities ?? [],
              isCompleted: savedRecData?.isCompleted ?? false,
              countdown: savedRecData?.countdown ?? null,
              countdownStartTime: savedRecData?.countdownStartTime ?? null,
            };

            // Reiniciar temporizadores si hay countdown activo
            if (savedRecData?.countdownStartTime) {
              const elapsed = Math.floor(
                (Date.now() - savedRecData.countdownStartTime) / 1000
              );
              const remaining = Math.max(0, UNLOCK_DELAY_SECONDS - elapsed);

              if (remaining > 0) {
                startTimer(mode, rec.id, UNLOCK_DELAY_SECONDS);
              } else {
                // Si el tiempo ya expiró, desbloquear el siguiente día
                modeRecProgress[rec.id] = {
                  ...modeRecProgress[rec.id],
                  countdown: null,
                  countdownStartTime: null,
                  currentDay: (savedRecData.currentDay || 1) + 1,
                  currentActivityIndex: 0,
                };
              }
            }
          });

          // Índice del ítem en el que se quedó la persona:
          // 1) si hay valor guardado, ese, clampeado al rango del modo;
          // 2) si no, el primer ítem del modo respondido con 1 o 2.
          const savedIndex =
            savedRecommendationProgress[mode]?.currentQuestionIndex;
          const questionNums = modeQuestions[mode];
          let firstLowIndex = questionNums.findIndex((qn) => {
            const answer = answers[qn];
            return (
              answer !== undefined && answer <= ITEM_INTERVENTION_MAX_SCORE
            );
          });
          if (firstLowIndex === -1) firstLowIndex = 0;

          let initialIndex =
            typeof savedIndex === "number" ? savedIndex : firstLowIndex;
          if (initialIndex < 0) initialIndex = 0;
          if (initialIndex > questionNums.length - 1) {
            initialIndex = questionNums.length - 1;
          }

          initialRecommendationStatus[mode] = {
            userAnswers: answers,
            modeLevel,
            recommendationProgress: modeRecProgress,
            currentQuestionIndex: initialIndex,
          };
        });
        setRecommendationStatus(initialRecommendationStatus);
      } catch (error) {
        console.error("Error processing results:", error);
        setError("Hubo un error al procesar tus resultados.");
      }
    };

    fetchAndProcessResults();
  }, [userId, saveResultsToFirebase, startTimer]);

  // Efecto independiente para asegurar sincronización de hasRetakenTest
  useEffect(() => {
    const fetchHasRetakenTest = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", userId));
        const userData = userDoc.data();
        if (userData) {
          setHasRetakenTest(userData.hasRetakenTest ?? false);
        }
      } catch (err) {
        console.error("Error fetching hasRetakenTest:", err);
      }
    };
    fetchHasRetakenTest();
  }, [userId]);

  const getLevelClass = useCallback((level: string): string => {
    if (level === "ALTO") return "bg-green-100 text-green-800";
    if (level === "MEDIO") return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  }, []);

  const getLevelColor = useCallback((level: Level): string => {
    switch (level) {
      case "ALTO":
        return "text-green-500";
      case "MEDIO":
        return "text-yellow-500";
      case "BAJO":
        return "text-red-500";
      default:
        return "";
    }
  }, []);

  // Progreso dentro de un modo, contando solo los ítems que abrieron
  // actividades (los respondidos con 1 o 2).
  const calculateRealProgress = useCallback(
    (mode: string) => {
      if (!userTestAnswers) {
        return {
          totalItemsConActividades: 0,
          completados: 0,
          currentQuestionIndex: 0,
        };
      }

      const allQuestions = modeQuestions[mode as Mode];
      const currentQuestionIndex =
        recommendationStatus[mode]?.currentQuestionIndex || 0;

      let totalItemsConActividades = 0;
      let completados = 0;

      for (let i = 0; i < allQuestions.length; i++) {
        const answer = userTestAnswers[allQuestions[i]];
        if (answer !== undefined && answer <= ITEM_INTERVENTION_MAX_SCORE) {
          totalItemsConActividades++;
          if (i < currentQuestionIndex) completados++;
        }
      }

      return { totalItemsConActividades, completados, currentQuestionIndex };
    },
    [recommendationStatus, userTestAnswers]
  );

  // Al panel, no al test. Allí se le ofrecen las dos opciones —consultar sus
  // resultados o empezar el segundo intento— y es ese botón el que marca
  // `hasRetakenTest`. Antes se marcaba aquí y se navegaba directo al test: si
  // la persona lo dejaba a medias, quedaba con la marca puesta y un segundo
  // intento vacío.
  const handleResetTest = useCallback(() => {
    localStorage.removeItem("testAnswers");
    localStorage.removeItem("testStartTime");
    router.push("/dashboard/user");
  }, [router]);

  const handleCloseFeedbackModal = useCallback(() => {
    setShowFeedbackModal(false);
  }, []);

  const handleNextMode = useCallback(() => {
    setCurrentModeIndex((prev) => Math.min(prev + 1, MODES.length - 1));
  }, []);

  const handlePrevMode = useCallback(() => {
    setCurrentModeIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  const currentMode = MODES[currentModeIndex];
  const currentModeData = results?.[currentMode];
  const currentModeStatus = recommendationStatus?.[currentMode];

  // Cuántas actividades le quedan por hacer en cada modo. Es la base de todos
  // los avisos de abajo: la pantalla ya sabe exactamente dónde falta trabajo,
  // así que puede decirlo en lugar de pedirle a la persona que lo busque.
  const pendientesPorModo = useMemo(() => {
    const pendientes: Record<string, number> = {};
    for (const mode of MODES) {
      const modeData = results?.[mode];
      const modeStatus = recommendationStatus?.[mode];
      if (!modeData || !modeStatus || modeData.level !== "BAJO") {
        pendientes[mode] = 0;
        continue;
      }
      const recomendaciones = getRecommendationsForMode(
        mode,
        modeData.level,
        userTestAnswers || {}
      );
      pendientes[mode] = recomendaciones.filter(
        (rec) => modeStatus.recommendationProgress?.[rec.id]?.isCompleted !== true
      ).length;
    }
    return pendientes;
  }, [results, recommendationStatus, userTestAnswers]);

  // Modos con trabajo pendiente, incluido el que se está viendo. Los otros
  // cubren el caso de quien llega al último modo, lo ve sin actividades porque
  // le salió ALTO, y da por terminado el programa cuando le quedan actividades
  // en los modos por los que ya pasó. El actual cubre el de quien termina el
  // último ítem de un modo y cree acabado el modo entero, sin pulsar
  // "Anterior", donde todavía le quedan.
  const modosPendientes = useMemo(
    () => MODES.filter((mode) => pendientesPorModo[mode] > 0),
    [pendientesPorModo]
  );

  // Adónde llevan los botones del aviso en cada modo. Una actividad pendiente
  // puede estar DISPONIBLE o EN ESPERA de las 12 horas que separan un día del
  // siguiente. Mandar a la persona a una en espera la deja sin nada que hacer,
  // así que los botones saltan a la siguiente disponible:
  //
  //   · `destino`: ítem al que saltar, buscando hacia delante desde el que se
  //     ve y volviendo al principio al llegar al final, para que pulsar varias
  //     veces recorra todas. null si el ítem que se ve ya es uno disponible
  //     —no hay adónde ir— o si no queda ninguno disponible.
  //   · `todasEnEspera`: quedan pendientes pero ninguna se puede hacer ahora.
  //     Entonces `proximoDesbloqueo` dice cuándo se abre la primera, y
  //     `destino` lleva a ella —no a la siguiente en orden—: como ninguna otra
  //     se abre antes, la persona no se queda mirando una en espera mientras
  //     otra ya está libre. Si ya la está viendo, `destino` es null.
  const navegacionPendientes = useMemo(() => {
    const info: Record<
      string,
      {
        destino: number | null;
        todasEnEspera: boolean;
        proximoDesbloqueo: Date | null;
      }
    > = {};
    const ahora = Date.now();
    for (const mode of MODES) {
      info[mode] = { destino: null, todasEnEspera: false, proximoDesbloqueo: null };
      const modeData = results?.[mode];
      const modeStatus = recommendationStatus?.[mode];
      if (!userTestAnswers || !modeData || !modeStatus || modeData.level !== "BAJO") {
        continue;
      }

      const recomendaciones = getRecommendationsForMode(
        mode,
        modeData.level,
        userTestAnswers
      );
      const progresoDe = (questionNum: number) => {
        const rec = recomendaciones.find(
          (r) => r.relatedQuestion === questionNum
        );
        return rec ? modeStatus.recommendationProgress?.[rec.id] : undefined;
      };
      // Una espera que ya venció cuenta como disponible aunque la limpieza
      // periódica aún no la haya abierto: al llegar a ella, su tarjeta la
      // abre en el acto.
      const desbloqueoPendiente = (questionNum: number): Date | null => {
        const progreso = progresoDe(questionNum);
        if (progreso?.countdown === null || progreso?.countdown === undefined) {
          return null;
        }
        if (!progreso.countdownStartTime) return null;
        const momento = momentoDeDesbloqueo(progreso.countdownStartTime);
        return momento.getTime() > ahora ? momento : null;
      };
      const disponible = (questionNum: number) => {
        const progreso = progresoDe(questionNum);
        return (
          !!progreso &&
          progreso.isCompleted !== true &&
          desbloqueoPendiente(questionNum) === null
        );
      };

      const preguntas = modeQuestions[mode];
      const indiceVisible = Math.min(
        Math.max(modeStatus.currentQuestionIndex ?? 0, 0),
        preguntas.length - 1
      );

      if (!preguntas.some(disponible)) {
        if (pendientesPorModo[mode] === 0) continue;
        info[mode].todasEnEspera = true;

        let primero: number | null = null;
        preguntas.forEach((questionNum, indice) => {
          const momento = desbloqueoPendiente(questionNum);
          if (!momento) return;
          if (
            info[mode].proximoDesbloqueo === null ||
            momento < info[mode].proximoDesbloqueo!
          ) {
            info[mode].proximoDesbloqueo = momento;
            primero = indice;
          }
        });
        info[mode].destino = primero === indiceVisible ? null : primero;
        continue;
      }

      if (disponible(preguntas[indiceVisible])) continue;

      for (let paso = 1; paso <= preguntas.length; paso++) {
        const indice = (indiceVisible + paso) % preguntas.length;
        if (disponible(preguntas[indice])) {
          info[mode].destino = indice;
          break;
        }
      }
    }
    return info;
  }, [results, recommendationStatus, userTestAnswers, pendientesPorModo]);

  // ¿Están completas todas las actividades de todos los modos?
  const areAllModesCompleted = useCallback(() => {
    return MODES.every((mode) => {
      const modeData = results?.[mode];
      const modeStatus = recommendationStatus?.[mode];

      if (!modeData || !modeStatus) return false;
      if (modeData.level !== "BAJO") return true;

      const recommendations = getRecommendationsForMode(
        mode,
        modeData.level,
        userTestAnswers || {}
      );

      return recommendations.every(
        (rec) => modeStatus.recommendationProgress?.[rec.id]?.isCompleted === true
      );
    });
  }, [results, recommendationStatus, userTestAnswers]);

  // Confeti de fin de programa: solo cuando se completa DURANTE la sesión, al
  // pasar de "quedan actividades" a "no queda ninguna". Quien entra con todo ya
  // hecho no lo vuelve a ver en cada recarga. El primer valor tras la carga se
  // toma como punto de partida y no celebra.
  //
  // Se espera al progreso y no solo a `results`: los resultados se fijan antes
  // de leer el progreso, y tomar ese instante como partida hacía celebrar al
  // recargar con todo hecho.
  const progresoCargado =
    !!results && Object.keys(recommendationStatus).length > 0;
  const programaCompleto = progresoCargado && areAllModesCompleted();
  const programaCompletoAntes = useRef<boolean | null>(null);
  useEffect(() => {
    if (!progresoCargado) return;
    const antes = programaCompletoAntes.current;
    programaCompletoAntes.current = programaCompleto;
    if (antes === false && programaCompleto) celebrarPrograma();
  }, [programaCompleto, progresoCargado]);

  const isCurrentModeCompleted = useCallback(() => {
    if (!currentModeData || !currentModeStatus) return false;
    if (currentModeData.level !== "BAJO") return true;

    const recommendations = getRecommendationsForMode(
      currentMode,
      currentModeData.level,
      userTestAnswers || {}
    );

    return recommendations.every(
      (rec) =>
        currentModeStatus.recommendationProgress?.[rec.id]?.isCompleted === true
    );
  }, [currentModeData, currentModeStatus, currentMode, userTestAnswers]);

  // ¿Ningún modo salió bajo? Entonces no hay plan que seguir: el programa está
  // pensado para trabajar con quien obtuvo afrontamiento bajo.
  const ningunModoBajo = useMemo(() => {
    if (!results) return false;
    return MODES.every((mode) => results[mode].level !== "BAJO");
  }, [results]);

  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-4 sm:p-6">
        <div className="bg-red-100 border-l-4 border-red-500 p-3 sm:p-4 rounded">
          <p className="text-red-700 text-sm sm:text-base">{error}</p>
        </div>
      </div>
    );
  }

  if (
    !results ||
    !total ||
    !userTestAnswers ||
    !recommendationStatus ||
    Object.keys(recommendationStatus).length === 0
  ) {
    return (
      <div className="text-center text-white text-sm sm:text-base">
        Cargando resultados y recomendaciones...
      </div>
    );
  }

  return (
    <div className="w-full px-2 sm:px-4">
      <h1 className="text-2xl sm:text-3xl font-bold text-center mb-6 sm:mb-8 text-white">
        Resultados: modos de afrontamiento a la tensión académica
      </h1>

      <div className="text-center text-base sm:text-lg font-bold mb-4 sm:mb-6 bg-celeste rounded-lg border border-gray-300 p-3 sm:p-4 shadow-sm w-full">
        Modo de afronte total&nbsp;&nbsp;
        <span className={getLevelColor(total.level)}>{total.level}</span>
        <span className="font-normal">
          &nbsp;&nbsp;({total.score} de {total.max})
        </span>
      </div>

      <PsychologicalProfile
        results={results}
        total={total}
        getLevelClass={getLevelClass}
      />

      {ningunModoBajo ? (
        <div className="mt-8 p-6 bg-white rounded-lg shadow-md max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-3 text-gray-800">
            Gracias por tu valiosa participación
          </h2>
          <p className="text-gray-700 text-base">
            Ninguno de tus modos de afrontamiento salió en nivel bajo, así que no
            se te asignan actividades. Sigue cuidando estas estrategias: son las
            que te permiten sostener la carga académica. Éxitos.
          </p>
        </div>
      ) : areAllModesCompleted() && hasRetakenTest ? (
        <div className="mt-8 p-6 bg-white rounded-lg shadow-md max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-3 text-gray-800">
            Gracias por tu valiosa participación
          </h2>
          <p className="text-gray-700 text-base">
            Gracias por tu esfuerzo en este segundo intento. Aunque los
            resultados no fueron los más óptimos, recuerda que siempre hay
            oportunidades para seguir mejorando la forma en que afrontas la
            tensión académica. ¡Confía en ti y continúa adelante!
          </p>
        </div>
      ) : (
        <>
          <h2 className="text-2xl sm:text-3xl font-bold text-center mt-6 mb-4 sm:mb-6 text-white">
            Orientaciones y recomendaciones a seguir
          </h2>

          {/* Indicador de progreso entre modos.
              Los puntos se pintan por el trabajo que queda, no por los modos
              por los que se ha pasado. Antes se ponían verdes con solo
              visitarlos, así que quien llegaba al último veía dos verdes
              detrás y daba por hecho que estaban terminados aunque tuviera
              actividades pendientes en ellos. Ahora ámbar es "quedan
              actividades" y verde es "no queda nada". */}
          <div className="mb-4 sm:mb-6">
            <div className="flex justify-center items-center gap-2 mb-3 sm:mb-4">
              {MODES.map((mode, index) => {
                const pendientes = pendientesPorModo[mode] ?? 0;
                const esActual = index === currentModeIndex;
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setCurrentModeIndex(index)}
                    aria-label={`${MODE_LABELS[mode]}: ${
                      pendientes > 0
                        ? `${pendientes} ${
                            pendientes === 1 ? "ítem pendiente" : "ítems pendientes"
                          }`
                        : "sin ítems pendientes"
                    }`}
                    aria-current={esActual ? "true" : undefined}
                    className={`rounded-full transition-all ${
                      esActual ? "w-4 h-4 sm:w-5 sm:h-5" : "w-3 h-3 sm:w-4 sm:h-4"
                    } ${pendientes > 0 ? "bg-amber-400" : "bg-green-500"} ${
                      esActual ? "ring-2 ring-white ring-offset-2 ring-offset-mi-color-rgb" : "opacity-80 hover:opacity-100"
                    }`}
                  />
                );
              })}
            </div>
            <p className="text-center text-white text-xs sm:text-sm">
              Modo {currentModeIndex + 1} de {MODES.length}:{" "}
              {MODE_LABELS[currentMode]}
            </p>
          </div>

          {/* Aviso de trabajo pendiente. No dice "revise las pestañas
              anteriores": dice en qué modos y cuántas actividades quedan, y
              lleva hasta allí. La pantalla ya tiene ese dato. */}
          {modosPendientes.length > 0 && (
            <div className="mb-4 sm:mb-6 bg-amber-100 border-l-4 border-amber-500 rounded-lg p-3 sm:p-4">
              <p className="font-bold text-amber-900 text-sm sm:text-base">
                Todavía te quedan actividades por hacer
              </p>
              <ul className="mt-2 space-y-2">
                {modosPendientes.map((mode) => {
                  const esActual = mode === currentMode;
                  const { destino, todasEnEspera, proximoDesbloqueo } =
                    navegacionPendientes[mode];
                  return (
                    <li
                      key={mode}
                      className="flex flex-wrap items-center justify-between gap-2"
                    >
                      <span className="text-amber-900 text-sm sm:text-base">
                        <strong>{MODE_LABELS[mode]}</strong>
                        {esActual ? " (estás aquí)" : ""}:{" "}
                        {pendientesPorModo[mode]}{" "}
                        {/* Cuenta ítems, no actividades sueltas: cada ítem
                            son dos días de actividades, y el número solo baja
                            al terminarlo entero. */}
                        {pendientesPorModo[mode] === 1
                          ? "ítem pendiente"
                          : "ítems pendientes"}
                        {todasEnEspera && proximoDesbloqueo
                          ? `. El próximo se desbloquea a las ${formatearDesbloqueo(
                              proximoDesbloqueo
                            )}`
                          : ""}
                      </span>
                      {esActual ? (
                        destino !== null && (
                          <button
                            type="button"
                            onClick={() => handleQuestionChange(mode, destino)}
                            className="px-3 py-1 bg-amber-600 text-white rounded-md hover:bg-amber-700 transition-colors text-xs sm:text-sm font-medium"
                          >
                            {todasEnEspera ? "Ver ese ítem" : "Ver actividad pendiente"}
                          </button>
                        )
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setCurrentModeIndex(MODES.indexOf(mode));
                            if (destino !== null) handleQuestionChange(mode, destino);
                          }}
                          className="px-3 py-1 bg-amber-600 text-white rounded-md hover:bg-amber-700 transition-colors text-xs sm:text-sm font-medium"
                        >
                          Ir a este modo
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Contenido del modo actual */}
          {currentModeData && currentModeStatus && (
            <div className="bg-celeste p-4 sm:p-6 rounded-lg shadow-lg w-full mb-4 sm:mb-6">
              <h3 className="text-lg sm:text-xl mb-3 sm:mb-4">
                Modo de afrontamiento {MODE_LABELS[currentMode].toLowerCase()}
              </h3>

              <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm sm:text-base">
                    Nivel:
                  </span>
                  <span
                    className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${getLevelClass(
                      currentModeData.level
                    )}`}
                  >
                    {currentModeData.level}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm sm:text-base">
                    Puntuación:
                  </span>
                  <span className="text-sm sm:text-base">
                    {currentModeData.score} / {currentModeData.max}
                  </span>
                </div>
              </div>

              {currentModeData.level !== "BAJO" ? (
                // Con nivel MEDIO o ALTO no se abren actividades: el programa
                // solo escribió orientaciones para el nivel bajo. Se muestra el
                // speech de interpretación y nada más.
                <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-white rounded-md">
                  <p className="text-gray-700 text-sm sm:text-base">
                    {modeSpeech(currentMode, currentModeData.level)}
                  </p>
                </div>
              ) : (
                <div>
                  <p className="mb-2 text-sm sm:text-base">
                    {modeSpeech(currentMode, currentModeData.level)}
                  </p>
                  <p className="mb-4 text-sm sm:text-base">{PLAN_INVITACION}</p>

                  {(() => {
                    const progress = calculateRealProgress(currentMode);
                    return progress.completados < progress.totalItemsConActividades;
                  })() ? (
                    <>
                      {getRecommendationsForMode(
                        currentMode,
                        currentModeData.level,
                        userTestAnswers
                      )
                        .filter((rec) => {
                          // Se clampea el índice antes de leer el número de
                          // ítem, para no salirse del rango del modo.
                          const questionsForMode = modeQuestions[currentMode];
                          const rawIndex =
                            currentModeStatus?.currentQuestionIndex ?? 0;
                          const clampedIndex = Math.min(
                            Math.max(rawIndex, 0),
                            questionsForMode.length - 1
                          );
                          return (
                            rec.relatedQuestion === questionsForMode[clampedIndex]
                          );
                        })
                        .map((rec) => (
                          <RecommendationDisplay
                            key={rec.id}
                            recommendation={rec}
                            modeKey={currentMode}
                            currentProgress={
                              currentModeStatus?.recommendationProgress?.[rec.id]
                            }
                            userTestAnswers={userTestAnswers}
                            currentQuestionIndex={
                              currentModeStatus?.currentQuestionIndex ?? 0
                            }
                            onQuestionChange={handleQuestionChange}
                            onCompleteActivity={completeActivity}
                            onCountdownComplete={handleCountdownComplete}
                          />
                        ))}
                    </>
                  ) : (
                    <div className="bg-green-100 border border-green-400 text-green-700 px-3 sm:px-4 py-3 rounded relative mb-4">
                      <p className="text-sm sm:text-base">
                        ¡Has completado todas las actividades de este modo!
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Navegación entre modos */}
          <div className="flex flex-col sm:flex-row justify-between items-center mb-4 sm:mb-6 space-y-3 sm:space-y-0">
            <button
              onClick={handlePrevMode}
              disabled={currentModeIndex === 0}
              className={`w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-medium transition-colors text-sm sm:text-base ${
                currentModeIndex === 0
                  ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              Modo anterior
            </button>

            <div className="text-center text-white text-xs sm:text-sm">
              {/* El mensaje habla solo de ESTE modo. Decía "Modo completado -
                  Puedes continuar", y con un aviso de pendientes justo encima
                  se leía como "ya has terminado todo": es la misma señal falsa
                  de remate que hacía creer el programa acabado. */}
              {isCurrentModeCompleted() ? (
                <div className="mb-2">
                  <span className="text-green-400">
                    ✓ Este modo no tiene actividades pendientes
                  </span>
                </div>
              ) : null}
            </div>

            <button
              onClick={handleNextMode}
              disabled={currentModeIndex === MODES.length - 1}
              className={`w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-medium transition-colors text-sm sm:text-base ${
                currentModeIndex === MODES.length - 1
                  ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                  : "bg-green-600 text-white hover:bg-green-700"
              }`}
            >
              Modo siguiente
            </button>
          </div>

          {/* Botón para repetir el test cuando todo esté completo */}
          {areAllModesCompleted() && hasRetakenTest === false && (
            <div className="mt-6 sm:mt-8 text-center">
              <div className="p-4 sm:p-6 bg-white rounded-lg shadow-md max-w-2xl mx-auto mb-4 sm:mb-6 space-y-3 text-gray-700 text-sm sm:text-base">
                {SPEECH_FINALIZACION.map((parrafo, i) => (
                  <p key={i}>{parrafo}</p>
                ))}
              </div>

              {/* Sin espera: terminar las actividades es la condición, y
                  acaba de cumplirla. */}
              <button
                onClick={handleResetTest}
                className="bg-blue-600 text-white px-6 sm:px-8 py-2 sm:py-3 rounded-lg hover:bg-blue-700 transition-colors text-base sm:text-lg font-medium"
              >
                Realizar Test Otra Vez
              </button>
            </div>
          )}
        </>
      )}

      {showFeedbackModal && currentFeedbackRec && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg sm:text-xl font-bold mb-1">
              Retroalimentación
            </h3>
            <p className="text-sm text-gray-600 mb-3 sm:mb-4">
              {questionText(currentFeedbackRec.relatedQuestion)}
            </p>
            {currentFeedbackRec.feedbackQuestions?.map((q) => {
              const sinResponder =
                faltanRespuestas &&
                !Object.prototype.hasOwnProperty.call(feedbackAnswers, q.key);
              return (
                <div
                  key={q.key}
                  className={`mb-3 sm:mb-4 rounded-md ${
                    sinResponder ? "border border-red-300 bg-red-50 p-2" : ""
                  }`}
                >
                  <p className="font-medium mb-2 text-sm sm:text-base">
                    {q.question}
                  </p>
                  <div className="flex space-x-4">
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        className="form-radio"
                        name={q.key}
                        value="true"
                        checked={feedbackAnswers[q.key] === true}
                        onChange={() => handleFeedbackSubmit(q.key, true)}
                      />
                      <span className="ml-2 text-sm sm:text-base">Sí</span>
                    </label>
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        className="form-radio"
                        name={q.key}
                        value="false"
                        checked={feedbackAnswers[q.key] === false}
                        onChange={() => handleFeedbackSubmit(q.key, false)}
                      />
                      <span className="ml-2 text-sm sm:text-base">No</span>
                    </label>
                  </div>
                </div>
              );
            })}
            {/* Se retira en cuanto no falta ninguna, sin esperar a que se
                vuelva a pulsar "Enviar". */}
            {faltanRespuestas &&
              currentFeedbackRec.feedbackQuestions?.some(
                (q) =>
                  !Object.prototype.hasOwnProperty.call(feedbackAnswers, q.key)
              ) && (
              <div
                role="alert"
                className="mt-2 rounded-md border-l-4 border-red-500 bg-red-50 p-3 text-sm text-red-800"
              >
                Por favor, responde a todas las preguntas de retroalimentación
                antes de continuar.
              </div>
            )}
            <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-4 mt-4 sm:mt-6">
              <button
                onClick={handleCloseFeedbackModal}
                className="px-3 sm:px-4 py-2 bg-gray-300 rounded-md hover:bg-gray-400 transition-colors text-sm sm:text-base"
              >
                Cerrar
              </button>
              <button
                onClick={submitAllFeedback}
                className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm sm:text-base"
              >
                Enviar Retroalimentación
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
