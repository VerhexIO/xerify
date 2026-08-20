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

The unscoped package is `xverify-cli`; the installed executable remains `xerify`. `0.1.0` was
bootstrapped with an owner-controlled, package-write granular token because npm requires a package
to exist before a Trusted Publisher can be configured. That tarball reached the registry outside
this workflow, so the workflow's publish step was skipped by its already-published guard and npm
recorded no provenance attestation for it. From `0.1.1` on, the publish runs inside the workflow,
which holds `id-token: write`, passes `--provenance`, and then fails the run if the registry did not
record an attestation. The token stays in use until Trusted Publishing is configured; it does not
prevent provenance. Store it only
as the repository Actions secret `NPM_TOKEN`; the bootstrap release workflow exposes it only as
`NODE_AUTH_TOKEN` on the `npm publish` step. Never commit or paste npm tokens, OTPs, recovery codes,
or auth-store contents into issues, prompts, logs, or repository files.

Immediately after `0.1.0` exists, configure npm Trusted Publishing for repository
`VerhexIO/xerify`, workflow `release.yml`, environment `npm`, with publish permission. Then remove
the `NODE_AUTH_TOKEN` mapping from `release.yml`, delete the `NPM_TOKEN` Actions secret, and revoke
the granular token. Ongoing releases must use the OIDC relationship rather than a long-lived token.

## Publish

1. Ensure the worktree is clean and `CHANGELOG.md` contains the exact dated version.
2. Confirm the public package/version and MCP name are not conflicting.
3. Tag the reviewed commit as `v<package-version>` and push the tag.
4. The release workflow verifies the tag, reruns all non-billable gates, packs once, attests the
   tarball/SBOM, publishes that exact tarball when the version is absent from npm, and creates the
   GitHub release. For the owner-authenticated bootstrap only, publish the reviewed tarball first;
   the subsequent tag workflow detects the exact existing version and skips a duplicate npm write.
5. Verify from a clean external directory:

```sh
npm view xverify-cli@latest name version dist.integrity --json
npm install --global xverify-cli@latest
xerify --version
xerify --json health
xerify --json doctor
```

Publish the matching `server.json` with the official MCP publisher only after npm exposes the exact
version. The MCP Registry hosts metadata, not a second package. Package `mcpName`, `server.json`
name/version, npm package/version, and `mcp stdio` arguments must remain synchronized.
