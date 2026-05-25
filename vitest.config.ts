import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.ts"],
      exclude: [
        "src/app.ts",
        "src/routes/**",
        "src/config/database.ts",
        "src/config/socket.ts",
      ],
    },
  },
});
