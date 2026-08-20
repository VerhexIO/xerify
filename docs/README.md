# Xerify documentation

[English](README.md) · [Türkçe](i18n/tr/README.md) · [Deutsch](i18n/de/README.md) ·
[简体中文](i18n/zh-CN/README.md) · [Español](i18n/es/README.md) ·
[Français](i18n/fr/README.md)

English is the canonical language for public schemas, ADRs, security policy, and immutable
verification evidence. Localized manuals explain the complete consumer workflow while keeping
command names, JSON fields, provider/model identifiers, exit codes, and configuration keys
unchanged. If a translation and a tested contract disagree, the tested English contract wins;
please report the translation drift.

## Consumer guides

- [Installation and upgrades](installation.md)
- [Project configuration](configuration.md)
- [CLI reference](cli-reference.md)
- [Provider adapters](provider-adapters.md)
- [Provider and access channels](channels.md)
- [JSON and exit-code contract](json-contract.md)
- [Local run history](run-history.md)
- [MCP](mcp.md)
- [Compatibility and support boundaries](compatibility.md)
- [Architecture](architecture.md)
- [Worked verification examples](examples/README.md)
- [No-account walkthrough](examples/no-account-walkthrough.md) — every outcome with zero provider quota
- [Failure modes](examples/failure-modes.md) — every typed failure, its cause, and its fix
- [Security policy](../SECURITY.md)

## Normative and machine-readable material

- [Accepted architecture decisions](decisions/)
- [Published JSON Schemas](../schemas/)
- [Machine-readable example index](examples/index.jsonl)
- [Immutable example evidence](examples/evidence/) — English-only, hash-anchored
- [Deterministic mock provider](../tools/mock-provider.mjs)

The product is **Xerify**, the npm distribution is **`xverify-cli`**, and the installed executable
is **`xerify`**.
