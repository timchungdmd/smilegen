import "@testing-library/jest-dom/vitest";

// Polyfill ResizeObserver for React Three Fiber in jsdom
if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// Polyfill URL methods for jsdom — these are not implemented in the jsdom test environment
URL.revokeObjectURL = URL.revokeObjectURL ?? (() => {});
URL.createObjectURL = URL.createObjectURL ?? (() => "blob:http://localhost/mock");
