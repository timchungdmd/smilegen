import { readFile } from "node:fs/promises";

test("desktop app includes a root html entrypoint", async () => {
  const html = await readFile("index.html", "utf8");

  expect(html).toContain('id="root"');
  expect(html).toContain('/src/main.tsx');
});
