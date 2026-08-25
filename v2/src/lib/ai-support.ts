import "server-only";
import { FAQ_CATEGORIES } from "@/db/queries/support";
import { matchFaqAnswer } from "@/lib/ai-support-match";

const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434/api/generate";
const MODEL = "qwen2.5:7b";

/**
 * Maintainer's explicit ask: destek sistemi AI'a bağlı otomatik cevap
 * versin, ama "chatbot değil" - serbestçe metin üretmesin, önceden
 * tanımlanmış gerçek FAQ cevapları arasından duruma en uygun olanı seçsin.
 * Grounded by design, not generative - the model only ever picks from (or
 * quotes) real, maintainer-reviewed answers already in FAQ_CATEGORIES,
 * exactly the same "never let it invent facts" principle already applied
 * to the AI book-summary feature after that one demonstrably hallucinated.
 * Returns null (falls through to "bir ekip üyesi sana dönüş yapacak") if
 * nothing in the category's real FAQ list actually answers the question -
 * an honest "I don't know" beats a fabricated answer.
 */
export async function getAiSupportResponse(
  categorySlug: string,
  userMessage: string,
): Promise<string | null> {
  const category = FAQ_CATEGORIES.find((c) => c.slug === categorySlug);
  if (!category || category.questions.length === 0) return null;

  const optionsList = category.questions
    .map((q, i) => `${i + 1}. Soru: "${q.q}"\n   Cevap: "${q.a}"`)
    .join("\n\n");

  const prompt = [
    `Bir kullanıcı "${category.label}" kategorisinde şu mesajı gönderdi: "${userMessage}"`,
    ``,
    `Aşağıda bu kategori için önceden onaylanmış GERÇEK soru-cevap seçenekleri var:`,
    ``,
    optionsList,
    ``,
    `GÖREV: Kullanıcının mesajı bu seçeneklerden biriyle GERÇEKTEN eşleşiyorsa, SADECE o seçeneğin numarasını tek bir rakam olarak yaz (örn: "2").`,
    `Hiçbiri gerçekten eşleşmiyorsa SADECE "YOK" yaz. Başka hiçbir şey yazma, açıklama ekleme, yeni bir cevap uydurma.`,
  ].join("\n");

  try {
    const res = await fetch(OLLAMA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        model: MODEL,
        prompt,
        stream: false,
        options: { temperature: 0.1 },
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;

    const data = (await res.json()) as { response?: string };
    return matchFaqAnswer(data.response ?? "", category.questions);
  } catch {
    // Ollama unavailable (not running locally, or a real prod deploy with
    // no local model yet) - fail silently, the ticket itself still gets
    // filed normally, a human just answers it instead of the AI shortcut.
    return null;
  }
}
