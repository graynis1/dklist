export interface FaqQuestion {
  q: string;
  a: string;
}

/**
 * Parses the grounded-AI support model's raw output (per ai-support.ts's
 * prompt contract: a single option number, or "YOK" if nothing matches)
 * into the corresponding pre-approved FAQ answer, or null if nothing
 * usable comes back. Pulled out of ai-support.ts as its own pure function
 * - the actual model call needs a live Ollama server and isn't something
 * this cloud sandbox can exercise, but this parsing step (find the digit,
 * map it back to a real FAQ answer, or fail closed) has no such dependency
 * and is exactly the kind of "did the model's answer actually resolve to
 * one of the real options" logic worth a real regression test, since a
 * parsing slip here would either silently answer with the wrong FAQ entry
 * or (safer, but still worth catching) needlessly fall through to "bir
 * ekip üyesi sana dönüş yapacak" for a real match.
 */
export function matchFaqAnswer(rawResponse: string, questions: FaqQuestion[]): string | null {
  const match = rawResponse.trim().match(/\d+/);
  if (!match) return null;

  const index = Number(match[0]) - 1;
  return questions[index]?.a ?? null;
}
