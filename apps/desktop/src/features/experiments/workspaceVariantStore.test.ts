import {
  getEffectiveWorkspaceVariant,
  useWorkspaceVariantStore,
} from "./workspaceVariantStore";

beforeEach(() => {
  useWorkspaceVariantStore.setState({
    requestedVariant: "workspace",
    variant: getEffectiveWorkspaceVariant("workspace"),
  });
  vi.unstubAllEnvs();
});

test("falls back to guided when workspace experiments are disabled", () => {
  expect(useWorkspaceVariantStore.getState().requestedVariant).toBe("workspace");
  expect(useWorkspaceVariantStore.getState().variant).toBe("guided");
});

test("switches between workspace and guided variants", () => {
  vi.stubEnv("VITE_ENABLE_WORKSPACE_EXPERIMENTS", "1");
  useWorkspaceVariantStore.getState().syncVariantGate();

  useWorkspaceVariantStore.getState().setVariant("guided");
  expect(useWorkspaceVariantStore.getState().variant).toBe("guided");

  useWorkspaceVariantStore.getState().setVariant("workspace");
  expect(useWorkspaceVariantStore.getState().variant).toBe("workspace");
});

test("coerces workspace requests back to guided when the flag is off", () => {
  useWorkspaceVariantStore.getState().setVariant("workspace");

  expect(useWorkspaceVariantStore.getState().requestedVariant).toBe("workspace");
  expect(useWorkspaceVariantStore.getState().variant).toBe("guided");
});
