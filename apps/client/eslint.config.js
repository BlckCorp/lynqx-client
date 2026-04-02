// 🌙 Lynqx Client - ESLint Configuration
export default [
  {
    files: ["**/*.{js,mjs}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        // Browser globals
        window: "readonly",
        document: "readonly",
        console: "readonly",
        alert: "readonly",
        confirm: "readonly",
        prompt: "readonly",
        
        // Tauri globals
        __TAURI__: "readonly",
        
        // ES6 globals
        fetch: "readonly",
        Promise: "readonly",
        
        // Socket.io
        io: "readonly"
      }
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-console": "off",
      "semi": ["error", "always"],
      "quotes": ["warn", "single"],
      "indent": ["warn", 4],
      "no-undef": "error",
      "eqeqeq": "warn"
    }
  }
];
