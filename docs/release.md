# Release guide

Xerify is release-ready only when code quality and external ownership/evidence gates are both green. A local build must not be described as a public release.

## Deterministic local gates

```sh
npm ci
npm run check
npm run generate:schemas
npm run assets:logo
npm run smoke:mcp
npm run smoke:install
npm run release:audit
```

`smoke:install` packs the package, installs it into an isolated prefix under a clean temporary directory, resolves the installed executable, runs help and JSON doctor, invokes an external fake provider through the installed binary, and runs Inspector against the installed STDIO server. Source-directory wrappers are not accepted as evidence.

`release:audit` regenerates the SBOM and production dependency license inventory, audits package contents, scans tracked source/fixtures for common secret patterns, and runs `npm audit --omit=dev`.

## External gates

- Record trademark/legal review, confusing-name review, domain/DNS ownership, and social-handle status.
- Confirm the exact public GitHub owner/repository and reserve the npm package name immediately before publishing.
- Record owner approval of the monochrome mark and final palette decision.
- Obtain explicit approval before a billable Codex or Claude smoke; record provider, model, CLI version, date, outcome, and no prompt content.
- Complete Ubuntu Node 20/24, macOS Node 20/24, Windows Node 20/24, and WSL evidence. CI must not claim a lane that did not run.
- Review the generated tarball, SBOM, license inventory, changelog, and vulnerability audit.

## Publish

The release workflow uses npm trusted publishing/OIDC and provenance. It verifies that the pushed tag equals `package.json` version, runs the complete non-billable gate, packs once, attests the tarball and SBOM, publishes the exact tarball, and creates the GitHub release artifacts.

The GitHub environment and npm trusted publisher must be configured for the final owner/repository before dispatch. Do not place a long-lived npm token in the repository.
