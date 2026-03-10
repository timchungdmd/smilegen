import { useSidecarStore } from "./useSidecarStore";

// Reset state before each test to avoid cross-test contamination
beforeEach(() => {
  useSidecarStore.setState({ state: "starting" });
});

test("initial sidecar state is 'starting'", () => {
  expect(useSidecarStore.getState().state).toBe("starting");
});

test("setState transitions to 'ready'", () => {
  useSidecarStore.getState().setState("ready");
  expect(useSidecarStore.getState().state).toBe("ready");
});

test("setState transitions to 'unavailable'", () => {
  useSidecarStore.getState().setState("unavailable");
  expect(useSidecarStore.getState().state).toBe("unavailable");
});
