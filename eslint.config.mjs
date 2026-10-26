import { FlatCompat } from "@eslint/eslintrc";
import path from "node:path";
import { fileURLToPath } from "node:url";

const compat = new FlatCompat({ baseDirectory: path.dirname(fileURLToPath(import.meta.url)) });

export default [
  { ignores: [".next/**", ".next-validation/**", "node_modules/**", "temp/**", "output/**"] },
  ...compat.extends("next/core-web-vitals", "next/typescript")
];
