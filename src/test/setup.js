import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import { webcrypto } from "node:crypto";

// jsdom exposes getRandomValues but not SubtleCrypto. PAT encryption tests
// need the real WebCrypto implementation, so fall back to Node's.
if (!globalThis.crypto?.subtle) {
  Object.defineProperty(globalThis, "crypto", {
    value: webcrypto,
    configurable: true,
  });
}

// jsdom does not implement ResizeObserver, which the responsive navbar uses.
if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

afterEach(() => {
  cleanup();
});