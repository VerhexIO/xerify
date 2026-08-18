# ADR 0001: Command outcomes and operational failures

- Status: accepted
- Date: 2026-08-18
- Authority: `XERIFY.md` sections 3, 16, and 17

## Decision

`ask` accepts an optional `from` reference for provenance but does not require
one. `verify` requires both `from` and `to`; `from.provenance=unknown` is rejected
because the different-provider invariant cannot be enforced. Declared
provenance is accepted and reported without upgrading its confidence.

Once a valid verification invocation reaches a provider, every terminal path
returns a complete verification result. Timeout, cancellation, provider/process
failure, and invalid structured output use `verdict=unclear` and carry a typed,
secret-safe `failure` object. Their exit codes remain cause-specific:

| Outcome                      | Exit |
| ---------------------------- | ---: |
| confirmed                    |    0 |
| refuted                      |   10 |
| verifier returned unclear    |   11 |
| timeout/cancelled            |    4 |
| provider/process/API failure |    5 |
| invalid provider response    |    6 |

Failures before a verification result can be constructed, including invalid
input/config and unavailable provider/auth, use the stable error envelope.
`ask` has no verdict, so its operational failures always use the error envelope.

## Consequences

Shell callers can distinguish a genuine uncertain second opinion from a broken
provider call without Xerify ever manufacturing `confirmed`. JSON callers still
receive a full audit-friendly verification result for every started attempt.
