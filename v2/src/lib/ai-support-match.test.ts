import { describe, expect, it } from "vitest";
import { matchFaqAnswer, type FaqQuestion } from "./ai-support-match";

const QUESTIONS: FaqQuestion[] = [
  { q: "Şifremi unuttum, ne yapmalıyım?", a: "Giriş sayfasındaki linkten sıfırla." },
  { q: "2FA nasıl açılır?", a: "Profili Düzenle sayfasından açabilirsin." },
  { q: "Profilimi gizli yapabilir miyim?", a: "Evet, Gizli Profil seçeneğinden." },
];

describe("matchFaqAnswer", () => {
  it("maps a plain digit to the matching 1-indexed FAQ answer", () => {
    expect(matchFaqAnswer("2", QUESTIONS)).toBe(QUESTIONS[1].a);
  });

  it("maps the first option (1) correctly, not off-by-one", () => {
    expect(matchFaqAnswer("1", QUESTIONS)).toBe(QUESTIONS[0].a);
  });

  it("trims surrounding whitespace/newlines around the digit", () => {
    expect(matchFaqAnswer("  3  \n", QUESTIONS)).toBe(QUESTIONS[2].a);
  });

  it("returns null for the model's explicit no-match sentinel", () => {
    expect(matchFaqAnswer("YOK", QUESTIONS)).toBeNull();
  });

  it("returns null for empty output", () => {
    expect(matchFaqAnswer("", QUESTIONS)).toBeNull();
  });

  it("returns null when the response has no digit at all", () => {
    expect(matchFaqAnswer("bu sorunun cevabı yok gibi", QUESTIONS)).toBeNull();
  });

  it("returns null for a digit outside the real option range", () => {
    expect(matchFaqAnswer("99", QUESTIONS)).toBeNull();
  });

  it("returns null for option 0 (the prompt is 1-indexed, 0 isn't valid)", () => {
    expect(matchFaqAnswer("0", QUESTIONS)).toBeNull();
  });

  it("still resolves correctly when the model wraps the digit in extra text", () => {
    // The prompt asks for a bare digit, but models don't always comply -
    // the parser should still find the first digit run rather than fail.
    expect(matchFaqAnswer("Cevap: 2 numaralı seçenek.", QUESTIONS)).toBe(QUESTIONS[1].a);
  });

  it("treats a multi-digit run as one number, not separate digits", () => {
    // With only 3 real questions "12" has no valid mapping - confirms the
    // regex captures the whole digit run (index 11) rather than stopping
    // at the first character and accidentally matching option 1.
    expect(matchFaqAnswer("12", QUESTIONS)).toBeNull();
  });
});
