import { MAX_PROVIDER_MESSAGE_LENGTH } from '../core/contracts.js';

// One character is reserved for the ellipsis so a truncated message still fits the schema bound.
const MAX_DIAGNOSTIC_LENGTH = MAX_PROVIDER_MESSAGE_LENGTH - 1;
const MAX_DIAGNOSTIC_LINES = 4;

// Provider output is untrusted and may echo a key back in an error message, so anything that
// looks like a credential is removed before the text is allowed anywhere near a diagnostic.
const SECRET_PATTERNS: readonly RegExp[] = [
  // Credential-bearing headers named without any of the words the labelled-value pattern below
  // looks for. `Authorization: Basic <base64>` carries a password and matches nothing else here:
  // not Bearer, not a JWT, not URL userinfo, and its name contains no `key`/`token`/`secret`.
  // Verbose HTTP clients print exactly this line on stderr.
  //
  // Everything after the header name is the header value, so the match runs to the end of the
  // line rather than taking a fixed number of whitespace-delimited pieces. Taking two pieces left
  // `csrf=SECRET` behind in `Cookie: session=abc; csrf=SECRET`, because a cookie header carries
  // several pairs and only the first was consumed. Lines are redacted before they are joined, so
  // "end of line" still means one line's worth here.
  /\b(?:(?:proxy-)?authorization|(?:set-)?cookie)\b\s*[:=][^\n]*/gi,
  /\b(?:sk|pk|rk|api|key|tok|ghp|gho|ghs|github_pat|npm|glpat|xox[baprs]|hf)[-_][A-Za-z0-9_-]{8,}/gi,
  /\bBearer\s+[A-Za-z0-9._~+/-]{8,}=*/gi,
  /\b[A-Za-z0-9._-]*(?:key|token|secret|password|passwd|credential)[A-Za-z0-9._-]*\s*[:=]\s*\S+/gi,
  /\beyJ[A-Za-z0-9._-]{16,}/g,
  // The password half is optional. `https://username@host/path` is userinfo too, and requiring the
  // colon let it through.
  /https?:\/\/[^\s/@]+(?::[^\s/@]*)?@\S+/gi
];

export const REDACTED_DIAGNOSTIC = '[REDACTED]';

// A prefix list only ever covers the vendors it names, and the shape that got through here was
// `npm_…`, which adding one more prefix does not prove will not happen again. This rule is
// structural instead: an unbroken run of 24 or more alphanumerics that mixes letters and digits is
// a credential shape rather than prose. The identifiers a reader actually needs survive it, because
// they break into short segments on `-`, `_`, `.` and `/` — the longest unbroken run in
// `claude-opus-4-5-20251101` is eight, and in `MODULE_NOT_FOUND` it is five. Over-redaction here
// costs a reader one opaque string; under-redaction costs them a credential.
const OPAQUE_TOKEN = /(?<![A-Za-z0-9])[A-Za-z0-9]{24,}(?![A-Za-z0-9])/g;

function looksLikeSecret(token: string): boolean {
  return /[A-Za-z]/.test(token) && /[0-9]/.test(token);
}

// A provider CLI writes for a terminal. Colour codes, cursor moves and other control sequences
// are meaningless once the text is inside a JSON result, and a caller that prints the result
// would be handing those sequences straight to its own terminal.
/* eslint-disable no-control-regex -- removing control characters requires matching them */
// An operating-system-command sequence carries a payload — a window title, a hyperlink — between
// its introducer and its terminator. Stripping only the introducer leaves that payload behind as
// stray text, so the sequence is removed whole, and before the control-character rule below gets
// to eat the escape that identifies it.
// Both sequence families have a 7-bit form introduced by ESC and an 8-bit form introduced by a
// single C1 character. A terminal that accepts the 8-bit form reads U+009B exactly as it reads
// `ESC [`, so matching only the ESC form leaves a working cursor-control sequence in the text.
const ANSI_OSC = /(?:\u001B\]|\u009D)[^\u0007\u001B\u009C]*(?:\u0007|\u001B\\|\u009C)?/g;
const ANSI_CSI = /(?:\u001B\[|\u009B)[0-?]*[ -/]*[@-~]/g;
// Everything below U+0020 except tab and newline, plus DEL and the C1 range above it. Carriage
// return belongs here: on a terminal a lone CR returns to the start of the line, so text after it
// overwrites what a reader already saw. C1 belongs here because those characters are control
// functions in their own right, not decoration. Tab and newline are kept because they are
// whitespace the later rules rely on — newline is what confines a header rule to one line.
const CONTROL_CHARACTERS = /[\u0000-\u0008\u000B-\u001F\u007F-\u009F]/g;
/* eslint-enable no-control-regex */

export function redactDiagnostic(text: string): string {
  let redacted = text.replace(ANSI_OSC, '').replace(ANSI_CSI, '').replace(CONTROL_CHARACTERS, ' ');
  for (const pattern of SECRET_PATTERNS) {
    redacted = redacted.replace(pattern, REDACTED_DIAGNOSTIC);
  }
  redacted = redacted.replace(OPAQUE_TOKEN, (token) =>
    looksLikeSecret(token) ? REDACTED_DIAGNOSTIC : token
  );
  return redacted.replace(/\s{2,}/g, ' ').trim();
}

// A crashing interpreter prints its message first and its stack last; a CLI that logs progress and
// then gives up prints its message last. Taking the tail unconditionally turned a missing-module
// crash into `code: 'MODULE_NOT_FOUND', | requireStack: [] | } | Node.js v24.15.0`, which names
// no cause at all while the line that did — `Error: Cannot find module '...'` — sat five lines up.
// So an explicit error line wins when the output has one, and the tail stays as the fallback.
const ERROR_LINE = /^(?:[\w.$]*(?:error|exception)|fatal|panic)\b/i;

// A CLI that fronts an HTTP API often prints the API's JSON error body straight to stderr, as
// `ERROR: {"type":"error","status":400,"error":{"message":"..."}}`. The sentence a reader needs is
// inside it. Reporting the envelope instead is not wrong, only much harder to read, and a long
// envelope can push the sentence past the length bound. So when a line embeds a JSON object that
// carries a message, that message is what gets reported.
function unwrapOnce(line: string): string | null {
  const start = line.indexOf('{');
  const end = line.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(line.slice(start, end + 1));
  } catch {
    return null;
  }
  if (parsed === null || typeof parsed !== 'object') return null;
  const record = parsed as Record<string, unknown>;
  const nested = record.error;
  const candidate =
    nested !== null && typeof nested === 'object'
      ? (nested as Record<string, unknown>).message
      : typeof nested === 'string'
        ? nested
        : record.message;
  return typeof candidate === 'string' && candidate.trim().length > 0 ? candidate.trim() : null;
}

// Observed against Codex v0.148.0 rejecting an unknown model: the sentence arrives wrapped twice,
// as an event whose `message` is the API's JSON error body serialized into a string. One unwrap
// yields more JSON, so unwrapping repeats while each result still carries a message of its own.
// The bound is there because the input is untrusted and a self-referential document should cost a
// fixed amount of work, not an unbounded amount.
const MAX_UNWRAPS = 4;

function messageFromEmbeddedJson(line: string): string | null {
  let current: string | null = null;
  let next = unwrapOnce(line);
  for (let depth = 0; next !== null && depth < MAX_UNWRAPS; depth += 1) {
    current = next;
    next = unwrapOnce(current);
  }
  return current;
}

function selectLines(text: string): string[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  // A line that embeds a JSON error body counts as stating an error even when it does not read
  // like one. Codex prints the whole body as the line, so it begins with `{` rather than `ERROR:`.
  const stated = lines.find(
    (line) => ERROR_LINE.test(line) || messageFromEmbeddedJson(line) !== null
  );
  if (stated === undefined) return lines.slice(-MAX_DIAGNOSTIC_LINES);
  return [messageFromEmbeddedJson(stated) ?? stated];
}

/**
 * Build a bounded, redacted description of why a provider process failed.
 *
 * A provider CLI that rejects a model, an expired login, or an unsupported flag says so in its
 * own output. Reporting only the exit status leaves the caller with nothing to act on and no way
 * to tell a stale CLI from a broken account, so the provider's own words are carried through —
 * bounded, redacted, and clearly attributed to the provider rather than to Xerify.
 *
 * Returns `null` when the process said nothing usable, so callers can omit the field entirely
 * rather than report an empty string.
 */
export function describeProcessFailure(stderr: string, stdout = ''): string | null {
  const fromStderr = selectLines(stderr);
  const lines = fromStderr.length > 0 ? fromStderr : selectLines(stdout);
  if (lines.length === 0) return null;
  // Redact each line on its own and only then join. A header rule has to consume a whole header
  // value, and after joining there is no line left to end at.
  const joined = lines
    .map((line) => redactDiagnostic(line))
    .filter((line) => line.length > 0)
    .join(' | ');
  if (joined.length === 0) return null;
  return joined.length > MAX_DIAGNOSTIC_LENGTH
    ? `${joined.slice(0, MAX_DIAGNOSTIC_LENGTH)}…`
    : joined;
}

/**
 * Pull the message out of a failure event in a JSONL event stream.
 *
 * Codex reports a rejected model as a `turn.failed` event on stdout and still exits nonzero, so
 * the useful sentence is in the stream rather than in the exit status.
 */
export function describeEventFailure(stdout: string, eventTypes: readonly string[]): string | null {
  for (const line of stdout.split(/\r?\n/).filter(Boolean)) {
    let event: unknown;
    try {
      event = JSON.parse(line);
    } catch {
      continue;
    }
    if (event === null || typeof event !== 'object') continue;
    const record = event as Record<string, unknown>;
    if (typeof record.type !== 'string' || !eventTypes.includes(record.type)) continue;
    const error = record.error;
    const message =
      typeof error === 'string'
        ? error
        : error !== null && typeof error === 'object'
          ? (error as Record<string, unknown>).message
          : record.message;
    if (typeof message === 'string' && message.trim().length > 0) {
      return describeProcessFailure(message);
    }
  }
  return null;
}

/**
 * Add the token counts a provider reports for one input, treating absence as absence.
 *
 * Providers split input across a plain count and one or more cache counts, and every one of them
 * is billed as input. Reading only the plain count under-reports the request and makes the
 * accompanying total smaller than the cost it was charged for. Returns `null` when the provider
 * reported nothing at all, which is different from reporting zero.
 */
export function sumInputTokens(...counts: ReadonlyArray<number | undefined>): number | null {
  const present = counts.filter((count): count is number => typeof count === 'number');
  return present.length === 0 ? null : present.reduce((total, count) => total + count, 0);
}
