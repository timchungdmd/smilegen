import { matchShortcut } from "./keyboardShortcuts";

function createKeyEvent(overrides: Partial<KeyboardEvent>): KeyboardEvent {
  return {
    key: "",
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    ...overrides
  } as KeyboardEvent;
}

test("matchShortcut with Cmd+Z returns undo", () => {
  const event = createKeyEvent({ key: "z", metaKey: true });
  expect(matchShortcut(event)).toBe("undo");
});

test("matchShortcut with Ctrl+Z returns undo", () => {
  const event = createKeyEvent({ key: "z", ctrlKey: true });
  expect(matchShortcut(event)).toBe("undo");
});

test("matchShortcut with Cmd+Shift+Z returns redo", () => {
  const event = createKeyEvent({ key: "z", metaKey: true, shiftKey: true });
  expect(matchShortcut(event)).toBe("redo");
});

test("matchShortcut with plain 1 returns view:import", () => {
  const event = createKeyEvent({ key: "1" });
  expect(matchShortcut(event)).toBe("view:import");
});

test("matchShortcut with plain 2 returns view:align", () => {
  const event = createKeyEvent({ key: "2" });
  expect(matchShortcut(event)).toBe("view:align");
});

test("matchShortcut with Escape returns deselect", () => {
  const event = createKeyEvent({ key: "Escape" });
  expect(matchShortcut(event)).toBe("deselect");
});

test("matchShortcut returns null for unmatched key", () => {
  const event = createKeyEvent({ key: "q" });
  expect(matchShortcut(event)).toBeNull();
});

test("matchShortcut does not match Ctrl shortcut without Ctrl held", () => {
  const event = createKeyEvent({ key: "s" }); // plain "s" without Ctrl
  expect(matchShortcut(event)).toBeNull();
});

test("matchShortcut with Cmd+S returns save", () => {
  const event = createKeyEvent({ key: "s", metaKey: true });
  expect(matchShortcut(event)).toBe("save");
});
