import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { CONTACT_EMAIL } from "@/lib/contact";
import { channelUrl, getYoutubeChannelId } from "@/lib/youtube";

export function About() {
  const channel = getYoutubeChannelId();
  return (
    <section
      id="about"
      className="community-block"
      aria-labelledby="community-heading"
    >
      <div className="page-container community-layout">
        <div>
          <p className="eyebrow">More than a place to find notes</p>
          <h2 id="community-heading" className="section-title">
            Learning is better
            <br />
            with people around.
          </h2>
          <p>
            ProCoderJii brings together concept videos, study resources and
            student tools. We’re building a place to ask questions, share what
            you learn, and help the next person along.
          </p>
        </div>
        <div className="community-links">
          {channel && (
            <a
              href={channelUrl(channel)}
              target="_blank"
              rel="noopener noreferrer"
              className="community-link"
            >
              Learn with us on YouTube{" "}
              <ArrowUpRight size={19} aria-hidden="true" />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          )}
          <Link
            href="https://github.com/procoderji-com/procoderji"
            className="community-link"
          >
            Help build the open-source project{" "}
            <ArrowUpRight size={19} aria-hidden="true" />
          </Link>
          <a
            href={`mailto:${CONTACT_EMAIL}?subject=ProCoderJii%20student%20community`}
            className="community-link"
          >
            Ask about our student communities{" "}
            <ArrowUpRight size={19} aria-hidden="true" />
          </a>
          <Link href="/about" className="community-link">
            The story behind ProCoderJii{" "}
            <ArrowUpRight size={19} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
