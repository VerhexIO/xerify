# Local run history

Every CLI, library, or MCP `ask`/`verify` can create one deterministic project-local record. This
makes provider calls understandable and reviewable without turning raw transport output into an
artifact.

```text
.xerify/
├── runs/
│   ├── .sequences/
│   │   └── 000001/         # empty private identity reservation
│   └── 000001/
│       ├── process.json
│       ├── request.json
│       ├── events.jsonl
│       ├── result.json       # or error.json; omitted by capture policy
│       └── evidence/
│           ├── manifest.json
│           └── 001-<sha256>.txt
└── archive/
    └── 000002/             # same record layout after archive
```

Sequences increase across active and archived records in one fixed history namespace. Private,
content-free `.sequences/<number>/` reservations prevent Xerify's own lifecycle deletion from
reusing an old identity. They are implementation metadata, not runs: do not place files in them or
delete them manually. Existing reservations are range-checked and must remain empty; a detected
modification fails closed. The display directory uses the configured zero padding (six digits by
default), while the stable ID is `xrun_000001`; commands accept either that ID or `1`. Deleting run
`000001` therefore does not cause the next operation to become `000001` again.

## Record files

| Path                        | Meaning                                                                                                                                            |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `process.json`              | Stable run ID, sequence, operation/surface, lifecycle state, timestamps, target adapter/provider/model, and terminal exit/verdict or typed failure |
| `request.json`              | Normalized ask/verify request metadata, author/target provenance, limits, context label, capture policy, byte counts, and digests                  |
| `events.jsonl`              | Append-only lifecycle events: `started`, then `completed` or `failed`; archive/restore events are added without rewriting history                  |
| `result.json`               | Parsed normalized Xerify result, or a metadata-only result summary according to `captureOutput`; absent for `none`                                 |
| `error.json`                | Secret-safe typed error when no terminal normalized result can be stored                                                                           |
| `evidence/manifest.json`    | Evidence IDs, labels/locators, byte counts, SHA-256 digests, and optional stored filenames                                                         |
| `evidence/001-<sha256>.txt` | Bounded input context only when `captureInput` is `full`; numbering is evidence order, not a second run counter                                    |

Evidence entries carry a locator, byte count, and `sha256:` digest. Files are created with private
POSIX modes where supported and written atomically. A crash can leave a truthful `running` record;
Xerify does not invent a terminal outcome. The run directory is the human/agent inspection unit;
the JSON schemas stay deliberately smaller than Deckent's orchestration task records because
Xerify records one provider request, not a worker plan or project mutation lifecycle.

```sh
xerify --json runs list
xerify --json runs show 1
xerify --json runs show 1 --include-evidence
xerify --json runs archive 1
xerify --json runs list --archived
xerify --json runs restore 1
xerify --json runs delete 1 --yes
```

Archive and restore are local renames. Delete is permanent, requires `--yes`, and reports
`recoverable: false`. Running records cannot be archived or deleted, preventing lifecycle commands
from invalidating an in-flight terminal write. None of these commands calls a provider.

`captureInput: "full"` stores statement and context; `metadata` stores only byte counts and hashes;
`none` stores neither. `captureOutput: "normalized"` stores the parsed Xerify result, `metadata`
stores the secret-safe summary, and `none` omits the result file. Raw provider transport output,
credentials, authentication stores, and environment dumps are never history fields.

The generated root ignore rules keep `.xerify/` out of Git, npm packages, and Docker build context.
They do not replace filesystem permissions or data classification. Review capture policy before
sending or persisting sensitive evidence. Changing the configured history roots starts a different
sequence namespace. Xerify does not claim integrity against a same-user process that concurrently
deletes, renames, or mutates its private history tree.
