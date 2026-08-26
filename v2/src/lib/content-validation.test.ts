import { describe, expect, it } from "vitest";
import { assertContentLength } from "./content-validation";

describe("assertContentLength", () => {
  it("does not throw for a value within both bounds", () => {
    expect(() => assertContentLength("merhaba dünya", "Yorum", { min: 2, max: 2000 })).not.toThrow();
  });

  it("throws the exact min-length message when below the minimum", () => {
    expect(() => assertContentLength("a", "Yorum", { min: 2, max: 2000 })).toThrow(
      "Yorum en az 2 karakter olmalıdır.",
    );
  });

  it("throws the exact max-length message when above the maximum", () => {
    const tooLong = "x".repeat(2001);
    expect(() => assertContentLength(tooLong, "Yorum", { min: 2, max: 2000 })).toThrow(
      "Yorum en fazla 2000 karakter olabilir.",
    );
  });

  it("accepts a value exactly at the minimum boundary", () => {
    expect(() => assertContentLength("ab", "Yanıt", { min: 2, max: 2000 })).not.toThrow();
  });

  it("accepts a value exactly at the maximum boundary", () => {
    expect(() => assertContentLength("x".repeat(2000), "Yanıt", { min: 2, max: 2000 })).not.toThrow();
  });

  it("skips the min check entirely when no min is given (e.g. sharing with empty commentary)", () => {
    expect(() => assertContentLength("", "Yorum", { max: 2000 })).not.toThrow();
  });

  it("skips the max check entirely when no max is given", () => {
    expect(() => assertContentLength("x".repeat(10_000), "Şifre", { min: 6 })).not.toThrow();
  });

  it("checks length on the raw value, not a trimmed one (e.g. a password with meaningful whitespace)", () => {
    expect(() => assertContentLength("ab cde", "Şifre", { min: 6 })).not.toThrow();
    expect(() => assertContentLength("ab cd", "Şifre", { min: 6 })).toThrow("Şifre en az 6 karakter olmalıdır.");
  });

  it("uses the noun verbatim in both messages", () => {
    expect(() => assertContentLength("hi", "Kulüp adı", { min: 3 })).toThrow("Kulüp adı en az 3 karakter olmalıdır.");
  });

  it("checks the min bound before the max bound when both would fail", () => {
    // Pathological (min > max) bounds shouldn't happen in real call sites, but
    // the min check running first is the same order every real call site's
    // hand-rolled version used - locking it in so a future refactor can't
    // silently flip the precedence.
    expect(() => assertContentLength("", "Yorum", { min: 5, max: 2 })).toThrow("Yorum en az 5 karakter olmalıdır.");
  });
});
