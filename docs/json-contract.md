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

## Verification outcomes

`confirmed`, `refuted`, and genuine `unclear` are completed verification results. Once a provider lifecycle starts, timeout, cancellation, provider failure, or invalid structured output also returns a complete `VerifyResult` with `verdict: "unclear"` and a typed `failure`. The process exit preserves the lower-level cause.

This means callers must parse stdout even when the exit is nonzero.

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
- Secret values, raw authorization headers, token fragments, credential paths, prompt/context, answer text, and findings do not enter typed errors or audit records.
