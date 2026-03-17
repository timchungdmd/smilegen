export interface ShortcutBinding {
  key: string;          // e.g. "z", "s", "e"
  ctrl?: boolean;       // Cmd on Mac
  shift?: boolean;
  description: string;
  action: string;       // action identifier
}

export const SHORTCUTS: ShortcutBinding[] = [
  { key: "z", ctrl: true, description: "Undo", action: "undo" },
  { key: "z", ctrl: true, shift: true, description: "Redo", action: "redo" },
  { key: "s", ctrl: true, description: "Save case", action: "save" },
  { key: "e", ctrl: true, description: "Export STL", action: "export" },
  { key: "g", ctrl: true, description: "Generate design", action: "generate" },
  { key: "1", description: "Import view", action: "view:import" },
  { key: "2", description: "Align view", action: "view:align" },
  { key: "3", description: "Design view", action: "view:design" },
  { key: "4", description: "Review view", action: "view:review" },
  { key: "5", description: "Present view", action: "view:present" },
  { key: "Tab", description: "Next tooth", action: "nextTooth" },
  { key: "Escape", description: "Deselect", action: "deselect" },
  { key: " ", description: "Toggle overlay", action: "toggleOverlay" },
  { key: "[", description: "Previous variant", action: "prevVariant" },
  { key: "]", description: "Next variant", action: "nextVariant" }
];

/**
 * Match a keyboard event against the shortcut bindings.
 * Returns the action string if matched, null otherwise.
 */
export function matchShortcut(event: KeyboardEvent): string | null {
  const isCtrl = event.metaKey || event.ctrlKey;
  const isShift = event.shiftKey;

  for (const binding of SHORTCUTS) {
    const wantsCtrl = binding.ctrl === true;
    const wantsShift = binding.shift === true;

    if (event.key !== binding.key) continue;
    if (wantsCtrl !== isCtrl) continue;
    if (wantsShift !== isShift) continue;

    return binding.action;
  }

  return null;
}
