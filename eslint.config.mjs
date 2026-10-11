import { defineConfig, globalIgnores } from "eslint/config";
import base from "./platform/eslint.mjs";
export default defineConfig([
  globalIgnores(["legacy/**", ".next/**", "out/**", ".firebase/**", "dist/**", "node_modules/**", "artifacts/**", "build/**", "test-results/**", "playwright-report/**"]),
  ...base,
]);
