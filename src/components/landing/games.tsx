import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function GamesSection() {
  return (
    <section
      id="games"
      aria-labelledby="games-heading"
      className="section-block"
    >
      <div className="page-container">
        <div className="section-intro">
          <div>
            <p className="eyebrow">Between the big study sessions</p>
            <h2 id="games-heading" className="section-title mt-3">
              A small challenge. A fresh start.
            </h2>
          </div>
          <Link href="/games" className="text-link">
            Explore games <ArrowRight aria-hidden="true" size={16} />
          </Link>
        </div>
        <div className="games-preview">
          <article className="game-preview">
            <div className="game-pattern" aria-hidden="true">
              {["2", "4", "8", "?"].map((value) => (
                <span key={value}>{value}</span>
              ))}
            </div>
            <h3>Pattern Sprint</h3>
            <p>
              Eight number sequences. Find the pattern, check the rule, and see
              how you did.
            </p>
            <Link className="text-link mt-4" href="/games/pattern-sprint">
              Play Pattern Sprint <ArrowRight aria-hidden="true" size={16} />
            </Link>
          </article>
          <article className="game-preview">
            <div className="game-pattern" aria-hidden="true">
              {["7", "3", "9", "1"].map((value) => (
                <span key={value}>{value}</span>
              ))}
            </div>
            <h3>Digit Recall</h3>
            <p>
              A number appears, then disappears. How many digits can you keep in
              mind?
            </p>
            <Link className="text-link mt-4" href="/games/digit-recall">
              Play Digit Recall <ArrowRight aria-hidden="true" size={16} />
            </Link>
          </article>
        </div>
      </div>
    </section>
  );
}
