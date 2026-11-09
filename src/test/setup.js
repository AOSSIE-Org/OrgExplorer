import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

if (typeof global.ResizeObserver === "undefined") {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

if (typeof window.scrollTo === "undefined" || !window.scrollTo) {
  window.scrollTo = vi.fn();
}

afterEach(() => {
  cleanup();
});
