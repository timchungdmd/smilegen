import { useSidecarStore } from "./useSidecarStore";

// Reset state before each test to avoid cross-test contamination
beforeEach(() => {
  useSidecarStore.setState({ sidecarState: "starting" });
});

test("initial sidecar state is 'starting'", () => {
  expect(useSidecarStore.getState().sidecarState).toBe("starting");
});

test("setSidecarState transitions to 'ready'", () => {
  useSidecarStore.getState().setSidecarState("ready");
  expect(useSidecarStore.getState().sidecarState).toBe("ready");
});

test("setSidecarState transitions to 'unavailable'", () => {
  useSidecarStore.getState().setSidecarState("unavailable");
  expect(useSidecarStore.getState().sidecarState).toBe("unavailable");
});
