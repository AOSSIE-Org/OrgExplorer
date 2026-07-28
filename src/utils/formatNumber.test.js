import { describe, it, expect } from "vitest";
import { formatNumber } from "./formatNumber";

describe("formatNumber", () => {
    it("return a number in a form of a string if it is lesser than 1000", () => {
        expect(formatNumber(500)).toBe("500");
    });
    it("formats numbers in the thousands as K", () => {
        expect(formatNumber(999_949)).toBe("999.9K")
    });
    it("formats numbers in the millions as M", () => {
        expect(formatNumber(999_950)).toBe("1.0M");
    });
    it("formats numbers in the billions as B", () => {
        expect(formatNumber(999_950_000)).toBe("1.0B");
    });

    it("handles exactly 1000", () => {
        expect(formatNumber(1000)).toBe("1.0K");
    });
})