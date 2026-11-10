# Student product roadmap

ProCoderJii starts with a complete learning loop: choose a placement topic, answer questions,
review explanations, and decide what to practise next. Coursework stays available under
`/dashboard`; `/learn` is the learner workspace. Track product work in [#22](https://github.com/procoderji-com/procoderji/issues/22).

## Available now

- Four topic sets with 24 original introductory questions and answer explanations.
- Self-paced sessions, topic-level progress, and a suggested three-session weekly routine.
- Guest progress on the current device, with export and deletion.
- Optional Google sign-in and private cloud sync through the ASP.NET Core 10 backend.
- Pattern Sprint and Digit Recall, available free without login.
- Separate feature boundaries and contributor instructions for extending questions and product behavior.

This is a starter practice bank, not a calibrated placement assessment. Repeated questions count
as practice; accuracy is an aid to learning rather than an employability score.

## Next: validate usefulness and deepen content

1. Ask students which placement stages and topics are hardest to prepare for. Observe whether
   they can complete a session, understand a missed answer, and choose a useful next activity.
2. Expand the reviewed question bank and worked explanations before adding more topic landing pages.
3. [Introduce question versions](https://github.com/procoderji-com/procoderji/issues/72) before
   changing answer keys or retiring IDs used by saved attempts.
4. Design longer mock sessions, richer review history, and personal study goals from student feedback.
5. Publish original coursework and practical guides through the existing content-review workflow.

Useful measures include session completion, voluntary return practice, explanation helpfulness,
and correction reports. Choose a privacy-conscious measurement approach explicitly; this release
does not add analytics or track students across sites.

## Tracked feature work

- [Placement games #24](https://github.com/procoderji-com/procoderji/issues/24) groups the planned
  game families, shared session lifecycle, browser history and mixed practice sessions. Build
  the common foundation first, then gather student feedback on the first games before expanding.
- [Student portfolios #40](https://github.com/procoderji-com/procoderji/issues/40) tracks the
  editor, public pages and supporting backend work. Shared validation rules are merged; the
  remaining implementation and launch decisions are recorded in the linked issues and
  [ADR 0002](decisions/0002-student-portfolios.md).

Recheck the linked issues and merged pull requests before updating product copy or enabling
a planned capability.

## Monetization after value is established

Free topic practice should remain a useful standalone experience. Possible paid additions include
larger reviewed mock-test series, advanced progress analysis, or structured cohort support. These
are hypotheses to validate with students; no price or revenue projection has been established.

Razorpay and Paytm are the proposed payment providers. Before accepting payments, choose the
provider and define plans, refunds, account deletion,
support, and accessible cancellation. Paid access must be checked on the server. Payment events
need verified signatures, idempotent processing, and a durable audit trail. Never grant access
from a client-side success redirect or expose provider secrets to the browser.

No checkout, subscription, or paid entitlement is currently enabled.

## Grow the architecture when a measured need appears

- Keep the Next.js frontend and ASP.NET Core backend in one contribution repository while their feature boundaries remain clear.
- Review account isolation, email delivery, backups, monitoring, and abuse limits before public cloud-account rollout.
- Store only learning data the product actually uses; the current workspace retains 100 recent attempts.
- Move question publishing to a database or editorial tool when file review becomes a bottleneck,
  preserving stable IDs and a reviewed publication process.
- Add services or workspaces when independent deployment or ownership calls for them.
