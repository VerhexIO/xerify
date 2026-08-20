# JSON and exit-code contract

Pass global `--json` before or after a subcommand. Xerify writes exactly one compact JSON object plus a trailing newline to stdout and no terminal decoration.

Success:

```json
{ "ok": true, "schemaVersion": 1, "command": "verify", "data": {} }
```

Pre-invocation or command error:

```json
{
  "ok": false,
  "schemaVersion": 1,
  "command": "verify",
  "error": {
    "code": "PROVIDER_UNAVAILABLE",
    "message": "Provider executable is unavailable",
    "retryable": false,
    "details": {}
  }
}
```

`ask` and `verify` data use the same schemas as their MCP tools. Published Draft 2020-12 artifacts live in `schemas/` and are generated from the runtime Zod schemas.

`provider` means the invocation/billing/control service. Cursor Agent is `cursor` for every exact
model ID; direct Codex/OpenAI is `openai`; direct Claude/Anthropic is `anthropic`. This identity
basis measures channel diversity, not upstream model independence. Health and MCP capabilities
report `identityBasis: "invocation-provider"` explicitly.

Successful verifier payloads may add `evidence`, `assumptions`, `limitations`, and `unverifiedClaims`. These fields are optional for compatibility. Structured provider adapters request all four fields; command adapters with older payloads remain accepted. Evidence entries are bounded verifier-reported references into supplied context, not independently validated citations.

## Verification outcomes

`confirmed`, `refuted`, and genuine `unclear` are completed verification results. Once a provider lifecycle starts, timeout, cancellation, provider failure, invalid structured output, or any verification input/output truncation also returns a complete `VerifyResult` with `verdict: "unclear"` and a typed `failure`. Truncated evidence can never produce `confirmed`. The process exit preserves the lower-level cause.

This means callers must parse stdout even when the exit is nonzero.

### `providerMessage`

A typed `failure` may carry an optional `providerMessage`. Xerify's own `message` is a fixed
sentence per failure code and is what a caller should branch on; `providerMessage` is the provider's
own words about the same failure, and is what a person should read. Without it, a stale CLI, an
expired login, and a rejected model all report `Provider process exited unsuccessfully`, which names
no cause.

The field carries provider output, so it is treated as untrusted and passes through a fixed
pipeline before it reaches a result:

- at most one stated error line, or the last four lines joined into a single line with a pipe
  separator when the output states none; each line is redacted on its own before being joined;
- OSC and CSI sequences removed whole — payload included, in both their 7-bit (`ESC ]`, `ESC [`)
  and 8-bit (U+009D, U+009B) forms, since a terminal accepting 8-bit controls reads U+009B exactly
  as it reads `ESC [`. Every remaining control character except tab and newline is replaced with a
  space: C0, DEL, and the C1 range alike, carriage return included. Any other escape sequence loses
  its introducer the same way and keeps only a printable tail, which carries no control function;
- `Authorization`, `Proxy-Authorization`, `Cookie`, and `Set-Cookie` headers replaced whole — the
  name and the entire rest of the line together, since such a header may carry several values and
  removing only the first leaves the rest behind;
- `Bearer` tokens, JWTs, URL userinfo, known vendor key prefixes, and any `label: value` pair whose
  label contains `key`, `token`, `secret`, `password`, or `credential` replaced with `[REDACTED]`;
- any remaining unbroken run of 24 or more alphanumerics mixing letters and digits replaced with
  `[REDACTED]`, which covers a credential whose issuer is not on the prefix list. Identifiers worth
  reading survive it because they break into short segments: the longest unbroken run in
  `claude-opus-4-5-20251101` is eight;
- never longer than 501 characters: a message that would exceed the bound is cut to 500 characters and given a single trailing `…`;
- omitted entirely, rather than sent empty, when the provider said nothing usable.

What survives is a bounded quotation, not a parsed field: it has no schema beyond `string`, its
wording is the provider's and changes when the provider changes, and it may contain filesystem
paths the provider chose to print. Do not branch on it.

Redaction is defence in depth over provider-authored text, not a proof. The rules above are what is
applied; no finite rule set can be shown to cover every credential a provider might invent, and the
last rule exists because a prefix list demonstrably did not. Treat `providerMessage` as the least
trusted string in the result, and do not forward it somewhere a secret would be unacceptable.

| Exit | Meaning                                                        |
| ---: | -------------------------------------------------------------- |
|  `0` | Command succeeded; ask answered or verification confirmed      |
|  `2` | Invalid input/config, same provider, or unprovable provenance  |
|  `3` | Provider executable, endpoint, or authentication unavailable   |
|  `4` | Timeout or cancellation                                        |
|  `5` | Provider, process, or API transport failure                    |
|  `6` | Invalid, incomplete, or schema-nonconforming provider response |
| `10` | Verification refuted                                           |
| `11` | Verification unclear without a lower-level failure             |

Discovery with zero matches is successful. Missing usage values remain `null`; Xerify does not estimate token counts or cost. Input/output truncation is explicit in result metadata.

## Compatibility policy

- Every public envelope and result carries `schemaVersion: 1`.
- Removing or reinterpreting an existing field is breaking.
- A new optional field may be additive.
- Unknown input/config fields are rejected by strict schemas.
- Public request schemas accept `declared` or `unknown` author provenance and require a `declared` target. They reject caller-supplied `observed`; author `unknown` then fails the different-provider admission rule.
- Secret values, raw authorization headers, token fragments, credential paths, prompt/context, answer text, and findings are never placed into typed errors or audit records by Xerify.
- The one field carrying provider-authored text into a typed error is `providerMessage`, which is redacted and bounded as described under [Verification outcomes](#providermessage). A path the provider itself printed can appear there; credentials are redacted by the rules listed there, which are defence in depth rather than a guarantee.
