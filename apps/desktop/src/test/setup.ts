import "@testing-library/jest-dom/vitest";

// Polyfill ResizeObserver for React Three Fiber in jsdom
if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// Polyfill URL.revokeObjectURL for jsdom (needed for vi.spyOn in store tests)
if (typeof URL.revokeObjectURL === "undefined") {
  URL.revokeObjectURL = () => {};
}

// Polyfill URL.createObjectURL for jsdom (needed for store tests)
if (typeof URL.createObjectURL === "undefined") {
  URL.createObjectURL = () => "blob:http://localhost/mock";
}
