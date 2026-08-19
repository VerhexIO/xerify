# Xerify Design System

Design system for **Xerify** — a shell-first, open-source tool for bounded cross-provider AI verification. Xerify asks one invocation provider a question, then can ask a different invocation provider for a bounded second opinion. It ships as a CLI, a library, a local STDIO MCP server, and a Streamable HTTP MCP server.

> Ask another provider. Get a clear second opinion.
> Lightweight cross-provider verification for the shell and MCP.

Xerify has one product surface today: the CLI/library/MCP core and its documentation. There is no GUI application — the UI kit here recreates the marketing/docs site, because that (plus the terminal itself) is what developers actually see.

**Source:** built from [github.com/VerhexIO/xerify](https://github.com/VerhexIO/xerify) (branch `main`). Explore the repo for detail this system doesn't cover — `docs/` (architecture, decisions, MCP, provider adapters, brand), `schemas/` (JSON contracts), `src/` (CLI, core, providers, MCP), and their tests.

## Index

- `styles.css` — root stylesheet; imports everything under `tokens/`
- `tokens/` — `colors.css`, `typography.css`, `spacing.css`, `radius-shadow.css`
- `assets/logos/` — full logo suite (source, full-horizontal, icon-only, monochrome, PNG exports)
- `guidelines/` — foundation specimen cards (Colors, Type, Spacing, Brand)
- `components/` — reusable UI primitives (table below)
- `ui_kits/docs-site/` — marketing/docs homepage recreation
- `SKILL.md` — portable skill file for Claude Code
- `github.md` — upstream source association and screen map

## Components

| Component      | Directory              | Purpose                                                   |
| -------------- | ---------------------- | --------------------------------------------------------- |
| `Button`       | `components/core/`     | Ink / emerald / outlined / ghost action button            |
| `Badge`        | `components/core/`     | Uppercase tracked mono status pill                        |
| `Tag`          | `components/core/`     | Mono label chip (provider names, runtimes)                |
| `VerdictPill`  | `components/feedback/` | Confirmed / refuted / unclear verdict with real exit code |
| `Callout`      | `components/feedback/` | Left-rule docs note (neutral / check / caution)           |
| `Terminal`     | `components/code/`     | Terminal window for CLI walkthroughs                      |
| `CodeBlock`    | `components/code/`     | Ink code/JSON panel                                       |
| `CommandTable` | `components/data/`     | Two-column CLI command reference                          |

### Intentional additions

The repo defines no UI component library — it is a CLI. These eight primitives were sized to exactly what a docs/marketing surface for _this_ product needs: install CTAs, release/provider labels, a verdict pill mirroring the CLI's real three-state output, callouts for the repo's own release-status and trust-boundary warnings, and terminal/code/table primitives to reproduce README examples faithfully. Nothing generic was added beyond that.

## Brand

The mark is a custom composite, never a font glyph. The `X` is split at its waist:

- **Upper half — a tall, narrow `V`, pure ink** (`#0a0a0a`; white on dark). It means _Verify_. The V is deliberately steep and narrow so that, with the reflection below it, the pair builds a single continuous `X` skeleton rather than two stacked chevrons. `erify` begins right at the waist where the two halves meet, so the eye gets the double read: `V + erify` = Verify, whole composite = **Xerify**.
- **Lower half — a mirrored check mark, dark emerald** (`#065f46`; `#10b981` on dark). Deliberately **asymmetric** — short arm left, long arm right, vertex at top — so it reads as a check, not a chevron. It is foreshortened to ~78% of the upper V's arm length so it reads as a _reflection_, not a mirror copy.
- **The two halves touch tip to tip and nowhere else.** Ink and emerald never overlap, cross, or blend. Miter overshoot is accounted for so the rendered tips kiss without collision. Padded SVG canvases keep square caps and miter tips uncropped.
- Together they read as `X` — "cross-verify" stated literally by the mark. Read separately: `V` + reversed check.

Every arm is a multiple of the same direction vector `(18.56, 38.2)`, so all four arms are exactly parallel; the reflection's short arm is 4 units, its long arm 7, against the V's 9. The mark carries no blue: blue was cancelled at owner review. Green is a single dark emerald, weighted lighter than the ink so it never dominates.

`docs/brand.md` in the source repo records this approved attached-center asymmetric geometry and its deterministic export contract.

## Visual foundations

**Color.** Two brand colors only: ink `#0a0a0a` and dark emerald `#065f46`. Neutrals are an Apple-grade gray ramp anchored on `#f5f5f7` for sunken surfaces and `#0a0a0a` for panels. Emerald is semantic, not decorative — it appears on verification, confirmed states, mono command names, and links, nowhere else. Status colors are muted rather than saturated: `#e5484d` refuted, `#d68000` unclear, emerald confirmed. Max two background values per view: white or `#f5f5f7` on the light side, `#0a0a0a` for panels and the footer.

**Type.** Figtree for everything human-readable — soft geometric, professional, quietly friendly rather than technical. IBM Plex Mono for every command, code path, JSON key, exit code, and uppercase label. Display sizes run tight (`-0.01em`, line-height 1.1); body copy runs open (1.6). Eyebrows and labels are always mono, uppercase, `0.12em` tracked — this is the system's most recognizable typographic move.

**Spacing and layout.** 4px base, deliberately airy upper steps (24/32/48/64/80/112). Sections are separated by 80px, page gutters are 80px, content caps at 1120px. Content is left-aligned on a single column; nothing is centered except inside cards and badges. No fixed or sticky chrome.

**Borders, corners, elevation.** 1px hairline borders in `#e8e8ed` do almost all separation work. Radius is 2px (small controls, pills, tags) and 4px (buttons, cards, panels) — never more. Cards are white with a hairline border and no shadow by default; `--shadow-md` is reserved for the one raised element in a view. Terminals and code panels use `#0a0a0a` with a `#3a3a3c` hairline. No inner shadows, no protection gradients, no glass or blur anywhere.

**Motion.** Restrained. 120ms for hover, 200ms for state changes, `cubic-bezier(0.2,0,0.2,1)`. No bounce, no spring, no entrance animation. Hover is an opacity step to 0.82 on solid controls; press is not simulated with scale. Focus is a 3px emerald ring at 28% alpha.

**Imagery.** There is none, by design — this is a terminal product. Where a visual is needed, it is a real terminal render or a code panel, never a stock photograph or an illustration. No gradients, no patterns, no textures, no grain.

## Content fundamentals

Copy is written the way the repo writes it: declarative, second person where it addresses the reader, and precise about limits.

- **Sentence case everywhere** in prose. Uppercase is reserved for mono labels and verdicts (`CONFIRMED`, `REFUTED`, `UNCLEAR`).
- **Short declaratives, no hedging.** "Provider output is untrusted data and is never executed." "Xerify gives a second opinion, not formal proof."
- **Verbs first in command descriptions:** "Open-ended second opinion from a configured provider." "Check adapter auth without a model call."
- **State the bound, not the promise.** The product's positioning is explicitly _bounded_ — never "guaranteed", "verified truth", or "proof".
- **"You" for the reader, never "we".** The tool is named, not personified: "Xerify asks one provider", not "we ask".
- **Numbers are exact and shown as they behave** — `exit 0`, `exit 10`, `exit 11`, `Node.js ≥ 20`, `schemaVersion 1`.
- **No emoji, anywhere.** Not in docs, not in CLI output, not in UI.
- **No exclamation marks, no celebration.** A confirmed verdict is a fact, not good news.

## Iconography

The source repo ships **no icon set** — no icon font, no sprite, no SVG icon directory. The only vector assets are the logo files, copied into `assets/logos/`.

- Where an icon is genuinely required, use **Lucide** from CDN (`https://unpkg.com/lucide-static`) at 1.5px stroke, 20px box, `currentColor`. It is the closest match to the mark's monoline, flat-terminal character. **This is a substitution, flagged for owner approval** — if Xerify adopts an official set, replace it and update this section.
- Prefer **no icon at all**. This system uses mono uppercase labels and the emerald accent for meaning instead. The docs-site kit ships with zero icons and loses nothing.
- Never use emoji as icons, and never Unicode symbols as UI glyphs — the one exception is `≥` in version text and `·` as a separator, both of which are typography, not iconography.
- Never use ✓ or ✗ as a status glyph: the check silhouette belongs to the logo, and ✗ carries the exact "error/false" meaning the mark must not pick up.

## Fonts — substitution flagged

The repo ships no webfonts; its wordmark is custom SVG outlines with no font dependency. UI text here is **Figtree** (soft geometric, professional) with **IBM Plex Mono** for code, both from Google Fonts in `tokens/typography.css`. The custom `erify` outlines match that softness: round caps and joins, in contrast to the mark's square-cut, mitered arms. If real brand fonts exist, send them and I'll swap in local `@font-face` files.

## Caveats

- No component library, Figma file, or GUI screens exist upstream — components and the docs-site kit are conservative and content-driven, not invented.
- Figtree, IBM Plex Mono, and the Lucide icon recommendation are all substitutions pending owner approval.
- The mark is synchronized with `docs/brand.md` upstream (attached center, asymmetric reflection, no blue). The repo's `tests/contract/logo.test.ts` constraints are respected: no `<text>`, no font attribute, no gradient/mask/filter, padded deterministic viewBox, self-contained paths.
