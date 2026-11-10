# Security policy

## Supported versions

Security fixes are made on the current `main` branch. Please use the latest version from that
branch.

## Report a vulnerability

Do not open a public issue for an unpatched vulnerability. Email **procoderji@gmail.com** with
the affected route or component, the impact, and steps to reproduce. Do not include real user
data or secrets in the report.

The maintainer will acknowledge the report, investigate it and coordinate a fix before public
disclosure. There is no bug bounty program at this time.

## Dependency checks

Run `npm audit` before a release or dependency update. Review advisories and compatible fixes;
avoid force-upgrading or downgrading unrelated packages to silence an audit finding.

For the .NET backend, also run
`dotnet list backend/ProCoderJi.slnx package --vulnerable --include-transitive` and keep the
deployed .NET 10 runtime on a current servicing patch. See [security notes](docs/security.md)
for the current boundaries and known dependency findings.
