import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    include: ["src/**/*.test.js"],
    setupFiles: ["./src/__tests__/setup.js"],
  },
});
