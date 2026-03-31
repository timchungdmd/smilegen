import { beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";

// Polyfill localStorage for zustand persist middleware in jsdom/vitest
// (Node.js workers may have a broken localStorage despite --localstorage-file)
if (typeof globalThis.localStorage === "undefined" || typeof globalThis.localStorage.setItem !== "function") {
  const store: Record<string, string> = {};
  globalThis.localStorage = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { for (const k of Object.keys(store)) delete store[k]; },
    get length() { return Object.keys(store).length; },
    key: (i: number) => Object.keys(store)[i] ?? null,
  } as Storage;
}

beforeEach(() => {
  globalThis.localStorage.clear();
});

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
