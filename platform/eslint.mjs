import ts from "typescript-eslint";
const config = [
  ...ts.configs.recommended,
  { rules: { "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_", varsIgnorePattern: "^_" }], "@typescript-eslint/no-explicit-any": "off" } },
];
export default config;
