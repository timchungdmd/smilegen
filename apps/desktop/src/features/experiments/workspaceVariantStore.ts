import { create } from "zustand";

export type WorkspaceVariant = "workspace" | "guided";

export function areWorkspaceExperimentsEnabled() {
  return import.meta.env.VITE_ENABLE_WORKSPACE_EXPERIMENTS === "1";
}

export function getEffectiveWorkspaceVariant(
  requestedVariant: WorkspaceVariant,
) {
  return areWorkspaceExperimentsEnabled() ? requestedVariant : "guided";
}

interface WorkspaceVariantState {
  requestedVariant: WorkspaceVariant;
  variant: WorkspaceVariant;
  setVariant: (variant: WorkspaceVariant) => void;
  syncVariantGate: () => void;
}

export const useWorkspaceVariantStore = create<WorkspaceVariantState>()((set) => ({
  requestedVariant: "workspace",
  variant: getEffectiveWorkspaceVariant("workspace"),
  setVariant: (requestedVariant) =>
    set({
      requestedVariant,
      variant: getEffectiveWorkspaceVariant(requestedVariant),
    }),
  syncVariantGate: () =>
    set((state) => ({
      variant: getEffectiveWorkspaceVariant(state.requestedVariant),
    })),
}));
