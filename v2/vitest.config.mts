import path from "node:path";
import { defineConfig } from "vitest/config";

// Resolves the same "@/*" -> "./src/*" alias tsconfig.json already declares,
// so unit tests can import modules the normal app way instead of every test
// file being forced onto relative "./foo" imports (the workaround every
// existing *.test.ts here used, since without this config "@/..." imports
// fail outright under plain vitest - confirmed directly, not assumed).
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
  },
  test: {
    environment: "node",
  },
});
