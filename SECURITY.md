# Security policy

## Supported versions

Security fixes are made on the current `main` branch. Please use the latest version from that
branch.

## Report a vulnerability

Do not open a public issue for an unpatched vulnerability. Use GitHub's
[private vulnerability report](https://github.com/procoderji-com/procoderji/security/advisories/new)
to contact the maintainers. If you cannot use GitHub reporting, email **procoderji@gmail.com**.
Include the affected route or component, the impact, and steps to reproduce. Do not include real
user data or secrets in the report.

Maintainers investigate reports and coordinate fixes and disclosure with the reporter. Response
times depend on availability. There is no bug bounty program at this time.

## Dependency checks

Run `npm audit` before a release or dependency update. Review advisories and compatible fixes;
avoid force-upgrading or downgrading unrelated packages to silence an audit finding.

For the .NET backend, also run
`dotnet list backend/ProCoderJi.slnx package --vulnerable --include-transitive` and keep the
deployed .NET 10 runtime on a current servicing patch. See [security notes](docs/security.md)
for the current boundaries and known dependency findings.
