import { afterEach, describe, expect, it, vi } from "vitest";
import { verifySessionToken } from "./verifySession";

// El modo emulador acepta tokens sin firma. Estas pruebas fijan que eso solo
// ocurre donde debe: con el emulador de Auth configurado y nunca en una
// compilación de producción.
const PROYECTO = "demo-afrontamiento";
const b64 = (objeto: object) => Buffer.from(JSON.stringify(objeto)).toString("base64url");

const token = ({ alg = "none", proyecto = PROYECTO } = {}) => {
  const ahora = Math.floor(Date.now() / 1000);
  return `${b64({ alg, typ: "JWT" })}.${b64({
    sub: "uid-1",
    iss: `https://securetoken.google.com/${proyecto}`,
    aud: proyecto,
    iat: ahora,
    exp: ahora + 3600,
  })}.${alg === "none" ? "" : "firma-inventada"}`;
};

const entorno = (nodeEnv: string, conEmulador: boolean) => {
  vi.stubEnv("NODE_ENV", nodeEnv);
  vi.stubEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID", PROYECTO);
  vi.stubEnv("FIREBASE_AUTH_EMULATOR_HOST", conEmulador ? "127.0.0.1:9099" : "");
};

describe("verifySessionToken y el modo emulador", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("en desarrollo y con el emulador de Auth, acepta el token del emulador", async () => {
    entorno("development", true);
    expect(await verifySessionToken(token())).toEqual({
      uid: "uid-1",
      email: undefined,
      expired: false,
    });
  });

  it("en producción lo rechaza aunque la variable del emulador esté definida", async () => {
    entorno("production", true);
    expect(await verifySessionToken(token())).toBeNull();
  });

  it("sin el emulador de Auth lo rechaza también en desarrollo", async () => {
    entorno("development", false);
    expect(await verifySessionToken(token())).toBeNull();
  });

  it("en modo emulador rechaza el token de otro proyecto", async () => {
    entorno("development", true);
    expect(await verifySessionToken(token({ proyecto: "otro-proyecto" }))).toBeNull();
  });

  it("en modo emulador no acepta un token que dice venir firmado", async () => {
    entorno("development", true);
    expect(await verifySessionToken(token({ alg: "RS256" }))).toBeNull();
  });
});
