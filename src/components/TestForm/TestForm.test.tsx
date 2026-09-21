// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { modeQuestions, questions } from "@/constants/questions";
import { getRecommendationsForMode, type Answers } from "@/lib/scoring";
import { TestForm } from "./TestForm";

const simulado = vi.hoisted(() => ({
  push: vi.fn(),
  updateDoc: vi.fn(async () => {}),
  userData: undefined as Record<string, unknown> | undefined,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: simulado.push }),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { uid: "u1" } }),
}));

vi.mock("@/lib/firebase/config", () => ({ db: {} }));

vi.mock("firebase/firestore", () => ({
  doc: (_db: unknown, coleccion: string, id: string) => ({
    path: `${coleccion}/${id}`,
  }),
  getDoc: async () => ({ data: () => simulado.userData }),
  updateDoc: simulado.updateDoc,
  serverTimestamp: () => "MARCA_DEL_SERVIDOR",
}));

// Deja el modo activador fisiológico en BAJO y el resto en alto.
const respuestaPara = (id: number): number =>
  modeQuestions.activadorFisiologico.includes(id) ? 1 : 5;

// Las opciones se eligen por su etiqueta de la escala, que es lo que ve el
// participante: "Nunca" es 1 y "Siempre" es 5.
const ETIQUETAS: Record<number, string> = {
  1: "1 Nunca",
  2: "2 Casi nunca",
  3: "3 A veces",
  4: "4 Casi siempre",
  5: "5 Siempre",
};

const responderTodo = () => {
  questions.forEach((pregunta, indice) => {
    fireEvent.click(
      screen.getByRole("radio", {
        name: ETIQUETAS[respuestaPara(pregunta.id)],
      })
    );
    if (indice < questions.length - 1) {
      fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    }
  });
};

const escrituraGuardada = () => {
  expect(simulado.updateDoc).toHaveBeenCalledTimes(1);
  const [ref, datos] = simulado.updateDoc.mock.calls[0] as unknown as [
    { path: string },
    Record<string, unknown>,
  ];
  expect(ref.path).toBe("users/u1");
  return datos;
};

describe("TestForm", () => {
  beforeEach(() => {
    simulado.push.mockClear();
    simulado.updateDoc.mockClear();
    simulado.userData = undefined;
    localStorage.clear();
  });
  afterEach(cleanup);

  it("ofrece las cinco opciones de la escala", () => {
    render(<TestForm />);
    expect(screen.getAllByRole("radio")).toHaveLength(5);
    for (const etiqueta of Object.values(ETIQUETAS)) {
      expect(screen.getByRole("radio", { name: etiqueta })).toBeDefined();
    }
  });

  it("no deja avanzar sin responder la pregunta", () => {
    render(<TestForm />);
    const siguiente = screen.getByRole("button", {
      name: "Siguiente",
    }) as HTMLButtonElement;
    expect(siguiente.disabled).toBe(true);

    fireEvent.click(screen.getByRole("radio", { name: ETIQUETAS[3] }));
    expect(siguiente.disabled).toBe(false);
  });

  it("al volver atrás conserva la respuesta anterior", () => {
    render(<TestForm />);
    fireEvent.click(screen.getByRole("radio", { name: ETIQUETAS[2] }));
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(screen.getByRole("heading", { level: 2 }).textContent).toContain(
      "2."
    );

    fireEvent.click(screen.getByRole("button", { name: "Atrás" }));
    expect(screen.getByRole("heading", { level: 2 }).textContent).toContain(
      "1."
    );
    expect(
      (screen.getByRole("radio", { name: ETIQUETAS[2] }) as HTMLInputElement)
        .checked
    ).toBe(true);
  });

  it("el primer intento se guarda en las propiedades estándar", async () => {
    render(<TestForm />);
    responderTodo();
    fireEvent.click(screen.getByRole("button", { name: "Finalizar Test" }));

    await waitFor(() => expect(simulado.push).toHaveBeenCalledWith("/results"));
    const datos = escrituraGuardada();
    const answers = datos.answers as Answers;
    expect(Object.keys(answers)).toHaveLength(questions.length);
    // Se guarda el puntaje marcado, no un booleano.
    expect(answers[modeQuestions.activadorFisiologico[0]]).toBe(1);
    expect(answers[modeQuestions.responsable[0]]).toBe(5);
    expect(datos.lastTestDate).toBe("MARCA_DEL_SERVIDOR");
    expect(typeof datos.testDuration).toBe("number");
    expect(datos).not.toHaveProperty("answers2");
    expect(datos).not.toHaveProperty("hasRetakenTest");
    // La escritura es exactamente esta, ni un campo de más: si alguien añade
    // otro, esta prueba lo obliga a decidirlo aquí y no de pasada.
    expect(Object.keys(datos).sort()).toEqual([
      "answers",
      "lastTestDate",
      "testDuration",
    ]);
  });

  it("con las actividades completas, el segundo intento va a la casilla 2 y archiva el plan", async () => {
    const primerasRespuestas: Answers = Object.fromEntries(
      questions.map((q) => [q.id, respuestaPara(q.id)])
    );
    const plan = {
      activadorFisiologico: {
        recommendationProgress: Object.fromEntries(
          getRecommendationsForMode(
            "activadorFisiologico",
            "BAJO",
            primerasRespuestas
          ).map((rec) => [rec.id, { isCompleted: true }])
        ),
      },
    };
    simulado.userData = {
      answers: primerasRespuestas,
      lastTestDate: { toDate: () => new Date() },
      recommendationProgress: plan,
    };

    render(<TestForm />);
    responderTodo();
    fireEvent.click(screen.getByRole("button", { name: "Finalizar Test" }));

    await waitFor(() => expect(simulado.push).toHaveBeenCalledWith("/results"));
    const datos = escrituraGuardada();
    expect(datos).toHaveProperty("answers2");
    expect(datos).not.toHaveProperty("answers");
    expect(datos.hasRetakenTest).toBe(true);
    expect(datos.recommendationProgress1).toEqual(plan);
    expect(datos.recommendationProgress).toEqual({});
  });

  it("un doble clic en Finalizar no envía el test dos veces", async () => {
    render(<TestForm />);
    responderTodo();
    const finalizar = screen.getByRole("button", { name: "Finalizar Test" });
    fireEvent.click(finalizar);
    fireEvent.click(finalizar);

    await waitFor(() => expect(simulado.push).toHaveBeenCalledWith("/results"));
    expect(simulado.updateDoc).toHaveBeenCalledTimes(1);
  });
});
