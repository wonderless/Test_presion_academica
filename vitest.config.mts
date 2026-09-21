import { fileURLToPath } from "url";
import { defineConfig } from "vitest/config";

// Lógica pura (*.test.ts) en `node`, y componentes (*.test.tsx), que declaran
// jsdom en su primera línea. Nada toca Firebase de verdad: los componentes lo
// reciben simulado, así que las pruebas corren en segundos. Las reglas de
// Firestore y los recorridos completos van aparte, con los emuladores
// (`npm run test:rules` y `npm run test:e2e`).
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  // tsconfig usa `jsx: preserve` porque compila Next; aquí hay que transformarlo.
  oxc: {
    jsx: { runtime: "automatic" },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});
