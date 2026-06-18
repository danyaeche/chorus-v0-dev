import { defineConfig } from "vitest/config";

// Pure-logic unit tests run in Node — no DOM needed.
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
