import type { BookCoverTone } from "./book-cover";

// Placeholder catalog data for the Phase 0 design preview only - Phase 1 replaces
// this with real Drizzle queries against the book/writer tables.
export interface DemoBook {
  title: string;
  author: string;
  genre: string;
  tone: BookCoverTone;
  rating: number;
  ratingCount: string;
  excerpt?: string;
}

export const demoBooks: DemoBook[] = [
  {
    title: "Suç ve Ceza",
    author: "Fyodor Dostoyevski",
    genre: "Klasik",
    tone: "oxblood",
    rating: 4.7,
    ratingCount: "128,4K oy",
    excerpt:
      "Raskolnikov'un vicdanıyla giriştiği amansız hesaplaşma — insan ruhunun karanlığına ve kefaretin doğasına dair yazılmış en derin romanlardan biri.",
  },
  {
    title: "Kürk Mantolu Madonna",
    author: "Sabahattin Ali",
    genre: "Roman",
    tone: "dusk",
    rating: 4.8,
    ratingCount: "312,9K oy",
  },
  {
    title: "Simyacı",
    author: "Paulo Coelho",
    genre: "Felsefi Kurgu",
    tone: "ochre",
    rating: 4.3,
    ratingCount: "204,1K oy",
  },
  {
    title: "Küçük Prens",
    author: "Antoine de Saint-Exupéry",
    genre: "Novella",
    tone: "sage",
    rating: 4.6,
    ratingCount: "441,2K oy",
  },
  {
    title: "1984",
    author: "George Orwell",
    genre: "Distopya",
    tone: "ink",
    rating: 4.9,
    ratingCount: "389,7K oy",
  },
  {
    title: "Siddhartha",
    author: "Hermann Hesse",
    genre: "Felsefi Kurgu",
    tone: "teal",
    rating: 4.5,
    ratingCount: "97,3K oy",
  },
  {
    title: "İnsanın Anlam Arayışı",
    author: "Viktor E. Frankl",
    genre: "Anı",
    tone: "plum",
    rating: 4.8,
    ratingCount: "156,0K oy",
  },
  {
    title: "Fareler ve İnsanlar",
    author: "John Steinbeck",
    genre: "Klasik",
    tone: "mustard",
    rating: 4.4,
    ratingCount: "88,5K oy",
  },
  {
    title: "Yabancı",
    author: "Albert Camus",
    genre: "Felsefi Kurgu",
    tone: "terracotta",
    rating: 4.5,
    ratingCount: "142,8K oy",
  },
  {
    title: "Sineklerin Tanrısı",
    author: "William Golding",
    genre: "Klasik",
    tone: "olive",
    rating: 4.1,
    ratingCount: "76,2K oy",
  },
];
