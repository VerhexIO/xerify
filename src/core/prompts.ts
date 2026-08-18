import type { AskRequest, VerifyRequest } from './contracts.js';

export function buildAskPrompt(request: AskRequest): string {
  return [
    'You are providing an independent second opinion.',
    `Question: ${request.question}`,
    request.context ? `Context follows:\n${request.context}` : 'No additional context was provided.'
  ].join('\n\n');
}

export function buildVerifyPrompt(request: VerifyRequest): string {
  return [
    'Independently evaluate the claim against the supplied context.',
    'Return exactly one JSON object and no markdown or surrounding prose.',
    'The exact schema is:',
    '{"verdict":"confirmed|refuted|unclear","summary":"short explanation","findings":[{"severity":"critical|high|medium|low|info","message":"finding","evidence":"optional bounded citation"}]}',
    'Use unclear when the evidence is insufficient. Do not claim formal proof.',
    `Claim: ${request.claim}`,
    request.context ? `Context follows:\n${request.context}` : 'No additional context was provided.'
  ].join('\n\n');
}
