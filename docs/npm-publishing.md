# npm distribution and Verhex ownership

The canonical package name is the public unscoped package `xerify`; the CLI binary is also
`xerify`. Correct consumer commands are:

```sh
npm install --save-dev xerify@latest
npm install --global xerify@latest
npx --yes xerify@latest --help
```

`npm install xerify latest` is not equivalent: npm interprets `latest` as another package name. Use
the `@latest` dist-tag syntax.

A direct project-local install runs a guarded `postinstall` that creates `.xerify/` without
overwriting existing files. Global, nested transitive, no-save, and `npm exec`/`npx` installs skip;
`XERIFY_SKIP_AUTO_INIT=1` disables it. npm does not provide a categorical direct-dependency flag
during first-install lifecycle, so an explicitly saved package hoisted to the exact root Xerify path
is the documented residual ambiguity. The lifecycle performs no network/provider call and reads no
credential store. Global and `npx` users run `xerify init` explicitly.

The published allowlist contains compiled `dist/`, schemas, public docs, the companion skill,
license/security notices, and the guarded postinstall entry. It excludes source, tests, release
artifacts, `.xerify/`, `XERIFY.md`, and all logo/brand review assets. Root `.npmignore`, the
`package.json` `files` allowlist, and `smoke:install` enforce this boundary together.

Package metadata identifies Verhex as the author and the source repository as
`VerhexIO/xerify`. npm's ownership model has an important limitation: only individual npm user
accounts can create/manage an unscoped package. An npm organization can own only scoped packages
such as `@verhex/xerify`. See npm's official [scope/access
matrix](https://docs.npmjs.com/package-scope-access-level-and-visibility/).

The designated npm release-owner user is `verhex`; the public-package organization is `verhex-io`.
Therefore the distribution decision is:

- Keep `xerify` unscoped so the requested install command remains available.
- Bootstrap it from a designated Verhex release-owner npm user.
- Control ongoing releases through npm Trusted Publishing bound to the public
  `VerhexIO/xerify` GitHub repository and `release.yml` workflow.
- Use the existing free public-packages `verhex-io` npm organization for future
  `@verhex-io/*` packages; it does not replace the individual owner of `xerify`.

Creating an npm organization is an account-owner web action. npm documents a free unlimited-public
packages plan in its [organization guide](https://docs.npmjs.com/creating-an-organization/). Never
send npm credentials, OTPs, recovery codes, or auth-store files to Xerify or commit them to Git.

## Release-owner bootstrap

On the owner-controlled machine:

```sh
npm login
npm whoami
npm view xerify name version dist-tags --json
```

The last command must still return `E404` immediately before first publication. Then run the complete
non-billable release gates and inspect the tarball. Do not publish from a dirty worktree or before the
recorded release gates close.

After the package exists, configure npm [Trusted
Publishing](https://docs.npmjs.com/trusted-publishers/) with these exact values:

```text
Provider: GitHub Actions
Organization/user: VerhexIO
Repository: xerify
Workflow filename: release.yml
Environment: npm
Allowed action: npm publish
```

The committed workflow already requests `id-token: write`, uses a GitHub-hosted Node 24 runner,
attests the tarball/SBOM, publishes the exact packed artifact, and creates the matching GitHub
release. After a successful OIDC release, restrict or revoke traditional write tokens.

## Verification after publish

Run from a clean directory outside the source checkout:

```sh
npm view xerify@latest name version dist.integrity --json
npm install --global xerify@latest
xerify --version
xerify --json health
xerify --json doctor
xerify init
```

The published package is not considered usable merely because `npm publish` returned success; the
external install, initialized project state, CLI doctor, MCP Inspector, exact version, and registry
integrity must all agree.
