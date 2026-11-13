import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

const paths = [
  {
    title: "Prepare for placements",
    description:
      "Short aptitude, reasoning, verbal and programming sessions. An explanation with every answer.",
    href: "/practice",
    action: "Find a practice topic",
  },
  {
    title: "Make your work visible",
    description:
      "Turn your projects and skills into a portfolio. Start with a draft, publish when you’re ready.",
    href: "/learn/portfolio",
    action: "Build your portfolio",
  },
  {
    title: "Keep your place",
    description:
      "See what you’ve practised, revisit mistakes and choose the next topic to work on.",
    href: "/learn",
    action: "Open your workspace",
  },
  {
    title: "Take a useful break",
    description:
      "A pattern to spot. A number to remember. Quick games for the gap between study sessions.",
    href: "/games",
    action: "Try a warm-up",
  },
];

export function WhyUs() {
  return (
    <section className="section-block pt-2" aria-labelledby="paths-heading">
      <div className="page-container">
        <div className="section-intro">
          <h2 id="paths-heading" className="section-title">
            What are you working on?
          </h2>
          <p className="text-sm text-muted-foreground">
            A few good places to start.
          </p>
        </div>
        <div className="path-grid">
          {paths.map((path, index) => (
            <article className="path-item" key={path.href}>
              <span className="path-number">0{index + 1} /</span>
              <h3>{path.title}</h3>
              <p>{path.description}</p>
              <Link href={path.href} className="text-link mt-3">
                {path.action}
                <ArrowUpRight aria-hidden="true" size={15} />
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
