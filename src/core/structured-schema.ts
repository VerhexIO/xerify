export const VERIFICATION_JSON_SCHEMA = {
  type: 'object',
  properties: {
    verdict: { type: 'string', enum: ['confirmed', 'refuted', 'unclear'] },
    summary: { type: 'string' },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low', 'info'] },
          message: { type: 'string' },
          evidence: { type: 'string' }
        },
        required: ['severity', 'message', 'evidence'],
        additionalProperties: false
      }
    }
  },
  required: ['verdict', 'summary', 'findings'],
  additionalProperties: false
} as const;
