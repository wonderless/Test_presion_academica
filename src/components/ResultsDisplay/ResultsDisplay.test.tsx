// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { modeQuestions, questions } from "@/constants/questions";
import { getRecommendationsForMode, type Answers } from "@/lib/scoring";
import { ResultsDisplay } from "./ResultsDisplay";

const simulado = vi.hoisted(() => ({
  push: vi.fn(),
  updateDoc: vi.fn(async () => {}),
  userData: undefined as Record<string, unknown> | undefined,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: simulado.push }),
}));

vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
  default: (props: Record<string, unknown>) => <img {...props} />,
}));

vi.mock("@/lib/firebase/config", () => ({ db: {} }));

vi.mock("firebase/firestore", () => ({
  doc: (_db: unknown, coleccion: string, id: string) => ({
    path: `${coleccion}/${id}`,
  }),
  getDoc: async () => ({ data: () => simulado.userData }),
  updateDoc: simulado.updateDoc,
}));

// Sin sonidos ni confeti: no hay audio ni canvas en jsdom.
vi.mock("@/lib/sonido", () => ({
  reproducirEfecto: vi.fn(async () => true),
  sonarCierre: vi.fn(async () => {}),
  sonarCampanita: vi.fn(),
}));

vi.mock("@/lib/celebracion", () => ({
  celebrarActividad: vi.fn(),
  celebrarDia: vi.fn(),
  celebrarFelicitacion: vi.fn(),
  celebrarMedalla: vi.fn(),
  celebrarRecomendacion: vi.fn(),
  celebrarPrograma: vi.fn(),
  celebrarRetroalimentacion: vi.fn(),
}));

// El activador fisiológico en BAJO, con sus cuatro ítems en 1: abre cuatro
// actividades. Los otros dos modos, en ALTO.
const ANSWERS: Answers = Object.fromEntries(
  questions.map((q) => [
    q.id,
    modeQuestions.activadorFisiologico.includes(q.id) ? 1 : 5,
  ])
);
const SIN_MODOS_BAJOS: Answers = Object.fromEntries(
  questions.map((q) => [q.id, 5])
);
const MODO = "activadorFisiologico";
const RECS = getRecommendationsForMode(MODO, "BAJO", ANSWERS);

interface Progreso {
  currentDay: number;
  currentActivityIndex: number;
  completedActivities: number[];
  isCompleted: boolean;
  countdown: number | null;
  countdownStartTime: number | null;
}

const nueva = (): Progreso => ({
  currentDay: 1,
  currentActivityIndex: 0,
  completedActivities: [],
  isCompleted: false,
  countdown: null,
  countdownStartTime: null,
});
const hecha = (): Progreso => ({ ...nueva(), currentDay: 2, isCompleted: true });
const enEspera = (): Progreso => ({
  ...nueva(),
  countdown: 43200,
  countdownStartTime: Date.now() - 60_000,
});

const participante = (
  progresos: Progreso[],
  extra: Record<string, unknown> = {}
) => ({
  answers: ANSWERS,
  testResults: { ya: "guardados" },
  lastTestDate: { toDate: () => new Date() },
  hasRetakenTest: false,
  recommendationProgress: {
    [MODO]: {
      currentQuestionIndex: 0,
      recommendationProgress: Object.fromEntries(
        RECS.map((rec, i) => [rec.id, progresos[i]])
      ),
    },
  },
  ...extra,
});

const montar = async () => {
  render(<ResultsDisplay userId="u1" />);
  await screen.findByText(
    "Resultados: modos de afrontamiento a la tensión académica"
  );
};

const indiceDelItem = (i: number) =>
  modeQuestions[MODO].indexOf(RECS[i].relatedQuestion);

// Cuántas veces se guardó en Firestore el ítem visible de ese modo, y con qué.
const indicesGuardados = () =>
  simulado.updateDoc.mock.calls
    .map((llamada) => (llamada as unknown[])[1] as Record<string, unknown>)
    .map((datos) => datos[`recommendationProgress.${MODO}.currentQuestionIndex`])
    .filter((v) => v !== undefined);

beforeEach(() => {
  simulado.push.mockReset();
  simulado.updateDoc.mockReset();
  simulado.updateDoc.mockImplementation(async () => {});
  localStorage.clear();
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
});

afterEach(() => {
  cleanup();
});

describe("Panel 'Tu programa de actividades'", () => {
  it("el plan tiene las cuatro actividades del modo bajo", () => {
    expect(RECS).toHaveLength(4);
  });

  it("cuenta las completadas y lista cada actividad con su estado", async () => {
    simulado.userData = participante([hecha(), enEspera(), nueva(), nueva()]);
    await montar();

    expect(screen.getByText("Tu programa de actividades")).toBeTruthy();
    expect(screen.getByText("1 de 4 actividades")).toBeTruthy();
    expect(screen.getByText("Te faltan 3.")).toBeTruthy();
    // Ya no lleva el "X de Y días" arriba a la derecha.
    expect(screen.queryByText(/de \d+ días$/)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Ver todas mis actividades/ }));
    expect(screen.getByText("✓ Completada")).toBeTruthy();
    expect(screen.getByText(/⏳ Día 2 se abre a las/)).toBeTruthy();
    expect(screen.getAllByText("▶ Por empezar · Día 1 de 2")).toHaveLength(2);
  });

  it("'Continuar' lleva a la primera disponible, aunque esté en otro modo", async () => {
    simulado.userData = participante([hecha(), enEspera(), nueva(), nueva()]);
    await montar();

    // Se arranca en el primer modo, el responsable, que no tiene actividades.
    expect(screen.getByText("Modo 1 de 3: Responsable")).toBeTruthy();

    fireEvent.click(
      screen.getByRole("button", { name: /Continuar con mis actividades/ })
    );

    expect(screen.getByText("Modo 3 de 3: Activador fisiológico")).toBeTruthy();
    // Se salta la completada y la que está en espera.
    expect(indicesGuardados()).toEqual([indiceDelItem(2)]);
    expect(
      screen.getByRole("heading", { name: RECS[2].title })
    ).toBeTruthy();
    // La vista baja en el cuadro siguiente.
    await waitFor(() => expect(window.scrollTo).toHaveBeenCalled());
  });

  it("'Continuar' no mueve nada si la actividad visible ya está disponible", async () => {
    simulado.userData = participante([nueva(), nueva(), nueva(), nueva()]);
    await montar();
    fireEvent.click(
      screen.getByRole("button", { name: /Continuar con mis actividades/ })
    );
    expect(screen.getByText("Modo 3 de 3: Activador fisiológico")).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: RECS[0].title })
    ).toBeTruthy();
    // El ítem guardado ya era ese: no se reescribe.
    expect(indicesGuardados()).toEqual([]);

    fireEvent.click(
      screen.getByRole("button", { name: /Continuar con mis actividades/ })
    );
    expect(indicesGuardados()).toEqual([]);
  });

  it("una fila de la lista abre esa actividad y cierra la lista", async () => {
    simulado.userData = participante([nueva(), nueva(), nueva(), nueva()]);
    await montar();

    fireEvent.click(screen.getByRole("button", { name: /Ver todas mis actividades/ }));
    // La lista del panel es la que va justo después de "Ocultar la lista".
    const lista = screen.getByRole("button", { name: /Ocultar la lista/ })
      .nextElementSibling as HTMLElement;
    const filas = within(lista).getAllByRole("listitem");
    expect(filas).toHaveLength(4);

    fireEvent.click(within(filas[3]).getByRole("button"));

    expect(indicesGuardados()).toEqual([indiceDelItem(3)]);
    expect(screen.getByText("Modo 3 de 3: Activador fisiológico")).toBeTruthy();
    expect(screen.getByRole("heading", { name: RECS[3].title })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Ver todas mis actividades/ })).toBeTruthy();
  });

  it("con todo lo que queda en espera, dice a qué hora volver en vez del botón", async () => {
    simulado.userData = participante([hecha(), enEspera(), enEspera(), hecha()]);
    await montar();

    expect(screen.getByText(/Tu próxima actividad se abre a las/)).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: /Continuar con mis actividades/ })
    ).toBeNull();
  });

  it("no aparece si ningún modo salió bajo", async () => {
    simulado.userData = participante([], { answers: SIN_MODOS_BAJOS });
    await montar();
    expect(screen.queryByText("Tu programa de actividades")).toBeNull();
    expect(
      screen.getByText(/Ninguno de tus modos de afrontamiento salió en nivel bajo/)
    ).toBeTruthy();
  });
});

describe("Tarjetas de actividad", () => {
  it("los botones dicen 'Anterior actividad' y 'Siguiente actividad' y navegan", async () => {
    simulado.userData = participante([hecha(), nueva(), nueva(), nueva()]);
    await montar();
    fireEvent.click(screen.getByRole("button", { name: "Modo siguiente" }));
    fireEvent.click(screen.getByRole("button", { name: "Modo siguiente" }));

    // La primera está completada: su tarjeta muestra la navegación.
    expect(
      screen.getByText("¡Has completado todas las actividades de esta recomendación!")
    ).toBeTruthy();
    expect(
      (screen.getByRole("button", { name: "Anterior actividad" }) as HTMLButtonElement)
        .disabled
    ).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Siguiente actividad" }));
    expect(indicesGuardados()).toEqual([indiceDelItem(1)]);
    expect(screen.getByRole("heading", { name: RECS[1].title })).toBeTruthy();
  });

  it("'Seguir orientaciones' sigue igual: rojo, sin conteo, y abre el modo", async () => {
    simulado.userData = participante([nueva(), nueva(), nueva(), nueva()]);
    await montar();

    const boton = screen.getByRole("button", { name: "Seguir orientaciones" });
    expect(boton.className).toContain("bg-red-600");
    expect(boton.className).toContain("text-sm");

    fireEvent.click(boton);
    expect(screen.getByText("Modo 3 de 3: Activador fisiológico")).toBeTruthy();
    await waitFor(() => expect(window.scrollTo).toHaveBeenCalled());
  });

  it(
    "al culminar el día 1 el panel pasa esa actividad a 'en espera'",
    async () => {
      simulado.userData = participante([nueva(), nueva(), nueva(), nueva()]);
      await montar();
      fireEvent.click(screen.getByRole("button", { name: "Seguir orientaciones" }));

      // Entre un clic y el siguiente hay que dejar pasar el margen contra el
      // doble clic (800 ms).
      for (let i = 0; i < 10; i++) {
        const culminar = screen.queryByRole("button", { name: "Culminar Día" });
        const boton =
          culminar ??
          screen.getByRole("button", { name: "Marcar Actividad Completada" });
        await waitFor(() => expect((boton as HTMLButtonElement).disabled).toBe(false), {
          timeout: 2000,
        });
        fireEvent.click(boton);
        if (culminar) break;
      }

      expect(await screen.findByRole("heading", { name: "¡Felicidades!" })).toBeTruthy();
      expect(screen.getByText(/Se desbloqueará la actividad a las/)).toBeTruthy();

      fireEvent.click(screen.getByRole("button", { name: /Ver todas mis actividades/ }));
      expect(screen.getByText(/⏳ Día 2 se abre a las/)).toBeTruthy();
      expect(screen.getByText("0 de 4 actividades")).toBeTruthy();

      // El panel sigue ofreciendo continuar con otra.
      fireEvent.click(
        screen.getByRole("button", { name: /Continuar con mis actividades/ })
      );
      expect(screen.getByRole("heading", { name: RECS[1].title })).toBeTruthy();
    },
    20_000
  );
});

describe("Fin del programa", () => {
  it("con todo completo no hay panel y se abre solo el segundo test", async () => {
    simulado.userData = participante([hecha(), hecha(), hecha(), hecha()]);
    await montar();

    expect(screen.queryByText("Tu programa de actividades")).toBeNull();
    expect(screen.getByRole("button", { name: "Realizar Test Otra Vez" })).toBeTruthy();

    await waitFor(() => expect(simulado.push).toHaveBeenCalledWith("/test"), {
      timeout: 3000,
    });
    expect(localStorage.getItem("testStartTime")).not.toBeNull();
  });

  it(
    "al culminar la última actividad espera a la retroalimentación y luego abre el test",
    async () => {
      // Tres completas y la última en su último día, en la última actividad.
      const ultima = RECS[3];
      expect(ultima.feedbackQuestions?.length).toBeGreaterThan(0);
      const actividadesDelDia2 = ultima.days[1].activities.length;
      const progresoUltima = {
        ...nueva(),
        currentDay: 2,
        currentActivityIndex: actividadesDelDia2 - 1,
      };
      simulado.userData = participante(
        [hecha(), hecha(), hecha(), progresoUltima],
        {
          recommendationProgress: {
            [MODO]: {
              currentQuestionIndex: indiceDelItem(3),
              recommendationProgress: Object.fromEntries(
                RECS.map((rec, i) => [
                  rec.id,
                  i === 3 ? progresoUltima : hecha(),
                ])
              ),
            },
          },
        }
      );
      await montar();
      expect(screen.getByText("3 de 4 actividades")).toBeTruthy();

      fireEvent.click(screen.getByRole("button", { name: "Seguir orientaciones" }));
      fireEvent.click(screen.getByRole("button", { name: "Culminar Día" }));

      // Con el cuadro abierto, ni panel ni test.
      expect(await screen.findByText("Retroalimentación")).toBeTruthy();
      expect(screen.queryByText("Tu programa de actividades")).toBeNull();
      await new Promise((r) => setTimeout(r, 1000));
      expect(simulado.push).not.toHaveBeenCalled();

      // Mientras el expediente simulado se pone al día con lo que se guardó.
      simulado.userData = participante([hecha(), hecha(), hecha(), hecha()]);

      const cuadro = screen.getByText("Retroalimentación").parentElement!;
      within(cuadro)
        .getAllByRole("radio", { name: "Sí" })
        .forEach((radio) => fireEvent.click(radio));
      fireEvent.click(
        within(cuadro).getByRole("button", { name: "Enviar Retroalimentación" })
      );

      await waitFor(() => expect(simulado.push).toHaveBeenCalledWith("/test"), {
        timeout: 3000,
      });
    },
    20_000
  );

  it("en el segundo intento terminado no vuelve a abrir el test", async () => {
    simulado.userData = participante([hecha(), hecha(), hecha(), hecha()], {
      answers2: ANSWERS,
      hasRetakenTest: true,
      lastTestDate2: { toDate: () => new Date() },
      testResults2: { ya: "guardados" },
    });
    await montar();

    expect(
      await screen.findByText(/Gracias por tu esfuerzo en este segundo intento/)
    ).toBeTruthy();
    expect(screen.queryByText("Tu programa de actividades")).toBeNull();
    await new Promise((r) => setTimeout(r, 1200));
    expect(simulado.push).not.toHaveBeenCalledWith("/test");
  });

  it("con actividades pendientes no abre el test", async () => {
    simulado.userData = participante([hecha(), hecha(), hecha(), nueva()]);
    await montar();
    await new Promise((r) => setTimeout(r, 1200));
    expect(simulado.push).not.toHaveBeenCalled();
  });
});
