# Dogfooding: what it takes to get a claim confirmed

This page is a log, not a tutorial. Five findings about Xerify itself were put through
`xerify verify` against two independent channels — `codex` (`openai`) and `cursor`. It took **26
rounds**. Only one finding passed on the first attempt, and one round came back `refuted` because
the claim was wrong.

Everything below is what actually happened, including the parts where the author of the claims was
the one who turned out to be mistaken. If you intend to use Xerify to check your own work, this is
the shape of the experience.

## The record

|   # | Claim                 | Channel | Verdict         | Exit | Why                                                  |
| --: | --------------------- | ------- | --------------- | ---: | ---------------------------------------------------- |
|   1 | source maps           | codex   | `unclear`       |   11 | claim covered 86 files, evidence showed 1            |
|   2 | source maps           | cursor  | `unclear`       |    6 | schema non-conformance, no verdict produced          |
|   3 | source maps           | codex   | `unclear`       |   11 | counts were a summary, not inspectable               |
|   4 | source maps           | codex   | `unclear`       |   11 | `sourceRoot` never considered; 9 of 86 rows shown    |
|   5 | source maps           | cursor  | `unclear`       |   11 | same two objections, reached independently           |
|   6 | source maps           | codex   | **`refuted`**   |   10 | the claim was false: maps _do_ set `sourceRoot`      |
|   7 | source maps           | cursor  | **`refuted`**   |   10 | same refutation, reached independently               |
|   8 | source maps           | codex   | `unclear`       |   11 | artifact not cryptographically bound to the registry |
|   9 | source maps           | cursor  | `unclear`       |    6 | schema non-conformance                               |
|  10 | source maps           | codex   | **`confirmed`** |    0 | —                                                    |
|  11 | source maps           | cursor  | **`confirmed`** |    0 | —                                                    |
|  12 | adapter precedence    | codex   | `unclear`       |   11 | runs not bound to a commit; commands omitted         |
|  13 | adapter precedence    | cursor  | `unclear`       |    6 | schema non-conformance                               |
|  14 | adapter precedence    | codex   | **`confirmed`** |    0 | —                                                    |
|  15 | adapter precedence    | cursor  | **`confirmed`** |    0 | —                                                    |
|  16 | npm provenance        | codex   | **`confirmed`** |    0 | —                                                    |
|  17 | npm provenance        | cursor  | **`confirmed`** |    0 | —                                                    |
|  18 | relative-path trap    | codex   | `unclear`       |   11 | the A/B changed two variables, not one               |
|  19 | relative-path trap    | codex   | **`confirmed`** |    0 | —                                                    |
|  20 | relative-path trap    | cursor  | **`confirmed`** |    0 | —                                                    |
|  21 | `.claude/` ignore gap | codex   | `unclear`       |   11 | not shown that all 152 errors were parsing errors    |
|  22 | `.claude/` ignore gap | codex   | `unclear`       |   11 | reproduction summarised, one raw message only        |
|  23 | `.claude/` ignore gap | codex   | `unclear`       |   11 | reproduction not tied to the stated commit           |
|  24 | `.claude/` ignore gap | codex   | `unclear`       |   11 | the claim's two halves lived at different commits    |
|  25 | `.claude/` ignore gap | codex   | `unclear`       |   11 | git history cannot be authenticated from the sandbox |
|  26 | `.claude/` ignore gap | cursor  | **`confirmed`** |    0 | —                                                    |

**Totals: 9 `confirmed`, 2 `refuted`, 15 `unclear`.** Of the 15 `unclear` results, 3 were transport
failures (exit `6`) and 12 were genuine "your evidence does not establish this" judgements.

Four findings reached `confirmed` on both channels. One reached `confirmed` on one channel and hit a
hard limit on the other — see [what this channel cannot verify](#what-this-channel-cannot-verify).

## Why 12 rounds came back "your evidence does not establish this"

Every one of those twelve objections fell into one of four classes. They are worth learning, because
they are the same four you will hit.

### 1. The claim reaches further than the evidence

Round 1. The claim said all 86 map files were unusable. The evidence showed one.

> The supplied evidence supports that one published `.js.map` references a missing `package/src`
> file without embedded `sourcesContent`, but it does not establish the claim for all 86 map files
> [...] The evidence also distinguishes 43 `.js.map` files and 43 `.d.ts.map` files, while the
> claim's stated properties address only `.js.map` files.

The fix is not to soften the claim. It is to go and inspect all 86 and put the result in the
envelope. A verifier that accepts "I checked one, assume the rest" is not doing anything for you.

Round 1 also contained a second reach that took several more rounds to notice: the claim said the
maps were unusable _by every consumer_. A developer with the repository cloned next to their
`node_modules` could resolve those paths. The evidence could never support "every consumer", and the
claim had to be narrowed to what the artifact itself shows: the sources cannot be resolved _from
within the package_.

### 2. The evidence is your summary rather than the artifact

Rounds 3, 4, 22 and 23. A table you generated is your conclusion wearing the costume of data.

> The supplied evidence is internally consistent with the claim, but it is a derived, untrusted
> summary rather than raw artifact data; without direct map JSON excerpts and a full tarball file
> listing, material counterexamples cannot be ruled out.

What worked: the raw registry API response, the complete `tar -tzf` listing, and the JSON of every
single map file with only the base64 `mappings` blob elided. For the ESLint case, `--format json`
output for all 152 messages rather than the terminal tail.

If your evidence contains the sentence "the scan found N of M", you are still in this class.

### 3. The artifact is not bound to what you say it is

Round 8. The claim was about "the tarball npm serves". The evidence was about a file in `/tmp`.

> The analyzed tarball is identified only by a SHA-256 digest, while the registry metadata supplies
> SHA-1 and SHA-512 integrity values. No matching SHA-1 or SHA-512 calculation is supplied, so
> artifact identity is not established.

The fix was to compute the digests the registry actually publishes and show them matching:

```text
local  sha1             : db56366636ab9d0f1b4778639d39bf040f65512e
registry dist.shasum    : db56366636ab9d0f1b4778639d39bf040f65512e
sha1 MATCHES registry   : True

local  sha512 (base64)  : sha512-VhjtXacMz1bqVpdk4RwDe4JAiruiU5ipCJ/fKHmqQErZx27xKpCHiNpLA6Hv1o938nXf/9sOQV/8wBIpSjBOgw==
registry dist.integrity : sha512-VhjtXacMz1bqVpdk4RwDe4JAiruiU5ipCJ/fKHmqQErZx27xKpCHiNpLA6Hv1o938nXf/9sOQV/8wBIpSjBOgw==
integrity MATCHES       : True
```

The same class applies to source claims: name the commit, show `git rev-parse HEAD`, and show
`git status --porcelain` so the reader knows the tree was not dirty.

### 4. More than one thing changed, or the halves live in different places

Round 18. An A/B meant to isolate one variable did not.

> The statement that the configs differ only by relative versus absolute script path is literally
> false: their provider map keys and provider names also differ.

That was true. The two configs used `rel-test` and `abs-test` as provider identities. The fix was to
give both configs the same identity and include the `diff` output so the single-variable claim was
checkable rather than asserted.

Round 24 is the same class in a different dress. The claim asserted something "at commit `1d65f17`",
but the reproduction removed a line from the config at `HEAD` — where a later commit had added it.
The two halves of one sentence lived at two different commits.

> [...] they do not adequately establish that the reproduction was performed from the stated HEAD
> with only the shown modification [...] The evidence also contains an internal contradiction about
> affected file paths.

The fix was to stop pretending it was one fact and state two, each bound to its own commit.

## The two rounds that refuted the author

Rounds 6 and 7 are the most useful thing on this page.

The claim included the sub-assertion _"none of the 86 maps sets `sourceRoot`"_. The scan that
produced that number was written in Python and tested the field like this:

```python
sr = d.get('sourceRoot')
if sr:                 # "" is falsy in Python
    haveroot += 1
```

Every one of the 86 maps sets `sourceRoot` — to the empty string. The scan counted zero. Both
channels caught it, independently, in the same round:

> **codex:** The claim is materially false as written: every supplied map JSON explicitly sets
> `"sourceRoot"` to the empty string, contradicting the assertion that none sets `sourceRoot`. The
> evidence otherwise supports the narrower interpretation [...]

> **cursor:** A material contradiction is present in the supplied evidence: map files explicitly
> include a `"sourceRoot"` field (set to an empty string), so the subclaim "none of the 86 maps sets
> `sourceRoot`" is false as written.

An empty `sourceRoot` prepends nothing, so the substantive conclusion survived. The _stated claim_
did not. It was corrected to "all 86 maps set `sourceRoot` to the empty string so it adds no prefix"
and confirmed two rounds later.

Note what had to be true for this to be caught. The raw map JSON was in the envelope. Had the
evidence still been the summary table from round 3 — the one that said `maps with a sourceRoot set:
0 of 86` — both verifiers would have had nothing to disagree with, and a false statement would have
been reported as verified.

**Send the artifact, not your reading of it. That is the entire mechanism.**

## The recipe that worked

By finding four, two rounds were enough. This is what changed:

1. **Scope the claim to exactly what the evidence shows.** No "every", "always", or "all" unless you
   inspected all of them. No causal bridge unless you isolated the variable.
2. **Put raw output in the envelope.** Command transcripts, API responses, complete file listings,
   JSON with only irrelevant blobs elided. Your tables belong in the claim, not the evidence.
3. **Bind the artifact.** Digests that match what the registry publishes, or a commit hash plus a
   clean `git status`.
4. **One variable per comparison,** with the `diff` included so the reader can check that themselves.
5. **Split compound claims.** If two halves refer to different states, they are two claims.
6. **Include the exact commands.** Not a description of what you ran.

A `confirmed` that arrives on the first attempt usually means the claim was too weak to be worth
making. Expect to iterate.

## An envelope that passed

This is the shape of the evidence bundle behind rounds 10 and 11:

```text
=== CRYPTOGRAPHIC BINDING: the analyzed file IS the tarball npm serves ===
  local sha1 / registry dist.shasum        -> match
  local sha512 / registry dist.integrity   -> match

=== RAW ARTIFACT DATA — no derived tables in this section ===
--- 1. Registry metadata, verbatim from the registry API ---
--- 2. sha256 of the tarball this evidence was produced from ---
--- 3. Complete tarball entry listing, verbatim from `tar -tzf` (all entries) ---
--- 4. Raw JSON of every .map file, with only the base64 `mappings` blob elided ---
```

And the claim it carried:

> In the `xverify-cli@0.1.0` tarball served by the npm registry, no `.map` file can resolve its
> declared source from within the package itself: all 86 maps set `sourceRoot` to the empty string
> so it adds no prefix, none embeds `sourcesContent`, every declared source resolves to a path under
> `src/`, and the tarball contains zero `src/` entries.

Note the shape: the claim states four checkable facts and one conclusion that follows from them
mechanically. Nothing in it requires the verifier to trust the author's judgement.

## What this channel cannot verify

Round 25 is the wall, and it is a design decision rather than a defect.

> [...] the historical repository state could not be independently verified because the available
> workspace is not a Git repository and contains no referenced files or commit objects.

A verifier receives bounded evidence on stdin. It cannot run `git log`, cannot open your repository,
and cannot re-execute your commands. So a claim whose truth lives in something the verifier cannot
reach — git history, a private registry, the state of your CI — can be _supported_ by a transcript
but never _authenticated_. Codex said the transcript was internally consistent with the claim and
still returned `unclear`, which is the correct answer.

Cursor returned `confirmed` on the same evidence. That disagreement is informative in itself: two
channels drew different lines on how much a pasted transcript is worth. Neither is malfunctioning.

Plan around it. Claims about **artifacts you can put in the envelope** verify well. Claims about
**history, infrastructure, or process** do not, and you should reach for a signed record or a CI log
that the reader can check independently instead.

## Channel reliability, measured

Across these 26 rounds:

| Channel            | Rounds | Produced a verdict | Exit `6` schema failures |
| ------------------ | -----: | -----------------: | -----------------------: |
| `codex` (`openai`) |     16 |                 16 |                        0 |
| `cursor`           |     10 |                  7 |                        3 |

The `cursor` adapter has no provider-side schema enforcement — its row in the
[built-in matrix](../provider-adapters.md) reads "prompt contract; core validation" — so a model that
ignores the output instruction produces exit `6` and no verdict. Treat exit `6` from `cursor` or
`command` adapters as retryable and bound your retries.

Never retry a `refuted` until it becomes `confirmed`. That is verdict shopping, and it converts a
second opinion into an expensive way to agree with yourself.

## What it cost

26 billable rounds for 5 findings. The distribution is lopsided and worth planning for:

- Finding 1, learning the rules from scratch: **11 rounds**
- Finding 5, hitting a channel limit: **6 rounds**
- Finding 2: 4 rounds · Finding 4: 3 rounds · Finding 3, with the recipe applied: **2 rounds**

The first finding you verify will be the expensive one. Budget for iteration, and use
[the mock provider](no-account-walkthrough.md) to get your envelope and exit-code handling right
before spending quota on model judgement.

## Related

- [Failure modes](failure-modes.md) — every typed failure and what produces it
- [No-account walkthrough](no-account-walkthrough.md) — every outcome with zero quota
- [Worked verification examples](README.md) — the domain scenarios
- [Provider adapters](../provider-adapters.md) — which adapters enforce the output schema
