// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import RegisterForm, { DEFAULT_INVITATION_CODE } from "./RegisterFormUser";

const simulado = vi.hoisted(() => ({
  registerUser: vi.fn(async () => ({})),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ registerUser: simulado.registerUser }),
}));

const escribir = (etiqueta: string, valor: string) =>
  fireEvent.change(screen.getByLabelText(etiqueta), { target: { value: valor } });

const completarPaso1 = (clave = "clave-segura", confirmacion = clave) => {
  escribir("Correo Electrónico", "persona@correo.test");
  escribir("Contraseña", clave);
  escribir("Confirmar Contraseña", confirmacion);
  fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
};

describe("RegisterFormUser", () => {
  beforeEach(() => simulado.registerUser.mockClear());
  afterEach(cleanup);

  it("trae el código de invitación precargado y editable", () => {
    render(<RegisterForm />);
    const codigo = screen.getByLabelText("Código de Invitación") as HTMLInputElement;
    // Se compara con la constante y no con el código escrito a mano: el valor
    // cambia cada vez que cambia el administrador de referencia, y lo que hay
    // que comprobar es que llega precargado, no cuál es.
    expect(codigo.value).toBe(DEFAULT_INVITATION_CODE);
    // Editable, para que quien tenga el código de otro administrador lo pueda
    // sobrescribir. Dejarlo de solo lectura rompería ese caso.
    expect(codigo.readOnly).toBe(false);
  });

  it("el código precargado tiene la forma de los que genera el sistema", () => {
    // `generateUniqueInvitationCode` en ListaAdmin los hace de 8 caracteres
    // alfanuméricos en mayúscula. Si alguien deja la constante vacía o con un
    // valor mal copiado, el registro se cae por el enlace para todo el mundo.
    expect(DEFAULT_INVITATION_CODE).toMatch(/^[A-Z0-9]{8}$/);
  });

  it("no deja pasar al paso 2 sin un correo válido", () => {
    render(<RegisterForm />);
    const siguiente = screen.getByRole("button", { name: "Siguiente" }) as HTMLButtonElement;
    escribir("Correo Electrónico", "no-es-un-correo");
    expect(siguiente.disabled).toBe(true);
    expect(screen.getAllByText("Ingresa un correo válido").length).toBeGreaterThan(0);

    escribir("Correo Electrónico", "persona@correo.test");
    expect(siguiente.disabled).toBe(false);
  });

  it("rechaza contraseñas que no coinciden", () => {
    render(<RegisterForm />);
    completarPaso1("clave-segura", "otra-clave");
    expect(screen.getAllByText("Las contraseñas no coinciden").length).toBeGreaterThan(0);
    expect(screen.queryByLabelText("Nombres")).toBeNull();
  });

  it("rechaza contraseñas de menos de 6 caracteres", () => {
    render(<RegisterForm />);
    completarPaso1("123");
    expect(
      screen.getAllByText("La contraseña debe tener al menos 6 caracteres").length
    ).toBeGreaterThan(0);
  });

  it("no registra con datos personales incompletos", () => {
    render(<RegisterForm />);
    completarPaso1();
    escribir("Nombres", "Ana");
    fireEvent.click(screen.getByRole("button", { name: "Registrarse" }));

    expect(
      screen.getByText("Por favor rellene y seleccione todos los campos antes de continuar")
    ).toBeTruthy();
    expect(simulado.registerUser).not.toHaveBeenCalled();
  });

  it("con todo completo registra con el código sin espacios y la edad como número", async () => {
    render(<RegisterForm />);
    escribir("Código de Invitación", "  CODIGO01  ");
    completarPaso1();

    escribir("Nombres", "Ana");
    escribir("Apellidos", "Pérez");
    escribir("Edad", "21");
    escribir("Sexo", "Mujer");
    escribir("Universidad", "Universidad de Prueba");
    escribir("Carrera", "Psicología");
    escribir("Ciclo", "5");
    escribir("Departamento", "Lima");
    fireEvent.click(screen.getByRole("button", { name: "Registrarse" }));

    await waitFor(() => expect(simulado.registerUser).toHaveBeenCalledTimes(1));
    expect(simulado.registerUser).toHaveBeenCalledWith(
      "persona@correo.test",
      "clave-segura",
      "CODIGO01",
      {
        nombres: "Ana",
        apellidos: "Pérez",
        edad: 21,
        sexo: "Mujer",
        universidad: "Universidad de Prueba",
        carrera: "Psicología",
        ciclo: "5",
        departamento: "Lima",
      }
    );
  });
});
