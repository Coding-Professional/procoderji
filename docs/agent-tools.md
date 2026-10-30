# AI agent tools

The repository includes optional instruction packs for contributors who use compatible coding
agents. They are development aids; the Next.js application does not load or run them.

## Included skills

| Path | Purpose | Upstream project |
| --- | --- | --- |
| `.agents/skills/seo-audit/` | Guides an agent through a site SEO audit | [coreyhaines31/marketingskills](https://github.com/coreyhaines31/marketingskills) |
| `.agents/skills/ui-ux-pro-max/` | UI/UX guidance and local design-data search scripts | [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) |

The corresponding `.claude/skills/` entries are plain-text path pointers to these canonical
copies; they avoid keeping a second copy of the full skill data. If an agent cannot follow those
pointers, open the `.agents/skills/` version directly.

## Use and maintenance

- These files are not required to install, build, test or run the website.
- They are vendored snapshots and are not synced automatically. The original upstream commit is
  not recorded, so check the source repository before refreshing them.
- The UI/UX search scripts require Python 3 and use the data bundled under that skill's `data/`
  directory.
- Treat agent instructions and search results as guidance. Project instructions, security
  requirements and maintainer decisions still control changes.
- When updating a skill, record its upstream URL and version or commit, preserve its notices, and
  review any data or assets with their own attribution or licence metadata.
- The upstream skills are MIT-licensed. Their notices are reproduced in
  [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md). Font and icon data may have additional
  terms recorded in the bundled metadata; check those terms before redistributing individual
  assets.
