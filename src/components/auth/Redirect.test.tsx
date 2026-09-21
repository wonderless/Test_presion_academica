// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Redirect from "./Redirect";

const simulado = vi.hoisted(() => ({
  replace: vi.fn(),
  pathname: "/",
  auth: { user: null as { role: string } | null, loading: false },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: simulado.replace }),
  usePathname: () => simulado.pathname,
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => simulado.auth,
}));

const pintar = (pathname: string, user: { role: string } | null, loading = false) => {
  simulado.pathname = pathname;
  simulado.auth = { user, loading };
  render(
    <Redirect>
      <p>contenido</p>
    </Redirect>
  );
};

describe("Redirect", () => {
  beforeEach(() => {
    simulado.replace.mockClear();
    localStorage.clear();
  });
  afterEach(cleanup);

  it("mientras la sesión carga no pinta nada ni navega", () => {
    pintar("/dashboard/user", null, true);
    expect(screen.queryByText("contenido")).toBeNull();
    expect(simulado.replace).not.toHaveBeenCalled();
  });

  it("sin sesión, una ruta protegida devuelve al consentimiento", () => {
    pintar("/dashboard/user", null);
    expect(screen.queryByText("contenido")).toBeNull();
    expect(simulado.replace).toHaveBeenCalledWith("/");
  });

  it("sin sesión y sin aceptar los términos, /home devuelve al consentimiento", () => {
    pintar("/home", null);
    expect(simulado.replace).toHaveBeenCalledWith("/");
  });

  it("sin sesión y con los términos aceptados, /home se muestra", () => {
    localStorage.setItem("termsAccepted", "true");
    pintar("/home", null);
    expect(screen.getByText("contenido")).toBeTruthy();
    expect(simulado.replace).not.toHaveBeenCalled();
  });

  it("un participante que entra en el panel del administrador vuelve al suyo", () => {
    pintar("/dashboard/admin", { role: "user" });
    expect(screen.queryByText("contenido")).toBeNull();
    expect(simulado.replace).toHaveBeenCalledWith("/dashboard/user");
  });

  it("un administrador que entra en el panel del superadministrador vuelve al suyo", () => {
    pintar("/dashboard/superadmin", { role: "admin" });
    expect(simulado.replace).toHaveBeenCalledWith("/dashboard/admin");
  });

  it("cada rol ve sus propias rutas", () => {
    pintar("/results", { role: "user" });
    expect(screen.getByText("contenido")).toBeTruthy();
    cleanup();
    pintar("/dashboard/admin", { role: "admin" });
    expect(screen.getByText("contenido")).toBeTruthy();
    expect(simulado.replace).not.toHaveBeenCalled();
  });
});
