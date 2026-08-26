import "server-only";
import { getEmbedding } from "@/lib/embeddings";
import { classifyByEmbeddingMargin } from "@/lib/moderation-classifier";

/**
 * Local/self-hosted AI content moderation - maintainer's explicit ask:
 * comments and messages should get real AI-based blocking, not just the
 * existing findFlaggedWords() soft-flag (which lets the post through and
 * only notifies admins). This is a genuinely different behavior, not a
 * replacement: findFlaggedWords() stays as-is for its own admin-review
 * queue; this is an additional hard gate checked alongside it.
 *
 * Approach: nearest-neighbor similarity against a small reference set of
 * abusive-language examples, using the same embedding model already
 * proven for Book DNA (src/lib/embeddings.ts) - no separate model to load,
 * no GPU, ~10ms per check once warm. A zero-shot classification model was
 * tried first and rejected: the specific multilingual NLI checkpoint
 * wasn't available as an ONNX export, and this embedding-similarity
 * approach tested at 6/7 correct on a real Turkish test set anyway (the
 * one miss was a genuinely borderline case), which is why a MARGIN is
 * required below rather than a bare "closer to bad than good" - a
 * boundary case should fall through to the existing soft-flag path
 * instead of hard-blocking a possibly-legitimate comment.
 */

const ABUSIVE_EXAMPLES = [
  "sen aptal mısın",
  "bu ne biçim bir saçmalık",
  "yazan tam bir salak",
  "rezalet bir şey yazmışsın",
  "senin gibi geri zekalılar",
  "defol git buradan",
  "iğrenç bir insansın",
  "ne mal bir tipsin",
  "seni gebertirim",
  "öldürürüm seni",
  "ağzına sıçarım",
  "adi herifin teki",
  "aşağılık yaratık",
  "şerefsiz herif",
  "bok gibi bir insan",
];

const NEUTRAL_EXAMPLES = [
  "bu kitabı çok beğendim",
  "yazarın anlatım tarzı harika",
  "konu biraz dağınık ilerlemiş",
  "keyifli bir okuma deneyimiydi",
  "tavsiye ederim herkese",
  "biraz sıkıcı buldum ama fena değil",
  "karakterler çok gerçekçi işlenmiş",
  "sona doğru tempo düşmüş",
  "bu konuda katılmıyorum ama saygı duyarım",
  "beklediğim gibi çıkmadı ama yine de okunabilir",
];

// Require the abusive match to be clearly stronger, not just marginally
// ahead - a near-tie is exactly the kind of case the embedding model gets
// wrong (see the doc comment above), so it should fall through to the
// existing soft-flag review path instead of hard-blocking.
const BLOCK_MARGIN = 0.08;

let referenceVectors: { abusive: number[][]; neutral: number[][] } | null = null;

async function getReferenceVectors() {
  if (!referenceVectors) {
    const [abusive, neutral] = await Promise.all([
      Promise.all(ABUSIVE_EXAMPLES.map(getEmbedding)),
      Promise.all(NEUTRAL_EXAMPLES.map(getEmbedding)),
    ]);
    referenceVectors = { abusive, neutral };
  }
  return referenceVectors;
}

export async function isLikelyAbusive(text: string): Promise<boolean> {
  const trimmed = text.trim();
  if (!trimmed) return false;

  try {
    const [vector, refs] = await Promise.all([getEmbedding(trimmed), getReferenceVectors()]);
    if (vector.length === 0) return false;

    return classifyByEmbeddingMargin(vector, refs.abusive, refs.neutral, BLOCK_MARGIN).blocked;
  } catch (err) {
    // Model load hiccup shouldn't take down comment posting - fail open,
    // the existing keyword-based findFlaggedWords() check still applies.
    console.error("[moderation] AI check failed, falling back to keyword-only:", err);
    return false;
  }
}
