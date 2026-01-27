import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import jsdoc from "eslint-plugin-jsdoc";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

export default tseslint.config(
    eslint.configs.recommended,
    ...tseslint.configs.strictTypeChecked,
    ...tseslint.configs.stylisticTypeChecked,
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
            // --- Strong Typing & Corrections (STRICT MODE) ---
            "@typescript-eslint/explicit-function-return-type": "off", // Too noisy for React components
            "@typescript-eslint/no-explicit-any": "error",
            "@typescript-eslint/no-unsafe-assignment": "error",
            "@typescript-eslint/no-unsafe-member-access": "error",
            "@typescript-eslint/no-unsafe-call": "error",
            "@typescript-eslint/no-unsafe-return": "error",
            "@typescript-eslint/no-unsafe-argument": "error",
            "@typescript-eslint/no-floating-promises": "error",
            "@typescript-eslint/no-misused-promises": "error",
            "@typescript-eslint/await-thenable": "error",
            "@typescript-eslint/require-await": "error",
            "@typescript-eslint/no-unnecessary-type-assertion": "error",
            "@typescript-eslint/no-unnecessary-condition": "warn", // Warn first, helps find dead code
            "@typescript-eslint/strict-boolean-expressions": "off", // Can be too strict for React patterns
            "@typescript-eslint/prefer-nullish-coalescing": "error",
            "@typescript-eslint/prefer-optional-chain": "error",
            "@typescript-eslint/no-non-null-assertion": "warn",
            "@typescript-eslint/no-inferrable-types": "error",
            "@typescript-eslint/consistent-type-imports": ["error", { prefer: "type-imports" }],
            "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],

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
