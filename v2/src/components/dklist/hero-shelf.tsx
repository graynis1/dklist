import { BookCover } from "./book-cover";
import { demoBooks } from "./demo-books";

const shelf = [demoBooks[4], demoBooks[0], demoBooks[1], demoBooks[2], demoBooks[6]];
const rotations = [-6, 3, -2, 5, -4];
const lifts = [0, -18, 6, -8, 2];

/** Editorial hero visual: a loosely arranged stack of jackets, not a grid. */
export function HeroShelf() {
  return (
    <div className="relative flex h-[420px] items-end justify-center gap-[-1.5rem] pb-6 sm:h-[460px]">
      <div className="absolute inset-x-4 bottom-4 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      {shelf.map((book, i) => (
        <div
          key={book.title}
          className="relative -ml-6 first:ml-0"
          style={{
            zIndex: i,
            transform: `translateY(${lifts[i]}px)`,
          }}
        >
          <BookCover
            title={book.title}
            author={book.author}
            tone={book.tone}
            size={i === 1 ? "lg" : "md"}
            rotate={rotations[i]}
          />
        </div>
      ))}
    </div>
  );
}
