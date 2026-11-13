import Link from "next/link";
import { Brand } from "@/components/brand";
import { LEGAL_PAGES } from "@/lib/legal";
import { CONTACT_EMAIL } from "@/lib/contact";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="page-container">
        <div className="footer-grid">
          <div>
            <Brand />
            <p className="footer-caption">
              A student learning brand. Notes for the semester, practice for
              placements, and room to build something of your own.
            </p>
            <a
              href="https://github.com/procoderji-com/procoderji"
              className="text-link mt-3"
            >
              Open source. Open to your ideas.
            </a>
          </div>
          <div>
            <h2 className="footer-heading">Your next step</h2>
            <nav aria-label="Explore" className="footer-links">
              <Link href="/practice">Placement practice</Link>
              <Link href="/dashboard">Course notes</Link>
              <Link href="/games">Practice games</Link>
              <Link href="/learn/portfolio">Portfolio builder</Link>
              <Link href="/learn">My learning</Link>
            </nav>
          </div>
          <div>
            <h2 className="footer-heading">The project</h2>
            <nav aria-label="Project" className="footer-links">
              <Link href="/about">About ProCoderJii</Link>
              <a href="https://github.com/procoderji-com/procoderji/blob/dev/CONTRIBUTING.md">
                Contribute
              </a>
              <a href={`mailto:${CONTACT_EMAIL}`}>Contact the team</a>
            </nav>
          </div>
        </div>
        <div className="footer-bottom">
          <span>
            © {new Date().getUTCFullYear()} ProCoderJii. Keep learning.
          </span>
          <nav aria-label="Legal" className="flex flex-wrap gap-x-5 gap-y-3">
            {LEGAL_PAGES.map((page) => (
              <Link
                className="hover:underline"
                key={page.path}
                href={page.path}
              >
                {page.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
