# Installation and upgrades

Xerify requires Node.js 20 or newer. Node.js 24 is the primary release runtime. The public npm
package is `xverify-cli`; the product and installed CLI command remain `xerify`.

## Choose an installation mode

Install globally when Xerify is a workstation tool shared across projects:

```sh
npm install --global xverify-cli@latest
xerify --version
xerify init
```

Install as a project development dependency when the repository should pin Xerify:

```sh
npm install --save-dev xverify-cli@latest
npx xerify --version
```

Run without retaining a dependency for a quick capability check:

```sh
npx --yes --package=xverify-cli@latest xerify --json health
```

Use `xverify-cli@latest`, including the `@`. `npm install xverify-cli latest` asks npm to install two
package names and is not equivalent.

For reproducible automation, pin an exact version instead of `latest`:

```sh
npm install --save-dev --save-exact xverify-cli@0.2.0
```

## Project initialization

A direct project-local dependency install runs a guarded initializer. It creates `.xerify/` only at
the consuming project root, never overwrites an existing config, never calls a provider, and adds
ignore protection for Git, npm, and Docker. Global, transitive, no-save, and `npx` installs do not
initialize the current directory; run this explicitly:

```sh
xerify init
```

Set `XERIFY_SKIP_AUTO_INIT=1` before installation when lifecycle-based initialization is unwanted.
npm cannot categorically identify every first-install direct/transitive hoisting case, so libraries
embedding Xerify should set that variable and initialize through their own explicit workflow.

Verify the resulting setup without making a model call:

```sh
xerify --json config validate
xerify --json health
xerify --json doctor
xerify --json providers probe --all --timeout 5000
```

`providers probe` checks local executable/auth availability by default. Add `--network` only when
bounded endpoint reachability is intended.

## Upgrades and removal

Upgrade using the same installation mode:

```sh
npm update --global xverify-cli
# or, inside a pinned project
npm install --save-dev xverify-cli@latest
```

Removing the npm package does not delete project history or configuration. Review and remove
`.xerify/` separately only when its run history, archive, config, and audit metadata are no longer
needed.

## MCP installation

Local STDIO MCP uses the same package; there is no second server download:

```json
{
  "mcpServers": {
    "xerify": {
      "command": "npx",
      "args": ["-y", "--package=xverify-cli@0.2.0", "xerify", "mcp", "stdio"]
    }
  }
}
```

Pin the package version for supply-chain-reviewable host configuration. The MCP Registry entry is
discovery metadata that resolves to this npm package; it does not host another Xerify service or
reuse local provider credentials remotely. See [MCP](mcp.md) for STDIO and HTTP setup.

## Package contents

The npm artifact contains compiled runtime/library output, public schemas, consumer documentation,
the companion agent skill, the guarded initializer, and license/security notices. It intentionally
excludes source tests, release tooling, local `.xerify/` state, internal agent/orchestration files,
design workspaces, generated release artefacts, and brand review material.

Xerify is built and maintained by Verhex and distributed under the MIT License. It is the
cross-provider verification layer of Deckent, the Verhex agentic operating system, released as a
standalone tool; installing Xerify neither requires nor installs Deckent. The canonical source and
issue tracker are linked from the package metadata.
