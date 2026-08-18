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

`smoke:install` packs the package, rejects forbidden development/brand paths, tests side-effect-free
global install and guarded direct-install auto-init in clean temporary directories, resolves the
installed executable, runs help and JSON health/doctor, invokes an external fake provider through
the installed binary, and runs Inspector against installed STDIO. Source-directory wrappers are not
accepted as evidence.

`release:audit` regenerates the SBOM and production dependency license inventory, audits package contents, scans tracked source/fixtures for common secret patterns, and runs `npm audit --omit=dev`.

## External gates

- Record trademark/legal review, confusing-name review, domain/DNS ownership, and social-handle status.
- Confirm the exact public GitHub owner/repository and reserve the npm package name immediately before publishing.
- Record owner approval of the monochrome mark and final palette decision.
- Obtain explicit approval before a billable Codex, Claude, or Cursor smoke; record invocation
  provider, exact model, adapter/CLI version, date, contract outcome, and no prompt content/raw
  response.
- Complete Ubuntu Node 20/24, macOS Node 20/24, Windows Node 20/24, and WSL evidence. CI must not claim a lane that did not run.
- Review the generated tarball, SBOM, license inventory, changelog, and vulnerability audit.

## Publish

The release workflow uses npm trusted publishing/OIDC and provenance. It verifies that the pushed tag equals `package.json` version, runs the complete non-billable gate, packs once, attests the tarball and SBOM, publishes the exact tarball, and creates the GitHub release artifacts.

The GitHub environment and npm trusted publisher must be configured for the final owner/repository before dispatch. Do not place a long-lived npm token in the repository.

The public package is unscoped `xerify`, so npm requires an individual release-owner account even
though package metadata and release control belong to Verhex. The exact bootstrap, Trusted Publisher,
and `xerify@latest` verification flow is documented in [npm distribution and Verhex
ownership](npm-publishing.md).
