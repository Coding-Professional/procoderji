# ProCoderJii interface

ProCoderJii is a student learning brand, spanning notes, placement practice, games, videos,
community and portfolios. The interface should feel like a useful study desk, with clear
choices and readable content. It must not imply hiring guarantees or invent social proof.

## Direction

UI/UX Pro Max's Swiss Modernism guidance informs the grid, hierarchy, restrained decoration
and keyboard accessibility. Use an editorial opening on the public site and compact,
functional layouts in the student workspace. The existing gold brand remains an accent.

| Token         | Value     | Use                                         |
| ------------- | --------- | ------------------------------------------- |
| Paper         | `#f8f7f2` | Page background                             |
| Surface       | `#ffffff` | Forms, reading and practice                 |
| Ink           | `#242b25` | Headings and primary text                   |
| Secondary ink | `#60685d` | Supporting text                             |
| Forest        | `#345443` | Links, primary actions, selected navigation |
| Gold          | `#edc76e` | Small highlights and warm-up activities     |
| Rule          | `#dedfd5` | Quiet dividers and input boundaries         |

DM Sans is self-hosted under the SIL Open Font License. Georgia provides occasional editorial
display headings; the workspace keeps sans-serif headings. Body text is at least 16px for
reading and form inputs. Small labels supplement, never replace, visible field labels.

## Patterns

- One clear primary action per section. Prefer content rows and dividers over repeated cards.
- Desktop public navigation is shared across public pages. Mobile navigation has visible
  controls, an expanded state, Escape dismissal and focus restoration.
- Learning navigation stays consistent between practice, account and portfolio editing.
- Progress displays real saved values, with useful empty states; homepage samples are labelled
  as samples and do not impersonate saved activity.
- Notes keep branch/semester URLs and readable document layouts. Games keep their original
  controls and feedback. Portfolio drafts remain private until explicit publication.
- Avoid animated backgrounds, gradient text, glass effects, floating decorations and invented
  testimonials, rankings, company affiliations or activity counts.

## Verification

Check 375px, 768px, 1024px and 1440px layouts; keyboard focus and mobile menu; practice feedback;
notes navigation; portfolio preview; reading contrast; reduced motion; and existing browser/SEO
checks. Stage changes through `dev`; production uses the reviewed promotion workflow.
