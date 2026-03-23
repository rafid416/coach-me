const FILLER_REGEX = /\b(um|uh|like|you know|basically|literally|actually|right)\b/gi;

export function countFillerWords(transcript: string): number {
  return (transcript.match(FILLER_REGEX) ?? []).length;
}
