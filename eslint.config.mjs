import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  {
    // Sin esto, invocar `eslint .` analiza el directorio de compilación y
    // devuelve cientos de errores de archivos generados. Antes no se notaba
    // porque el script usaba `next lint`, que los excluía por su cuenta.
    ignores: [".next/**", "out/**", "build/**", "node_modules/**", "next-env.d.ts"],
  },
  ...compat.config({
    extends: ["next/core-web-vitals", "next/typescript"],
    rules: {
      // Decisión de estilo del proyecto: se usa `any` en algunos puntos.
      "@typescript-eslint/no-explicit-any": "off",
      // Estuvo apagada, y con ella apagada `npm run lint` salía limpio mientras
      // se acumulaban dieciséis símbolos declarados y nunca usados: props que
      // no se dibujaban, estados que nadie leía y funciones sin llamar. Queda
      // en "warn" para que avise sin romper la compilación.
      "@typescript-eslint/no-unused-vars": "warn",
    },
  }),
];

export default eslintConfig;
