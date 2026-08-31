import "server-only";
import { getEmbedding, cosineSimilarity } from "@/lib/embeddings";

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

    const abusiveScore = Math.max(...refs.abusive.map((v) => cosineSimilarity(vector, v)));
    const neutralScore = Math.max(...refs.neutral.map((v) => cosineSimilarity(vector, v)));
    return abusiveScore - neutralScore > BLOCK_MARGIN;
  } catch (err) {
    // Model load hiccup shouldn't take down comment posting - fail open,
    // the existing keyword-based findFlaggedWords() check still applies.
    console.error("[moderation] AI check failed, falling back to keyword-only:", err);
    return false;
  }
}

/**
 * "Paylaşımlar ve görseller vs hep kitap ile ilgili olmak zorunda" -
 * maintainer's ask that free-form posts stay on-topic, checked with the
 * same local embedding model as isLikelyAbusive (no separate model, no
 * external API). Deliberately NOT wired into every comment - a book/
 * writer/translator comment already has a real anchor entity and a short,
 * conversational reply ("Katılıyorum", "Aynen öyle") would false-positive
 * against any topic classifier; this only guards the genuinely free-form
 * surfaces (standalone feed posts, Askıda Kitap listing text) where
 * off-topic content can actually appear with no anchor at all. Same
 * margin-gated, fail-open design as the abuse check - a boundary case
 * (e.g. a post about an author's life, or a bookstore's location) should
 * pass through rather than being hard-blocked by an imperfect classifier.
 *
 * Text-only: this does NOT check uploaded images - that would need a real
 * vision/CLIP-style model, a separate piece of infra this session doesn't
 * have. Flagged here rather than silently skipped.
 */
const BOOK_RELATED_EXAMPLES = [
  "bu kitabı yeni bitirdim, çok etkilendim",
  "yazarın son romanı hakkında ne düşünüyorsunuz",
  "bu ay okuduğum en iyi kitap buydu",
  "kütüphaneden aldığım kitabı okumaya başladım",
  "bu çeviri gerçekten başarılı olmuş",
  "kitabın kapağı da içeriği kadar güzel",
  "bu yazarın tüm kitaplarını okudum",
  "okuma listeme yeni bir kitap ekledim",
  "bu kitabı herkese tavsiye ederim",
  "romanın sonu beni çok şaşırttı",
];

const OFF_TOPIC_EXAMPLES = [
  "bugün hava çok güzel dışarı çıkalım",
  "yeni telefon modelini aldım harika",
  "maçı izlediniz mi ne kadar heyecanlıydı",
  "bu ürün çok ucuza satılıyor hemen alın",
  "seçimlerde kim kazanacak sizce",
  "spor salonuna yeni üye oldum",
  "arabamı sattım yenisini alacağım",
  "hafta sonu tatile gidiyorum",
  "bu tarifi deneyin çok lezzetli oluyor",
  "kripto para fiyatları yükseliyor",
];

let bookTopicVectors: { onTopic: number[][]; offTopic: number[][] } | null = null;

async function getBookTopicVectors() {
  if (!bookTopicVectors) {
    const [onTopic, offTopic] = await Promise.all([
      Promise.all(BOOK_RELATED_EXAMPLES.map(getEmbedding)),
      Promise.all(OFF_TOPIC_EXAMPLES.map(getEmbedding)),
    ]);
    bookTopicVectors = { onTopic, offTopic };
  }
  return bookTopicVectors;
}

// Wider margin than the abuse check - "is this about books" is a much
// fuzzier boundary than "is this abusive", so this only rejects content
// that reads as clearly, confidently off-topic rather than merely closer
// to the off-topic examples.
const OFF_TOPIC_MARGIN = 0.15;

export async function isOffTopicFromBooks(text: string): Promise<boolean> {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length < 8) return false; // too short to classify reliably

  try {
    const [vector, refs] = await Promise.all([getEmbedding(trimmed), getBookTopicVectors()]);
    if (vector.length === 0) return false;

    const onTopicScore = Math.max(...refs.onTopic.map((v) => cosineSimilarity(vector, v)));
    const offTopicScore = Math.max(...refs.offTopic.map((v) => cosineSimilarity(vector, v)));
    return offTopicScore - onTopicScore > OFF_TOPIC_MARGIN;
  } catch (err) {
    console.error("[moderation] Book-topic AI check failed, allowing through:", err);
    return false;
  }
}
