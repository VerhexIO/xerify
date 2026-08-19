# Local run history

Every CLI, library, or MCP `ask`/`verify` can create one deterministic project-local record. This
makes provider calls understandable and reviewable without turning raw transport output into an
artifact.

```text
.xerify/
├── runs/
│   └── 000001/
│       ├── process.json
│       ├── request.json
│       ├── events.jsonl
│       ├── result.json       # or error.json; omitted by capture policy
│       └── evidence/
│           ├── manifest.json
│           └── 001-<sha256>.txt
└── archive/
```

Sequences increase across active and archived records in one fixed history namespace. Private,
content-free sequence reservations prevent Xerify's own lifecycle deletion from reusing an old
identity. Existing reservations are range-checked and must remain empty; a detected modification
fails closed. The stable ID is `xrun_000001`; commands accept either that ID or `1`. Evidence entries
carry a locator, byte count, and `sha256:` digest. Files are created with private POSIX modes where
supported and written atomically. A crash can leave a truthful `running` record; Xerify does not
invent a terminal outcome.

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
