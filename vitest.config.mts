import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)), "server-only": fileURLToPath(new URL("./scripts/server-only-test.mjs", import.meta.url)) } },
  test: {
    environment: "node",
    include: ["tests/tooling/**/*.test.ts", "tests/contracts/**/*.test.ts", "tests/unit/**/*.test.ts"],
    clearMocks: true,
    restoreMocks: true,
    reporters: ["default", "junit"],
    outputFile: { junit: "reports/vitest-junit.xml" },
  },
});
