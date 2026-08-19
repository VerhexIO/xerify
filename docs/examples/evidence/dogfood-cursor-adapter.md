# Bounded public evidence: Cursor adapter identity and exact-model gate

Evidence set: `dogfood-cursor-adapter-2026-08-19`

Current SHA-256: `src/providers/cursor.ts`
`1d5073922c66e2ab9cab0b900575458b31afe09976fbc25aa9b3e99017f101e4`;
`tests/contract/official-cli-adapters.test.ts`
`1ddd7e45d35486643fe0874e493a06f8e53d4a64fec44e865491578bc3b0b75e`.

`E-XC1 — provider capability`:

```ts
capabilities(): ProviderCapabilities {
  return {
    provider: 'cursor',
    transports: ['command'],
    authKinds: ['subscription', 'api-key'],
    structuredOutput: false,
    reportsUsage: true,
    supportsAbort: true
  };
}
```

`E-XC2 — model gate precedes temporary workspace and process creation`:

```ts
function assertExactCursorModel(model: string): void {
  const baseModel = model.trim().split('[', 1)[0]?.toLowerCase() ?? '';
  if (baseModel === 'auto') {
    throw new XerifyError(
      'INVALID_INPUT',
      'Cursor auto selection cannot provide deterministic model provenance',
      { details: { model, provider: 'cursor' } }
    );
  }
}

async invoke(input: InvokeInput, signal: AbortSignal): Promise<InvokeResult> {
  assertExactCursorModel(input.model);
  const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), 'xerify-cursor-'));
  // Cursor process invocation follows.
}
```

`E-XC3 — hermetic process-prevention test`:

```ts
const adapter = new CursorAdapter({ executable: 'must-not-run', env: { PATH: '' } });
await expect(
  adapter.invoke(
    { operation: 'verify', model: 'auto', prompt: 'verify', limits: DEFAULT_LIMITS },
    new AbortController().signal
  )
).rejects.toMatchObject({ code: 'INVALID_INPUT', exitCode: 2 });
```

The recorded live dogfood used a broader source/test snapshot with SHA-256
`88c9bb902dd37727fc604092d8e3942c605096c291a9c20d51d2e0ac565ef367`. This public evidence is a
trimmed review surface; it is not a byte-identical copy of that private run input.
