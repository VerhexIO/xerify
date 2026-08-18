export interface BoundedText {
  text: string;
  bytes: number;
  truncated: boolean;
}

export function truncateUtf8(value: string, maxBytes: number): BoundedText {
  const encoded = Buffer.from(value, 'utf8');
  if (encoded.byteLength <= maxBytes) {
    return { text: value, bytes: encoded.byteLength, truncated: false };
  }

  let end = maxBytes;
  let text = encoded.subarray(0, end).toString('utf8');
  while (text.endsWith('\uFFFD') && end > 0) {
    end -= 1;
    text = encoded.subarray(0, end).toString('utf8');
  }

  return { text, bytes: end, truncated: true };
}

export class BoundedCollector {
  readonly #maxBytes: number;
  readonly #chunks: Buffer[] = [];
  #bytes = 0;
  #seenBytes = 0;

  constructor(maxBytes: number) {
    this.#maxBytes = maxBytes;
  }

  append(chunk: Buffer | string): void {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    this.#seenBytes += buffer.byteLength;
    const remaining = this.#maxBytes - this.#bytes;
    if (remaining <= 0) return;
    const accepted = buffer.subarray(0, remaining);
    this.#chunks.push(accepted);
    this.#bytes += accepted.byteLength;
  }

  get truncated(): boolean {
    return this.#seenBytes > this.#bytes;
  }

  result(): BoundedText {
    const combined = Buffer.concat(this.#chunks, this.#bytes);
    let safeLength = combined.byteLength;
    let text = combined.toString('utf8');
    while (text.endsWith('\uFFFD') && safeLength > 0) {
      safeLength -= 1;
      text = combined.subarray(0, safeLength).toString('utf8');
    }
    return {
      text,
      bytes: safeLength,
      truncated: this.#seenBytes > safeLength
    };
  }
}
