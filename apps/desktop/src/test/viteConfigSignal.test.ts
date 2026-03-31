import { readFileSync } from "node:fs";
import { join } from "node:path";

test("vite build config does not override the chunk size warning threshold", () => {
  const configPath = join(import.meta.dirname, "../../vite.config.ts");
  const configSource = readFileSync(configPath, "utf8");

  expect(configSource).not.toMatch(/chunkSizeWarningLimit\s*:/);
});
