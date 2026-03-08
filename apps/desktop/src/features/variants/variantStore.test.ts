import { createDefaultVariants } from "./variantStore";

test("creates conservative, balanced, and enhanced variants", () => {
  const variants = createDefaultVariants();

  expect(variants.map((item) => item.label)).toEqual([
    "conservative",
    "balanced",
    "enhanced"
  ]);
});
