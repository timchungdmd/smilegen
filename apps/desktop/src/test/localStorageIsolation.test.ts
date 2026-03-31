test("localStorage starts empty for a test", () => {
  expect(globalThis.localStorage.getItem("smilegen-test-key")).toBeNull();
  globalThis.localStorage.setItem("smilegen-test-key", "set");
  expect(globalThis.localStorage.getItem("smilegen-test-key")).toBe("set");
});

test("localStorage is reset before the next test", () => {
  expect(globalThis.localStorage.getItem("smilegen-test-key")).toBeNull();
});
