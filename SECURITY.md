# Security Policy

## Reporting

Do not open a public issue for a suspected vulnerability or accidentally exposed credential. Until the canonical repository owner and dedicated address are finalized, use GitHub's private vulnerability reporting feature on the canonical repository. Include affected version, impact, reproduction, and any suggested mitigation; omit live credentials and sensitive production payloads.

No version is publicly supported before the first signed release. After launch, the latest minor release line will receive security fixes; the support table will be updated here.

## Security model

Xerify treats both supplied evidence and provider output as untrusted data. Verification prompts explicitly classify claim/context as evidence rather than instructions and require adversarial falsification. This reduces instruction-confusion risk but does not make an LLM prompt-injection-proof. Xerify never executes model output and never evaluates a configured shell string. Process adapters spawn one executable and argument array with `shell: false`, forward an allowlisted environment, send prompt/context on stdin, bound stdout/stderr, and terminate process trees on timeout or cancellation.

Direct API secrets are read only from named environment variables. Official CLI credential stores are used only through the official CLI. Config rejects secret values. Diagnostics disclose presence/category, not secret content. Optional audit JSONL excludes prompts, context, answers, findings, raw provider payloads, authorization data, and credential paths. New POSIX log files use mode `0600` and `O_NOFOLLOW`; every platform rejects non-regular opened targets. Windows does not provide the same atomic no-follow guarantee, so place audit logs in an owner-controlled directory.

Streamable HTTP defaults to loopback, validates Host and Origin, and requires explicit confirmation plus bearer authentication for non-loopback binds. Operators remain responsible for TLS, secret rotation, network policy, rate limiting, multi-user authorization, and safe log collection.

## Limitations

A `confirmed` verdict means the verifier found no material counterexample under the supplied evidence and reported limitations; it is not a security guarantee, formal verification, or permission to execute a change. Cross-provider review can still share model lineage, training data, blind spots, or compromised context. Evidence references are model-reported pointers, not validated citations. Keep sensitive inputs scoped and review all findings independently.
