# Maintainer release procedure

This file is for Xerify maintainers and is intentionally excluded from the npm package. A local
build is not a public release.

## Release candidate gates

```sh
npm ci
npm run check
npm run smoke:mcp
npm run smoke:install
npm run release:audit
```

Review the changelog, exact package version, generated tarball manifest, production license
inventory, SPDX SBOM, vulnerability audit, and secret-pattern scan. Live provider calls are not a
normal release gate; any such call requires explicit owner approval and a bounded, non-sensitive
evidence scope.

The unscoped package is `xerify`. The designated Verhex release owner bootstraps the first public
version from an owner-controlled npm account. Ongoing releases should use npm Trusted Publishing
bound to `VerhexIO/xerify`, workflow `release.yml`, environment `npm`. Never commit or paste npm
tokens, OTPs, recovery codes, or auth-store contents into issues, prompts, logs, or repository files.

## Publish

1. Ensure the worktree is clean and `CHANGELOG.md` contains the exact dated version.
2. Confirm the public package/version and MCP name are not conflicting.
3. Tag the reviewed commit as `v<package-version>` and push the tag.
4. The release workflow verifies the tag, reruns all non-billable gates, packs once, attests the
   tarball/SBOM, publishes that exact tarball, and creates the GitHub release.
5. Verify from a clean external directory:

```sh
npm view xerify@latest name version dist.integrity --json
npm install --global xerify@latest
xerify --version
xerify --json health
xerify --json doctor
```

Publish the matching `server.json` with the official MCP publisher only after npm exposes the exact
version. The MCP Registry hosts metadata, not a second package. Package `mcpName`, `server.json`
name/version, npm package/version, and `mcp stdio` arguments must remain synchronized.
