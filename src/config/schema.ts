import { z } from 'zod';

import { DEFAULT_LIMITS, RequestLimitsSchema } from '../core/contracts.js';

const AuthKindSchema = z.enum(['subscription', 'api-key', 'local', 'unknown']);

export const CommandProviderConfigSchema = z
  .object({
    kind: z.literal('command'),
    provider: z.string().trim().min(1).max(200),
    executable: z.string().trim().min(1).max(4_096),
    args: z.array(z.string().max(16_384)).max(100).default([]),
    authKind: AuthKindSchema.default('unknown'),
    authEnvironment: z
      .array(z.string().regex(/^[A-Z_][A-Z0-9_]*$/))
      .max(50)
      .default([]),
    structuredOutput: z.boolean().default(false),
    reportsUsage: z.boolean().default(false)
  })
  .strict();

export const CodexProviderConfigSchema = z
  .object({
    kind: z.literal('codex'),
    provider: z.literal('openai').default('openai'),
    executable: z.string().trim().min(1).max(4_096).default('codex')
  })
  .strict();

export const ClaudeProviderConfigSchema = z
  .object({
    kind: z.literal('claude'),
    provider: z.literal('anthropic').default('anthropic'),
    executable: z.string().trim().min(1).max(4_096).default('claude')
  })
  .strict();

export const CursorProviderConfigSchema = z
  .object({
    kind: z.literal('cursor'),
    provider: z.literal('cursor').default('cursor'),
    executable: z.string().trim().min(1).max(4_096).default('agent')
  })
  .strict();

export const OpenAiApiProviderConfigSchema = z
  .object({
    kind: z.literal('openai-api'),
    provider: z.literal('openai').default('openai'),
    endpoint: z.url().default('https://api.openai.com/v1/responses'),
    apiKeyEnvironment: z
      .string()
      .regex(/^[A-Z_][A-Z0-9_]*$/)
      .default('OPENAI_API_KEY'),
    apiKey: z.string().min(1).max(16_384).optional()
  })
  .strict();

export const AnthropicApiProviderConfigSchema = z
  .object({
    kind: z.literal('anthropic-api'),
    provider: z.literal('anthropic').default('anthropic'),
    endpoint: z.url().default('https://api.anthropic.com/v1/messages'),
    apiKeyEnvironment: z
      .string()
      .regex(/^[A-Z_][A-Z0-9_]*$/)
      .default('ANTHROPIC_API_KEY'),
    apiKey: z.string().min(1).max(16_384).optional(),
    maxTokens: z.number().int().positive().max(100_000).default(4_096)
  })
  .strict();

export const OpenAiCompatibleProviderConfigSchema = z
  .object({
    kind: z.literal('openai-compatible'),
    provider: z.string().trim().min(1).max(200),
    endpoint: z.url(),
    apiKeyEnvironment: z
      .string()
      .regex(/^[A-Z_][A-Z0-9_]*$/)
      .optional(),
    apiKey: z.string().min(1).max(16_384).optional()
  })
  .strict();

export const ProviderConfigSchema = z.discriminatedUnion('kind', [
  CommandProviderConfigSchema,
  CodexProviderConfigSchema,
  ClaudeProviderConfigSchema,
  CursorProviderConfigSchema,
  OpenAiApiProviderConfigSchema,
  AnthropicApiProviderConfigSchema,
  OpenAiCompatibleProviderConfigSchema
]);
export type ProviderConfig = z.infer<typeof ProviderConfigSchema>;

export const HistoryConfigSchema = z
  .object({
    enabled: z.boolean().default(true),
    directory: z.string().trim().min(1).max(4_096).default('.xerify/runs'),
    archiveDirectory: z.string().trim().min(1).max(4_096).default('.xerify/archive'),
    captureInput: z.enum(['full', 'metadata', 'none']).default('full'),
    captureOutput: z.enum(['normalized', 'metadata', 'none']).default('normalized'),
    sequencePadding: z.number().int().min(4).max(12).default(6)
  })
  .strict();
export type HistoryConfig = z.infer<typeof HistoryConfigSchema>;

export const DEFAULT_HISTORY_CONFIG: HistoryConfig = HistoryConfigSchema.parse({});

export const DEFAULT_PROVIDER_CONFIGS: Record<string, ProviderConfig> = {
  codex: CodexProviderConfigSchema.parse({ kind: 'codex' }),
  claude: ClaudeProviderConfigSchema.parse({ kind: 'claude' })
};

export const XerifyConfigSchema = z
  .object({
    providers: z.record(z.string().min(1), ProviderConfigSchema).default({}),
    limits: RequestLimitsSchema.default(DEFAULT_LIMITS),
    history: HistoryConfigSchema.default(DEFAULT_HISTORY_CONFIG),
    logPath: z.string().min(1).max(4_096).nullable().default(null)
  })
  .strict();
export type XerifyConfig = z.infer<typeof XerifyConfigSchema>;

export const FileConfigSchema = z
  .object({
    $schema: z.string().trim().min(1).max(4_096).optional(),
    providers: z.record(z.string().min(1), ProviderConfigSchema).optional(),
    limits: RequestLimitsSchema.partial().optional(),
    history: HistoryConfigSchema.partial().optional(),
    logPath: z.string().min(1).max(4_096).nullable().optional()
  })
  .strict();
export type FileConfig = z.infer<typeof FileConfigSchema>;
