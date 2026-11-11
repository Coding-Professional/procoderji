import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
import type { PortfolioData } from "../types";
import { portfolioInitials, portfolioProfileLinks, portfolioProjectHref, type PortfolioThemeId } from "./presentation";

export interface PortfolioThemeProps {
  data: PortfolioData;
  headingLevel?: 1 | 2;
  preview?: boolean;
}

const palettes = {
  simple: {
    frame: "rounded-3xl border border-slate-200 bg-white text-slate-950 shadow-sm",
    header: "border-b border-slate-200 bg-amber-50/70",
    avatar: "rounded-2xl border border-amber-200 bg-amber-100 text-amber-950",
    title: "font-sans",
    eyebrow: "text-amber-900",
    copy: "text-slate-600",
    section: "border-slate-200",
    tag: "border-slate-200 bg-slate-50 text-slate-700",
    card: "rounded-2xl border border-slate-200 bg-slate-50/60",
    link: "border-slate-300 text-slate-900 hover:border-slate-500 hover:bg-white focus-visible:outline-amber-700",
    detail: "text-slate-500",
  },
  developer: {
    frame: "rounded-2xl border border-slate-700 bg-slate-950 text-slate-50 shadow-sm",
    header: "border-b border-slate-700 bg-slate-900",
    avatar: "rounded-xl border border-amber-300/50 bg-amber-300/10 font-mono text-amber-200",
    title: "font-mono",
    eyebrow: "font-mono text-amber-300",
    copy: "text-slate-300",
    section: "border-slate-700",
    tag: "border-slate-700 bg-slate-900 font-mono text-slate-200",
    card: "rounded-xl border border-slate-700 bg-slate-900/70",
    link: "border-slate-600 text-slate-100 hover:border-amber-300 hover:bg-slate-800 focus-visible:outline-amber-300",
    detail: "text-slate-400",
  },
} as const;

function hasText(value: string | undefined): value is string {
  return Boolean(value?.trim());
}

function ThemeSection({ title, children, headingLevel, variant }: { title: string; children: ReactNode; headingLevel: 1 | 2; variant: PortfolioThemeId }) {
  const colors = palettes[variant];
  const Heading = headingLevel === 1 ? "h2" : "h3";
  return (
    <section aria-label={title} className={`min-w-0 border-t pt-7 first:border-t-0 first:pt-0 ${colors.section}`}>
      <Heading className={`mb-4 text-lg font-bold tracking-tight sm:text-xl ${colors.title}`}>{title}</Heading>
      {children}
    </section>
  );
}

export function ThemeFrame({ data, headingLevel = 1, preview = false, variant }: PortfolioThemeProps & { variant: PortfolioThemeId }) {
  const colors = palettes[variant];
  const Name = headingLevel === 1 ? "h1" : "h2";
  const EntryHeading = headingLevel === 1 ? "h3" : "h4";
  const links = portfolioProfileLinks(data);
  const skills = data.skills?.filter(hasText) ?? [];
  const projects = data.projects?.filter((entry) => hasText(entry.title)) ?? [];
  const education = data.education?.filter((entry) => hasText(entry.institution)) ?? [];
  const experience = data.experience?.filter((entry) => hasText(entry.organization) || hasText(entry.role)) ?? [];
  const achievements = data.achievements?.filter(hasText) ?? [];
  const text = `whitespace-pre-line leading-7 [overflow-wrap:anywhere] ${colors.copy}`;

  return (
    <article aria-label={preview ? "Portfolio preview" : undefined} className={`min-w-0 overflow-hidden [overflow-wrap:anywhere] ${colors.frame}`} data-portfolio-theme={variant}>
      {variant === "developer" && (
        <div aria-hidden="true" className="flex items-center gap-2 border-b border-slate-700 px-6 py-3 font-mono text-xs text-slate-300 sm:px-9">
          <span className="h-2 w-2 rounded-full bg-amber-300" />
          portfolio.md
        </div>
      )}
      <header className={`p-6 sm:p-9 ${colors.header}`}>
        <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">
          <div aria-hidden="true" className={`flex h-16 w-16 shrink-0 items-center justify-center text-2xl font-extrabold sm:h-20 sm:w-20 sm:text-3xl ${colors.avatar}`}>
            {portfolioInitials(data.name)}
          </div>
          <div className="min-w-0 flex-1">
            <p className={`mb-2 text-xs font-bold uppercase tracking-widest ${colors.eyebrow}`}>
              {preview ? "Your portfolio preview" : "Student portfolio"}
            </p>
            <Name className={`text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl ${colors.title}`}>
              {hasText(data.name) ? data.name : "Your name"}
            </Name>
            <p className={`mt-3 max-w-2xl text-base leading-7 sm:text-lg ${colors.copy}`}>
              {hasText(data.headline) ? data.headline : "Add a headline that describes what you do."}
            </p>
            {links.length > 0 && (
              <nav aria-label="Portfolio contact links" className="mt-5 flex flex-wrap gap-2">
                {links.map((link) => (
                  <a key={link.label} href={link.href} target={link.external ? "_blank" : undefined} rel="noopener noreferrer"
                    className={`inline-flex min-h-11 max-w-full items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-4 ${colors.link}`}>
                    <span className="min-w-0 [overflow-wrap:anywhere]">{link.label}</span>
                    {link.external && <><ArrowUpRight aria-hidden="true" className="h-4 w-4 shrink-0" /><span className="sr-only"> (opens in a new tab)</span></>}
                  </a>
                ))}
              </nav>
            )}
          </div>
        </div>
      </header>

      <div className={`p-6 sm:p-9 ${variant === "developer" ? "grid gap-9 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.65fr)]" : "space-y-8"}`}>
        <div className="min-w-0 space-y-7">
          {hasText(data.about) && <ThemeSection variant={variant} headingLevel={headingLevel} title="About"><p className={text}>{data.about}</p></ThemeSection>}
          {skills.length > 0 && (
            <ThemeSection variant={variant} headingLevel={headingLevel} title="Skills">
              <ul aria-label="Skills" className="flex flex-wrap gap-2">
                {skills.map((skill, index) => <li key={index} className={`max-w-full rounded-lg border px-3 py-1.5 text-sm font-medium ${colors.tag}`}>{skill}</li>)}
              </ul>
            </ThemeSection>
          )}
          {education.length > 0 && (
            <ThemeSection variant={variant} headingLevel={headingLevel} title="Education">
              <ul className="space-y-5">
                {education.map((entry, index) => (
                  <li key={index}>
                    <EntryHeading className="font-bold leading-6">{entry.institution}</EntryHeading>
                    {hasText(entry.degree) && <p className={`mt-1 leading-6 ${colors.copy}`}>{entry.degree}</p>}
                    {hasText(entry.period) && <p className={`mt-1 text-sm leading-6 ${colors.detail}`}>{entry.period}</p>}
                    {hasText(entry.details) && <p className={`mt-2 ${text}`}>{entry.details}</p>}
                  </li>
                ))}
              </ul>
            </ThemeSection>
          )}
        </div>

        <div className="min-w-0 space-y-7">
          {projects.length > 0 && (
            <ThemeSection variant={variant} headingLevel={headingLevel} title="Projects">
              <ul className="space-y-4">
                {projects.map((project, index) => {
                  const href = portfolioProjectHref(project.link);
                  return (
                    <li key={index} className={`min-w-0 p-5 ${colors.card}`}>
                      <EntryHeading className={`text-lg font-bold leading-7 ${colors.title}`}>{project.title}</EntryHeading>
                      {hasText(project.description) && <p className={`mt-2 ${text}`}>{project.description}</p>}
                      {project.technologies?.filter(hasText).length ? (
                        <ul aria-label={`Technologies for ${project.title}`} className="mt-4 flex flex-wrap gap-2">
                          {project.technologies.filter(hasText).map((technology, technologyIndex) => <li key={technologyIndex} className={`max-w-full rounded-md border px-2 py-1 text-xs leading-5 ${colors.tag}`}>{technology}</li>)}
                        </ul>
                      ) : null}
                      {href && (
                        <a href={href} target="_blank" rel="noopener noreferrer" aria-label={`View ${project.title} (opens in a new tab)`}
                          className={`mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-4 ${colors.link}`}>
                          View project <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
                        </a>
                      )}
                    </li>
                  );
                })}
              </ul>
            </ThemeSection>
          )}
          {experience.length > 0 && (
            <ThemeSection variant={variant} headingLevel={headingLevel} title="Experience">
              <ul className="space-y-5">
                {experience.map((entry, index) => (
                  <li key={index}>
                    <EntryHeading className="font-bold leading-6">{entry.role || entry.organization}</EntryHeading>
                    {hasText(entry.role) && <p className={`mt-1 leading-6 ${colors.copy}`}>{entry.organization}</p>}
                    {hasText(entry.period) && <p className={`mt-1 text-sm leading-6 ${colors.detail}`}>{entry.period}</p>}
                    {hasText(entry.description) && <p className={`mt-2 ${text}`}>{entry.description}</p>}
                  </li>
                ))}
              </ul>
            </ThemeSection>
          )}
          {achievements.length > 0 && (
            <ThemeSection variant={variant} headingLevel={headingLevel} title="Achievements">
              <ul className={`list-disc space-y-2 pl-5 ${text}`}>{achievements.map((achievement, index) => <li key={index}>{achievement}</li>)}</ul>
            </ThemeSection>
          )}
          {preview && !projects.length && !experience.length && !achievements.length && (
            <div className={`rounded-xl border border-dashed p-5 ${colors.section}`}>
              <p className={`text-sm leading-6 ${colors.copy}`}>Add a project, experience or achievement to show the work you are proud of.</p>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
