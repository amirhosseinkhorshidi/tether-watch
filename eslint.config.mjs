// @ts-check
import js from "@eslint/js";
import tseslint from "typescript-eslint";

/**
 * Flat config. ESLint is the linter (with type-aware rules); Biome is the formatter.
 * Only `.ts` sources are linted — `dist/` and this config file are ignored.
 */
export default tseslint.config(
  {
    ignores: ["dist/**", "node_modules/**"],
  },
  {
    files: ["**/*.ts"],
    extends: [js.configs.recommended, ...tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
);
