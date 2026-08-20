# No-account walkthrough: every outcome, zero quota

You do not need a provider account, an API key, or a login to learn how Xerify behaves. This page
walks through **every verdict and every typed failure** using a deterministic mock provider that
ships with the package.

Nothing here contacts a network service. Nothing here is billed. Every output below was observed by
running exactly these commands.

## Why a mock provider

Xerify's `command` adapter runs any executable, sends the prompt on stdin, and reads the response
from stdout. It does not care whether a language model produced that response. So a fixed script is
a perfectly valid provider — one whose answers you control, which makes every outcome reproducible.

The mock lives at `tools/mock-provider.mjs`. It takes one argument, the scenario name,
ignores the prompt, and prints a fixed response.

> **Availability:** the mock ships from `0.1.1` onward. It is not in the `0.1.0` tarball — on that
> version, use a source checkout of the repository, or copy the file from the repository into your
> own project and point `args` at your copy. Everything else on this page works unchanged.

## Setup

Find the installed path first. The mock must be referenced by **absolute path** — a `command`
adapter runs in a fresh temporary directory, so relative paths never resolve.

```sh
# From a source checkout
MOCK="$PWD/tools/mock-provider.mjs"

# From a global npm install
MOCK="$(npm root -g)/xverify-cli/tools/mock-provider.mjs"

# From a project-local install
MOCK="$PWD/node_modules/xverify-cli/tools/mock-provider.mjs"

echo "$MOCK"
```

Write a throwaway config that registers one adapter per scenario. Keeping it in a scratch directory
means your real configuration is untouched.

```sh
WORK="$(mktemp -d)"
cat > "$WORK/config.json" <<EOF
{
  "providers": {
    "mockConfirmed": { "kind": "command", "provider": "mock-lab",       "executable": "node",
      "args": ["$MOCK", "confirmed"],  "authKind": "local", "structuredOutput": true },
    "mockRefuted":   { "kind": "command", "provider": "mock-rebuttal",  "executable": "node",
      "args": ["$MOCK", "refuted"],    "authKind": "local", "structuredOutput": true },
    "mockUnclear":   { "kind": "command", "provider": "mock-hedge",     "executable": "node",
      "args": ["$MOCK", "unclear"],    "authKind": "local", "structuredOutput": true },
    "mockProse":     { "kind": "command", "provider": "mock-prose",     "executable": "node",
      "args": ["$MOCK", "prose"],      "authKind": "local", "structuredOutput": true },
    "mockMalformed": { "kind": "command", "provider": "mock-malformed", "executable": "node",
      "args": ["$MOCK", "malformed"],  "authKind": "local", "structuredOutput": true },
    "mockOffSchema": { "kind": "command", "provider": "mock-offschema", "executable": "node",
      "args": ["$MOCK", "off-schema"], "authKind": "local", "structuredOutput": true },
    "mockCrash":     { "kind": "command", "provider": "mock-crash",     "executable": "node",
      "args": ["$MOCK", "crash"],      "authKind": "local", "structuredOutput": true },
    "mockSlow":      { "kind": "command", "provider": "mock-slow",      "executable": "node",
      "args": ["$MOCK", "slow"],       "authKind": "local", "structuredOutput": true },
    "mockFlood":     { "kind": "command", "provider": "mock-flood",     "executable": "node",
      "args": ["$MOCK", "flood"],      "authKind": "local", "structuredOutput": true },
    "notInstalled":  { "kind": "command", "provider": "absent-vendor",
      "executable": "definitely-not-installed-cli", "args": [], "authKind": "subscription" }
  },
  "history": { "enabled": false },
  "logPath": null
}
EOF
chmod 600 "$WORK/config.json"
export XERIFY_USER_CONFIG_PATH="$WORK/config.json"
```

`XERIFY_USER_CONFIG_PATH` points Xerify at this file without touching your home directory or your
project's `.xerify/`. `history.enabled: false` keeps the walkthrough from writing run records.

Two shell variables keep the commands short:

```sh
EVIDENCE="Evidence E-1: the deployment log shows the migration completed at 04:12 UTC with zero failed rows."
CLAIM="The database migration completed cleanly."
```

Check the wiring before going further:

```sh
xerify --json providers list
```

You will see the ten mock adapters above **plus** the built-in `codex` (`openai`) and `claude`
(`anthropic`) adapters, and any adapter your own project config defines. Configuration is merged
with the defaults, never substituted for them, so the exact count depends on your setup.

Each mock has its own `provider` identity on purpose. Same-provider verification is rejected, so a
single shared identity would block every command below. That per-adapter identity also keeps the
mocks from colliding with the built-ins — when two adapters answer to one identity, the first one
registered wins and the built-ins register first. See
[failure modes](failure-modes.md#6b-the-wrong-adapter-answered--exit-5-where-you-expected-exit-3).

## The three verdicts

### `confirmed` — exit `0`

```sh
echo "$EVIDENCE" | xerify --json verify \
  --from openai:gpt-5.6-sol --to mock-lab:mock-1 --claim "$CLAIM"
echo "exit=$?"
```

```json
{
  "verdict": "confirmed",
  "summary": "The supplied evidence supports the claim and no counterexample appears.",
  "findings": [],
  "evidence": [
    {
      "reference": "supplied evidence envelope",
      "observation": "Deterministic mock response; no model judgement was involved."
    }
  ],
  "truncation": { "input": false, "output": false },
  "failure": null
}
```

Exit `0`. Note `failure: null` — this is a real verdict, not an operational fallback.

### `refuted` — exit `10`

```sh
echo "$EVIDENCE" | xerify --json verify \
  --from openai:gpt-5.6-sol --to mock-rebuttal:mock-1 --claim "$CLAIM"
echo "exit=$?"
```

```json
{
  "verdict": "refuted",
  "summary": "The supplied evidence contains a direct counterexample to the claim.",
  "findings": [
    {
      "severity": "high",
      "message": "The evidence states the opposite of the claim.",
      "evidence": "supplied evidence envelope"
    }
  ],
  "failure": null
}
```

Exit `10`. In a real run the `findings` array is where the substance lives; see the
[worked examples](README.md) for verdicts with four or five concrete findings.

### `unclear` — exit `11`

```sh
echo "$EVIDENCE" | xerify --json verify \
  --from openai:gpt-5.6-sol --to mock-hedge:mock-1 --claim "$CLAIM"
echo "exit=$?"
```

```json
{
  "verdict": "unclear",
  "summary": "The supplied evidence is insufficient to decide the claim either way.",
  "failure": null
}
```

Exit `11` with `failure: null`. This is the verifier saying _"the evidence does not settle this"_ —
an epistemic result, not a malfunction. Compare it with the exit `11`-adjacent failures below, which
all carry a non-null `failure`.

## The typed failures

Each command below is a one-liner. The full explanation of each outcome, and how to fix it in a real
deployment, is in [failure modes](failure-modes.md).

```sh
# 1. Executable missing entirely -> exit 3, ok:false, PROVIDER_UNAVAILABLE
echo "$EVIDENCE" | xerify --json verify \
  --from openai:gpt-5.6-sol --to absent-vendor:any --claim "$CLAIM"; echo "exit=$?"

# 2. Same invocation provider on both sides -> exit 2, no provider contacted
echo "$EVIDENCE" | xerify --json verify \
  --from openai:gpt-5.6-sol --to openai:gpt-5.6-sol --claim "$CLAIM"; echo "exit=$?"

# 3. Provider answers in prose -> exit 6, INVALID_PROVIDER_RESPONSE
echo "$EVIDENCE" | xerify --json verify \
  --from openai:gpt-5.6-sol --to mock-prose:mock-1 --claim "$CLAIM"; echo "exit=$?"

# 4. Provider returns truncated JSON -> exit 6
echo "$EVIDENCE" | xerify --json verify \
  --from openai:gpt-5.6-sol --to mock-malformed:mock-1 --claim "$CLAIM"; echo "exit=$?"

# 5. Valid JSON, invalid verdict value -> exit 6
echo "$EVIDENCE" | xerify --json verify \
  --from openai:gpt-5.6-sol --to mock-offschema:mock-1 --claim "$CLAIM"; echo "exit=$?"

# 6. Provider process exits nonzero -> exit 5, PROVIDER_FAILURE
echo "$EVIDENCE" | xerify --json verify \
  --from openai:gpt-5.6-sol --to mock-crash:mock-1 --claim "$CLAIM"; echo "exit=$?"

# 7. Provider slower than --timeout -> exit 4, TIMEOUT
echo "$EVIDENCE" | xerify --json --timeout 1500 verify \
  --from openai:gpt-5.6-sol --to mock-slow:mock-1 --claim "$CLAIM"; echo "exit=$?"

# 8. Response exceeds the output limit -> exit 6, truncation.output true
echo "$EVIDENCE" | XERIFY_MAX_OUTPUT_BYTES=4096 xerify --json verify \
  --from openai:gpt-5.6-sol --to mock-flood:mock-1 --claim "$CLAIM"; echo "exit=$?"
```

Expected exits, in order: `3`, `2`, `6`, `6`, `6`, `5`, `4`, `6`.

The scenario worth pausing on is number 3. The mock replies `Yes, that looks right to me. I would
ship it.` — unmistakable agreement in plain English. Xerify returns `unclear` with exit `6` anyway,
because agreement in prose is not a verdict under the contract. That refusal is the product.

## Checking the whole surface at once

A single loop asserts every exit code. This is a reasonable smoke test for an integration:

```sh
check() {
  echo "$EVIDENCE" | xerify --json ${3:-} verify \
    --from openai:gpt-5.6-sol --to "$1:mock-1" --claim "$CLAIM" >/dev/null 2>&1
  actual=$?
  [ "$actual" = "$2" ] && echo "ok   $1 -> $actual" || echo "FAIL $1 -> $actual (want $2)"
}

check mock-lab       0
check mock-rebuttal  10
check mock-hedge     11
check mock-prose     6
check mock-malformed 6
check mock-offschema 6
check mock-crash     5
check mock-slow      4 "--timeout 1500"
check absent-vendor  3
```

## Cleaning up

```sh
unset XERIFY_USER_CONFIG_PATH
rm -rf "$WORK"
```

Nothing was written to your project. If you enabled history by removing
`"history": { "enabled": false }`, remove `.xerify/runs/` as well.

## Where to go next

- [Failure modes](failure-modes.md) — why each failure happens and how to fix it in production
- [Worked verification examples](README.md) — the same shapes against real providers, with real
  disagreement
- [Project configuration](../configuration.md) — precedence, permissions, and the full config schema
- [CLI reference](../cli-reference.md) — every command and flag
