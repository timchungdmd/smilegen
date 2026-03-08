import "@testing-library/jest-dom/vitest";

// Polyfill ResizeObserver for React Three Fiber in jsdom
if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
