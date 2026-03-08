import { detectCollisions } from "./collisionDetector";

test("returns empty array for fewer than two teeth", () => {
  const results = detectCollisions([
    { toothId: "8", positionX: 0, width: 8, height: 10, depth: 5 }
  ]);

  expect(results).toHaveLength(0);
});

test("detects no collision for well-spaced teeth", () => {
  const teeth = [
    { toothId: "8", positionX: -20, width: 8, height: 10, depth: 5 },
    { toothId: "9", positionX: 0, width: 8, height: 10, depth: 5 },
    { toothId: "10", positionX: 20, width: 8, height: 10, depth: 5 }
  ];

  const results = detectCollisions(teeth);

  expect(results).toHaveLength(2);
  expect(results.every((r) => r.type === "gap")).toBe(true);
  expect(results.every((r) => r.distance > 0)).toBe(true);
});

test("detects overlap for overlapping teeth", () => {
  const teeth = [
    { toothId: "8", positionX: 0, width: 8, height: 10, depth: 5 },
    { toothId: "9", positionX: 6, width: 8, height: 10, depth: 5 }
  ];

  const results = detectCollisions(teeth);

  expect(results).toHaveLength(1);
  expect(results[0].type).toBe("overlap");
  expect(results[0].distance).toBeLessThan(0);
  expect(results[0].toothA).toBe("8");
  expect(results[0].toothB).toBe("9");
});

test("detects contact for adjacent teeth within threshold", () => {
  const teeth = [
    { toothId: "8", positionX: 0, width: 8, height: 10, depth: 5 },
    { toothId: "9", positionX: 8.05, width: 8, height: 10, depth: 5 }
  ];

  const results = detectCollisions(teeth);

  expect(results).toHaveLength(1);
  expect(results[0].type).toBe("contact");
  expect(Math.abs(results[0].distance)).toBeLessThanOrEqual(0.1);
});

test("sorts teeth by positionX before checking adjacency", () => {
  const teeth = [
    { toothId: "10", positionX: 20, width: 8, height: 10, depth: 5 },
    { toothId: "8", positionX: 0, width: 8, height: 10, depth: 5 },
    { toothId: "9", positionX: 10, width: 8, height: 10, depth: 5 }
  ];

  const results = detectCollisions(teeth);

  expect(results).toHaveLength(2);
  expect(results[0].toothA).toBe("8");
  expect(results[0].toothB).toBe("9");
  expect(results[1].toothA).toBe("9");
  expect(results[1].toothB).toBe("10");
});
