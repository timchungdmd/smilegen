import { summarizeTrustState } from "./trustEngine";

test("blocks export when any tooth is in a blocked state", () => {
  const result = summarizeTrustState([
    { toothId: "8", state: "ready" },
    { toothId: "9", state: "blocked" }
  ]);

  expect(result.exportBlocked).toBe(true);
});
