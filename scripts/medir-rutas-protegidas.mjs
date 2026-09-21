// scripts/medir-rutas-protegidas.mjs
// Mide con Lighthouse las rutas que exigen sesión: /dashboard/user, /results y
// /test. Lighthouse sin más no puede, porque borra el almacenamiento antes de
// medir y la sesión se pierde; aquí se inicia sesión por la interfaz y se mide
// en un "user flow" sin borrarlo. Cómo lanzarlo está en el README del
// proyecto, en la sección de verificación de rendimiento.
//
// Necesita dos participantes de prueba: PART_EMAIL/PART_PASS, con el test hecho
// (para /dashboard/user y /results), y PART2_EMAIL/PART2_PASS, sin test (para
// /test, que solo se abre a quien todavía no lo ha hecho). Abrir /test no
// responde ni envía nada.

import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { startFlow } from "lighthouse";
import desktopConfig from "lighthouse/core/config/desktop-config.js";

// Se usa el puppeteer-core del propio Lighthouse, para no mezclar versiones.
const require = createRequire(import.meta.url);
const lhDir = dirname(require.resolve("lighthouse/package.json"));
const puppeteer = (await import(pathToFileURL(createRequire(join(lhDir, "x.js")).resolve("puppeteer-core")).href)).default;
const rgMod = await import("lighthouse/report/generator/report-generator.js");
const ReportGenerator = rgMod.ReportGenerator ?? rgMod.default;

const BASE = "http://localhost:3002";
const SALIDA = process.env.SALIDA ?? join(dirname(fileURLToPath(import.meta.url)), "..", "docs", "verificacion");
const CHROME = process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";

for (const variable of ["PART_EMAIL", "PART_PASS", "PART2_EMAIL", "PART2_PASS"]) {
  if (!process.env[variable]) throw new Error(`Falta la variable ${variable}`);
}
// Cada ruta con la cuenta que puede verla: /test solo se abre a quien todavía
// no ha hecho el test, y /results solo tiene contenido para quien sí lo hizo.
const CUENTAS = [
  { email: process.env.PART_EMAIL, clave: process.env.PART_PASS, rutas: [
    { ruta: "/dashboard/user", archivo: "panel-participante" },
    { ruta: "/results", archivo: "resultados" },
  ] },
  { email: process.env.PART2_EMAIL, clave: process.env.PART2_PASS, rutas: [
    { ruta: "/test", archivo: "test" },
  ] },
];
// disableStorageReset: sin él, Lighthouse borra el almacenamiento antes de
// medir, la sesión se pierde y acabaría midiendo la página de consentimiento.
const PERFILES = [
  { nombre: "móvil", sufijo: "-movil",
    config: { extends: "lighthouse:default", settings: { disableStorageReset: true } } },
  { nombre: "escritorio", sufijo: "",
    config: { ...desktopConfig, settings: { ...desktopConfig.settings, disableStorageReset: true } } },
];

const esperarRuta = (page, ruta, ms = 60000) =>
  page.waitForFunction((r) => location.pathname === r, { timeout: ms }, ruta);

mkdirSync(SALIDA, { recursive: true });
const filas = [];
let versionChrome = "";

for (const perfil of PERFILES) for (const cuenta of CUENTAS) {
  const RUTAS = cuenta.rutas;
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--no-first-run"] });
  versionChrome = await browser.version();
  const page = await browser.newPage();

  // Consentimiento e inicio de sesión por la interfaz, como una persona.
  await page.goto(`${BASE}/`, { waitUntil: "networkidle0" });
  await page.click("#consent");
  await page.evaluate(() =>
    [...document.querySelectorAll("button")]
      .find((b) => b.textContent.includes("Continuar"))
      .click()
  );
  await esperarRuta(page, "/home");
  await page.goto(`${BASE}/auth/loginUser`, { waitUntil: "networkidle0" });
  await page.type("#email", cuenta.email);
  await page.type("#password", cuenta.clave);
  await page.click('button[type="submit"]');
  await esperarRuta(page, "/dashboard/user");

  const flow = await startFlow(page, { name: `Rutas protegidas (${perfil.nombre})`, config: perfil.config });
  for (const { ruta } of RUTAS) {
    // /test exige la marca que deja el botón "Iniciar Test"; solo se abre la
    // página, no se responde ni se envía nada.
    if (ruta === "/test") {
      await page.evaluate(() => localStorage.setItem("testStartTime", Date.now().toString()));
    }
    await flow.navigate(`${BASE}${ruta}`, { name: ruta });
    // Si la sesión se hubiera perdido, Redirect habría llevado a otra página.
    await new Promise((r) => setTimeout(r, 1500));
    const final = new URL(page.url()).pathname;
    if (final !== ruta) throw new Error(`${perfil.nombre}: se pidió ${ruta} y se terminó en ${final}`);
  }
  const resultado = await flow.createFlowResult();
  await browser.close();

  resultado.steps.forEach((paso, i) => {
    const { archivo, ruta } = RUTAS[i];
    const lhr = paso.lhr;
    const base = join(SALIDA, `${archivo}${perfil.sufijo}.report`);
    writeFileSync(`${base}.json`, JSON.stringify(lhr, null, 2));
    writeFileSync(`${base}.html`, ReportGenerator.generateReport(lhr, "html"));
    const c = lhr.categories, a = lhr.audits;
    filas.push({
      perfil: perfil.nombre, ruta,
      rendimiento: Math.round(c.performance.score * 100),
      accesibilidad: Math.round(c.accessibility.score * 100),
      buenasPracticas: Math.round(c["best-practices"].score * 100),
      seo: Math.round(c.seo.score * 100),
      LCP: a["largest-contentful-paint"].displayValue,
      CLS: a["cumulative-layout-shift"].displayValue,
      TBT: a["total-blocking-time"].displayValue,
    });
  });
}

console.log(`Chrome: ${versionChrome}`);
console.log(JSON.stringify(filas, null, 2));
