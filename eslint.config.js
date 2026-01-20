import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import jsdoc from "eslint-plugin-jsdoc";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

export default tseslint.config(
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    ...tseslint.configs.stylistic,
    {
        ignores: ["dist", "node_modules", ".local"],
    },
    {
        files: ["**/*.ts", "**/*.tsx"],
        plugins: {
            jsdoc,
            "react-hooks": reactHooks,
            "react-refresh": reactRefresh,
        },
        languageOptions: {
            parserOptions: {
                project: ["./tsconfig.json"],
                tsconfigRootDir: import.meta.dirname,
            },
        },
        rules: {
            // --- Strong Typing ---
            "@typescript-eslint/explicit-function-return-type": "error",
            "@typescript-eslint/no-explicit-any": "warn",
            "@typescript-eslint/explicit-module-boundary-types": "error",

            // --- Documentation (JSDoc) ---
            "jsdoc/require-jsdoc": [
                "error",
                {
                    require: {
                        FunctionDeclaration: true,
                        MethodDefinition: true,
                        ClassDeclaration: true,
                        ArrowFunctionExpression: false,
                        FunctionExpression: false,
                    },
                    contexts: [
                        "VariableDeclaration > VariableDeclarator > ArrowFunctionExpression",
                        "ExportNamedDeclaration > VariableDeclaration > VariableDeclarator > ArrowFunctionExpression",
                    ],
                },
            ],
            "jsdoc/require-description": "error",
            "jsdoc/require-param": "error",
            "jsdoc/require-param-type": "off", // Types are handled by TypeScript
            "jsdoc/require-param-description": "error",
            "jsdoc/require-returns": "error",
            "jsdoc/require-returns-type": "off", // Types are handled by TypeScript
            "jsdoc/require-returns-description": "error",
            "jsdoc/check-tag-names": "warn",
            "jsdoc/check-alignment": "warn",
            "jsdoc/multiline-blocks": "warn",

            // --- React & Refresh ---
            "react-refresh/only-export-components": [
                "warn",
                { allowConstantExport: true },
            ],
            ...reactHooks.configs.recommended.rules,
        },
    }
);
