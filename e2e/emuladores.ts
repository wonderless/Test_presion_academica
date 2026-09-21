// e2e/emuladores.ts
// Acceso directo a los emuladores para sembrar datos y comprobar resultados.
// Las escrituras van como "owner", que el emulador de Firestore acepta
// saltándose las reglas.
export const PROYECTO = "demo-afrontamiento";

const FIRESTORE = `http://${process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8080"}`;
const AUTH = `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST ?? "127.0.0.1:9099"}`;
const DOCUMENTOS = `${FIRESTORE}/v1/projects/${PROYECTO}/databases/(default)/documents`;
const IDENTITY = `${AUTH}/identitytoolkit.googleapis.com/v1`;
const COMO_PROPIETARIO = {
  Authorization: "Bearer owner",
  "Content-Type": "application/json",
};

type Valor = string | number | boolean | null | Valor[] | { [clave: string]: Valor };

const aFirestore = (valor: Valor): object => {
  if (valor === null) return { nullValue: null };
  if (typeof valor === "string") return { stringValue: valor };
  if (typeof valor === "boolean") return { booleanValue: valor };
  if (typeof valor === "number") {
    return Number.isInteger(valor)
      ? { integerValue: String(valor) }
      : { doubleValue: valor };
  }
  if (Array.isArray(valor)) return { arrayValue: { values: valor.map(aFirestore) } };
  return { mapValue: { fields: campos(valor) } };
};

const campos = (objeto: { [clave: string]: Valor }) =>
  Object.fromEntries(Object.entries(objeto).map(([k, v]) => [k, aFirestore(v)]));

const comprobar = async (respuesta: Response, operacion: string) => {
  if (!respuesta.ok) {
    throw new Error(`${operacion}: ${respuesta.status} ${await respuesta.text()}`);
  }
  return respuesta;
};

export const limpiarEmuladores = async () => {
  await comprobar(
    await fetch(`${FIRESTORE}/emulator/v1/projects/${PROYECTO}/databases/(default)/documents`, {
      method: "DELETE",
    }),
    "vaciar Firestore"
  );
  await comprobar(
    await fetch(`${AUTH}/emulator/v1/projects/${PROYECTO}/accounts`, { method: "DELETE" }),
    "vaciar Auth"
  );
};

export const crearCuenta = async (email: string, password: string): Promise<string> => {
  const respuesta = await comprobar(
    await fetch(`${IDENTITY}/accounts:signUp?key=clave-e2e`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    }),
    `crear la cuenta ${email}`
  );
  return (await respuesta.json()).localId;
};

export const existeCuenta = async (email: string, password: string): Promise<boolean> => {
  const respuesta = await fetch(`${IDENTITY}/accounts:signInWithPassword?key=clave-e2e`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  return respuesta.ok;
};

export const escribirDocumento = async (
  coleccion: string,
  id: string,
  datos: { [clave: string]: Valor }
) => {
  await comprobar(
    await fetch(`${DOCUMENTOS}/${coleccion}/${id}`, {
      method: "PATCH",
      headers: COMO_PROPIETARIO,
      body: JSON.stringify({ fields: campos(datos) }),
    }),
    `escribir ${coleccion}/${id}`
  );
};

export const existeDocumento = async (coleccion: string, id: string): Promise<boolean> => {
  const respuesta = await fetch(`${DOCUMENTOS}/${coleccion}/${id}`, {
    headers: COMO_PROPIETARIO,
  });
  if (respuesta.status === 404) return false;
  await comprobar(respuesta, `leer ${coleccion}/${id}`);
  return true;
};

export const buscarAdminPorEmail = async (
  email: string
): Promise<{ uid: string; invitationCode: string }> => {
  const respuesta = await comprobar(
    await fetch(`${DOCUMENTOS}:runQuery`, {
      method: "POST",
      headers: COMO_PROPIETARIO,
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: "admins" }],
          where: {
            fieldFilter: {
              field: { fieldPath: "email" },
              op: "EQUAL",
              value: { stringValue: email },
            },
          },
        },
      }),
    }),
    `buscar el administrador ${email}`
  );
  const [fila] = await respuesta.json();
  if (!fila?.document) throw new Error(`No existe el administrador ${email}`);
  return {
    uid: fila.document.name.split("/").pop(),
    invitationCode: fila.document.fields.invitationCode.stringValue,
  };
};
