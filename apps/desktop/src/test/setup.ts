import "@testing-library/jest-dom/vitest";

// Polyfill ResizeObserver for React Three Fiber in jsdom
if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// Polyfill URL methods for jsdom — unconditional stubs ensure deterministic behavior
// regardless of jsdom version. These are safe to overwrite (plain no-op functions).
URL.revokeObjectURL = () => {};
URL.createObjectURL = () => "blob:http://localhost/mock";
