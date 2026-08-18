import {
  SCHEMA_VERSION,
  type ErrorBody,
  type Finding,
  type VerifyResult
} from '../core/contracts.js';

export interface OutputWriter {
  stdout(value: string): void;
  stderr(value: string): void;
}

export function successEnvelope(command: string, data: unknown) {
  return { ok: true as const, schemaVersion: SCHEMA_VERSION, command, data };
}

export function errorEnvelope(command: string, error: ErrorBody) {
  return { ok: false as const, schemaVersion: SCHEMA_VERSION, command, error };
}

export function writeJson(writer: OutputWriter, value: unknown): void {
  writer.stdout(`${JSON.stringify(value)}\n`);
}

export function writeHumanObject(writer: OutputWriter, value: unknown): void {
  writer.stdout(`${JSON.stringify(value, null, 2)}\n`);
}

function findingLine(finding: Finding): string {
  const evidence = finding.evidence ? ` — ${finding.evidence}` : '';
  return `- [${finding.severity}] ${finding.message}${evidence}`;
}

export function writeVerifyHuman(writer: OutputWriter, result: VerifyResult): void {
  writer.stdout(`${result.verdict.toUpperCase()}: ${result.summary}\n`);
  if (result.findings.length > 0) {
    writer.stdout(`${result.findings.map(findingLine).join('\n')}\n`);
  }
  if (result.evidence && result.evidence.length > 0) {
    writer.stdout(
      `Evidence:\n${result.evidence
        .map((item) => `- ${item.reference}: ${item.observation}`)
        .join('\n')}\n`
    );
  }
  for (const [label, values] of [
    ['Assumptions', result.assumptions],
    ['Limitations', result.limitations],
    ['Unverified claims', result.unverifiedClaims]
  ] as const) {
    if (values && values.length > 0) {
      writer.stdout(`${label}:\n${values.map((value) => `- ${value}`).join('\n')}\n`);
    }
  }
}
