// tests/firestore.rules.test.mjs
// Pruebas de firestore.rules contra el emulador. Se lanzan con
// `npm run test:rules`, que arranca el emulador con un proyecto `demo-*`: el
// CLI de Firebase nunca conecta un proyecto así con la nube, de modo que estas
// pruebas no pueden tocar producción.
//
// Van aparte de Vitest porque necesitan el emulador, y con él Java 21.
const PROJECT = "demo-afrontamiento";
const BASE = `http://${process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8080"}/v1/projects/${PROJECT}/databases/(default)/documents`;

// El emulador acepta tokens sin firmar: basta con que el payload tenga la forma
// de un ID token de Firebase.
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const token = (uid) => {
  const now = Math.floor(Date.now() / 1000);
  return `${b64({ alg: "none", typ: "JWT" })}.${b64({
    sub: uid, user_id: uid, iss: `https://securetoken.google.com/${PROJECT}`,
    aud: PROJECT, iat: now, exp: now + 3600, auth_time: now,
    firebase: { sign_in_provider: "password" },
  })}.`;
};

const campos = (o) => ({
  fields: Object.fromEntries(Object.entries(o).map(([k, v]) => [k, { stringValue: v }])),
});

// `como`: un uid, "owner" para saltarse las reglas al sembrar, o null sin sesión.
const peticion = async (method, ruta, como, body) => {
  const headers = { "Content-Type": "application/json" };
  if (como) headers.Authorization = `Bearer ${como === "owner" ? "owner" : token(como)}`;
  const res = await fetch(`${BASE}${ruta}`, { method, headers, body: body && JSON.stringify(body) });
  return res.status;
};

const leer = (ruta, como) => peticion("GET", ruta, como);
const crear = (col, id, como, datos) => peticion("POST", `/${col}?documentId=${id}`, como, campos(datos));
const actualizar = (ruta, como, datos) =>
  peticion("PATCH", `${ruta}?${Object.keys(datos).map((k) => `updateMask.fieldPaths=${k}`).join("&")}`, como, campos(datos));
const borrar = (ruta, como) => peticion("DELETE", ruta, como);

// ---------- datos de partida ----------
await crear("superadmins", "SA", "owner", { email: "sa@test" });
await crear("admins", "A1", "owner", { invitationCode: "COD1" });
await crear("admins", "A2", "owner", { invitationCode: "COD2" });
await crear("users", "P1", "owner", { adminId: "A1", invitationCode: "COD1" });
await crear("users", "P2", "owner", { adminId: "A2", invitationCode: "COD2" });
// Expediente antiguo, anterior a que se guardara `adminId`.
await crear("users", "LEGACY", "owner", { invitationCode: "COD1" });

const PERMITIDO = 200;
const DENEGADO = 403;
const NO_EXISTE = 404; // lectura permitida de un documento que no existe

const casos = [
  // users: lectura
  ["users · el participante lee su expediente", PERMITIDO, () => leer("/users/P1", "P1")],
  ["users · el participante lee el de otro", DENEGADO, () => leer("/users/P2", "P1")],
  ["users · el admin lee a su invitado", PERMITIDO, () => leer("/users/P1", "A1")],
  ["users · el admin lee al invitado de otro admin", DENEGADO, () => leer("/users/P2", "A1")],
  ["users · sin sesión no se lee nada", DENEGADO, () => leer("/users/P1", null)],

  // users: creación y vínculo con el administrador
  ["users · registro coherente", PERMITIDO,
    () => crear("users", "N1", "N1", { adminId: "A1", invitationCode: "COD1" })],
  ["users · registro con adminId y código de admins distintos", DENEGADO,
    () => crear("users", "N2", "N2", { adminId: "A1", invitationCode: "COD2" })],
  ["users · registro con un admin inexistente", DENEGADO,
    () => crear("users", "N3", "N3", { adminId: "NOPE", invitationCode: "COD1" })],
  ["users · registro sin adminId", DENEGADO,
    () => crear("users", "N4", "N4", { invitationCode: "COD1" })],
  ["users · crear el expediente de otro uid", DENEGADO,
    () => crear("users", "N5", "N1", { adminId: "A1", invitationCode: "COD1" })],

  // users: actualización
  ["users · guardar el test", PERMITIDO, () => actualizar("/users/P1", "P1", { answers: "x" })],
  ["users · cambiar adminId", DENEGADO, () => actualizar("/users/P1", "P1", { adminId: "A2" })],
  ["users · cambiar invitationCode", DENEGADO, () => actualizar("/users/P1", "P1", { invitationCode: "COD2" })],
  ["users · expediente antiguo sin adminId guarda el test", PERMITIDO,
    () => actualizar("/users/LEGACY", "LEGACY", { answers: "x" })],
  ["users · actualizar el expediente de otro", DENEGADO, () => actualizar("/users/P2", "P1", { answers: "x" })],

  // users: borrado
  ["users · el participante borra su expediente", DENEGADO, () => borrar("/users/P1", "P1")],
  ["users · el superadmin borra desde el cliente", DENEGADO, () => borrar("/users/P1", "SA")],

  // admins
  ["admins · el admin lee su documento", PERMITIDO, () => leer("/admins/A1", "A1")],
  ["admins · el admin lee el de otro admin", DENEGADO, () => leer("/admins/A2", "A1")],
  ["admins · el participante lee un admin", DENEGADO, () => leer("/admins/A1", "P1")],
  ["admins · el superadmin lee un admin", PERMITIDO, () => leer("/admins/A1", "SA")],
  ["admins · el admin crea otro admin", DENEGADO, () => crear("admins", "A3", "A1", { invitationCode: "COD3" })],
  ["admins · el superadmin crea un admin", PERMITIDO, () => crear("admins", "A4", "SA", { invitationCode: "COD4" })],
  ["admins · el superadmin borra un admin", PERMITIDO, () => borrar("/admins/A4", "SA")],

  // superadmins
  ["superadmins · el superadmin lee su documento", PERMITIDO, () => leer("/superadmins/SA", "SA")],
  ["superadmins · un participante consulta el suyo, aunque no exista", NO_EXISTE, () => leer("/superadmins/P1", "P1")],
  ["superadmins · un participante lee el de otro", DENEGADO, () => leer("/superadmins/SA", "P1")],
  ["superadmins · nadie escribe desde el cliente", DENEGADO, () => actualizar("/superadmins/SA", "SA", { email: "x" })],

  // resto
  ["otra colección · cerrada", DENEGADO, () => crear("otra", "X", "SA", { a: "b" })],
];

let fallos = 0;
for (const [nombre, esperado, ejecutar] of casos) {
  const obtenido = await ejecutar();
  const ok = obtenido === esperado;
  if (!ok) fallos++;
  console.log(`${ok ? "✓" : "✗"} ${nombre}${ok ? "" : ` — esperado ${esperado}, obtenido ${obtenido}`}`);
}

console.log(`\n${casos.length - fallos} de ${casos.length} casos correctos`);
process.exit(fallos ? 1 : 0);
