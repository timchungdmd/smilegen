export type ShortcutScope = "global" | "design" | "import" | "review";

export interface ShortcutBinding {
  key: string;          // e.g. "z", "s", "e"
  ctrl?: boolean;       // Cmd on Mac
  shift?: boolean;
  description: string;
  action: string;       // action identifier
  scope: ShortcutScope;
}

export const SHORTCUTS: ShortcutBinding[] = [
  { key: "z", ctrl: true, description: "Undo", action: "undo", scope: "global" },
  { key: "z", ctrl: true, shift: true, description: "Redo", action: "redo", scope: "global" },
  { key: "s", ctrl: true, description: "Save case", action: "save", scope: "global" },
  { key: "e", ctrl: true, description: "Export STL", action: "export", scope: "global" },
  { key: "g", ctrl: true, description: "Generate design", action: "generate", scope: "global" },
  { key: "1", description: "Import view", action: "view:import", scope: "global" },
  { key: "2", description: "Align view", action: "view:align", scope: "global" },
  { key: "3", description: "Design view", action: "view:design", scope: "global" },
  { key: "4", description: "Review view", action: "view:review", scope: "global" },
  { key: "5", description: "Present view", action: "view:present", scope: "global" },
  { key: "Tab", description: "Next tooth", action: "nextTooth", scope: "design" },
  { key: "Escape", description: "Deselect", action: "deselect", scope: "global" },
  { key: " ", description: "Toggle overlay", action: "toggleOverlay", scope: "design" },
  { key: "[", description: "Previous variant", action: "prevVariant", scope: "design" },
  { key: "]", description: "Next variant", action: "nextVariant", scope: "design" },
  { key: "w", description: "Translate mode", action: "gimbal:translate", scope: "design" },
  { key: "x", description: "Rotate mode", action: "gimbal:rotate", scope: "design" },
  { key: "r", description: "Scale mode", action: "gimbal:scale", scope: "design" },
  { key: "f", description: "Frame selected", action: "frameSelected", scope: "design" },
  { key: "?", description: "Show shortcuts", action: "showShortcuts", scope: "global" },
];

/**
 * Match a keyboard event against the shortcut bindings.
 * When `currentScope` is provided, only global bindings and bindings matching
 * that scope are considered. When omitted, all bindings are checked (legacy).
 * Returns the action string if matched, null otherwise.
 */
export function matchShortcut(event: KeyboardEvent, currentScope?: ShortcutScope): string | null {
  const isCtrl = event.metaKey || event.ctrlKey;
  const isShift = event.shiftKey;

  for (const binding of SHORTCUTS) {
    const wantsCtrl = binding.ctrl === true;
    const wantsShift = binding.shift === true;

    if (event.key !== binding.key) continue;
    if (wantsCtrl !== isCtrl) continue;
    if (wantsShift !== isShift) continue;

    // Scope filtering: global shortcuts always fire; scoped shortcuts only
    // fire when the current scope matches.
    if (currentScope && binding.scope !== "global" && binding.scope !== currentScope) {
      continue;
    }

    return binding.action;
  }

  return null;
}
