# Local run history

Every CLI, library, or MCP `ask`/`verify` can create one deterministic project-local record. This
makes provider calls understandable and reviewable without turning raw transport output into an
artifact.

```text
.xerify/
├── runs/
│   ├── HEAD.json           # one monotonic allocator/current-head record
│   └── 000001/
│       ├── process.json
│       ├── request.json
│       ├── events.jsonl
│       ├── result.json       # or error.json; omitted by capture policy
│       └── evidence/
│           ├── manifest.json
│           └── 001-<sha256>.txt
└── archive/
    ├── index.jsonl         # compact searchable archive lifecycle catalog
    └── 000002/             # same record layout after archive
```

Sequences increase across active and archived records in one fixed history namespace. One private
`runs/HEAD.json` records the last allocated sequence, directory, stable run ID, and update time. A
short-lived `.HEAD.lock` exists only during concurrent allocation; it does not grow with run count.
The display directory uses the configured zero padding (six digits by default), while the stable ID
is `xrun_000001`; commands accept either that ID or `1`. Deleting run `000001` therefore does not
cause the next operation to become `000001` again. Older `.sequences/` layouts are validated,
folded into `HEAD.json`, and removed on the next allocation.

## Record files

| Path                        | Meaning                                                                                                                                                               |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `process.json`              | Stable run ID, sequence, searchable `head`, operation/surface, lifecycle state, timestamps, target adapter/provider/model, and terminal exit/verdict or typed failure |
| `request.json`              | Normalized ask/verify request metadata, author/target provenance, limits, context label, capture policy, byte counts, and digests                                     |
| `events.jsonl`              | Append-only lifecycle events: `started`, then `completed` or `failed`; archive/restore events are added without rewriting history                                     |
| `result.json`               | Parsed normalized Xerify result, or a metadata-only result summary according to `captureOutput`; absent for `none`                                                    |
| `error.json`                | Secret-safe typed error when no terminal normalized result can be stored                                                                                              |
| `evidence/manifest.json`    | Evidence IDs, labels/locators, byte counts, SHA-256 digests, and optional stored filenames                                                                            |
| `evidence/001-<sha256>.txt` | Bounded input context only when `captureInput` is `full`; numbering is evidence order, not a second run counter                                                       |

Evidence entries carry a locator, byte count, and `sha256:` digest. Files are created with private
POSIX modes where supported and written atomically. A crash can leave a truthful `running` record;
Xerify does not invent a terminal outcome. The run directory is the human/agent inspection unit;
the JSON schemas stay deliberately smaller than Deckent's orchestration task records because
Xerify records one provider request, not a worker plan or project mutation lifecycle.

## Searchable archive index

`xerify runs archive <run>` moves the complete record into `archive/<number>/` and appends one
compact JSON object to `archive/index.jsonl`. Restore and delete append new lifecycle objects rather
than rewriting history. Each line contains:

- event/location/time and whether it came from the command or crash reconciliation;
- the complete small `process` summary, including human/agent-readable `head`, provider/model,
  verdict, exit, status, and timestamps;
- `recordSha256`, covering the exact process, request, normalized result or typed error, and evidence
  manifest at that lifecycle point.

The latest line for a `runId` is its current indexed state. `xerify runs list --archived` reads this
single index plus directory names; it does not open every archived process file. Missing legacy or
interrupted lifecycle entries are reconciled from only the affected directory and marked
`source: "reconciled"`. Humans can grep the JSONL directly, while AI tools should read this index
before opening a matching run directory.

The `head` is derived locally without another model call. With `captureInput: "full"`, it is a
whitespace-normalized, bounded claim/question preview. With `metadata`, it is only an operation plus
statement digest. With `none`, it contains no statement content. This prevents the index from
bypassing the configured persistence policy.

```sh
xerify --json runs list
xerify --json runs show 1
xerify --json runs show 1 --include-evidence
xerify --json runs archive 1
xerify --json runs list --archived
xerify --json runs search "race condition"
xerify --json runs restore 1
xerify --json runs delete 1 --yes
```

Archive and restore are local renames plus append-only index entries. Delete is permanent, requires
`--yes`, and reports
`recoverable: false`. Running records cannot be archived or deleted, preventing lifecycle commands
from invalidating an in-flight terminal write. None of these commands calls a provider.

`runs search <query>` matches the latest currently archived summary across run ID, `head`,
operation, provider/model, adapter, status, verdict, exit/error, and timestamps. It reads the compact
index and returns matching process summaries; evidence remains opt-in through `runs show`.
The hermetic history contract exercises listing and targeted search across 1,000 indexed archive
summaries whose run records are intentionally unopened.

`captureInput: "full"` stores statement and context; `metadata` stores only byte counts and hashes;
`none` stores neither. `captureOutput: "normalized"` stores the parsed Xerify result, `metadata`
stores the secret-safe summary, and `none` omits the result file. Raw provider transport output,
credentials, authentication stores, and environment dumps are never history fields.

The generated root ignore rules keep `.xerify/` out of Git, npm packages, and Docker build context.
They do not replace filesystem permissions or data classification. Review capture policy before
sending or persisting sensitive evidence. Changing the configured history roots starts a different
sequence namespace. Xerify does not claim integrity against a same-user process that concurrently
deletes, renames, or mutates its private history tree.
