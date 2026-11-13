# Documentation

ProCoderJii is building a student learning and placement-practice product. Free practice and
browser-saved progress work without a production service account. Optional account
synchronization is a separate capability; paid billing is future work.

## Start here

| You want to... | Read |
| --- | --- |
| Understand the product and current content | [Project README](../README.md) |
| Review student value, scaling, and future monetization | [Product roadmap](product-roadmap.md) |
| Review repository readiness and remaining owner decisions | [Repository audit](repository-audit.md) |
| Make your first contribution | [Contributing](../CONTRIBUTING.md) |
| Ask a question or choose a reporting channel | [Support](../SUPPORT.md) |
| Triage issues, review changes, or handle dependency updates | [Maintainer guide](maintainer-guide.md) |
| Run the app and choose checks | [Development](development.md) |
| Understand routes, content, and feature boundaries | [Architecture](architecture.md) |
| Add original notes, guides, or career listings | [Content guide](content-guide.md) |
| Run the .NET API, Google sign-in, and account persistence | [Backend setup](../backend/README.md) |
| Try portfolios or prepare their deployment | [Portfolio workspace and runbook](portfolio-workspace.md) |
| Import a portfolio from a text template | [Markdown import](portfolio-markdown.md), [template](../public/templates/portfolio.md) |
| Work on portfolio fields, policy, publication, or storage | [Shared rules](../shared/portfolio/README.md), [Portfolio API](portfolio-api.md) |
| Configure production hosting and the site domain | [Deployment](deployment.md) |
| Contribute to dev, test staging and promote a production release | [Branches and releases](branching-and-releases.md) |
| Run the API and choose a database with Docker | [Containers](containers.md) |
| Configure the selected hosted PostgreSQL database | [Neon setup](neon.md) |
| Report a vulnerability privately | [Security policy](../SECURITY.md) |
| Review implementation security notes | [Security notes](security.md) |
| Understand optional coding-agent tools | [Agent tools](agent-tools.md) |

## Product decisions

Architecture decisions describe a problem, the chosen boundary, and its consequences. Start with
[ADR 0001: student-product boundaries](decisions/0001-student-product-boundaries.md), then
[ADR 0002: student portfolios](decisions/0002-student-portfolios.md) (accepted for Phase 1), and
[ADR 0003: containers and database options](decisions/0003-container-database-options.md). Add a new
decision record when a change affects persistence, account requirements, payment handling, or
other feature boundaries; update the architecture guide when the implementation changes.

The [project roadmap](https://github.com/procoderji-com/procoderji/issues/22) records product
direction. Check the linked issues and pull requests for current implementation status. A
roadmap item is a proposal until its behavior is implemented and documented.

## Contribute documentation

Keep setup instructions reproducible and distinguish available behavior from planned features.
Link to the canonical guide rather than copying setup steps into several files. When you change
a route, environment variable, data model, or command, update its guide in the same pull request.

Deployment instructions may include dated observations and owner-specific operations. Recheck
those observations before acting on them; local development does not require DNS or production
hosting changes.
