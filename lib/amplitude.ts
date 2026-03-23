export function getSyntheticAmplitude(t: number): number {
  const speechRhythm = Math.abs(Math.sin(t * 0.003 * Math.PI));
  const noise = (Math.random() - 0.5) * 0.3;
  return Math.max(0, Math.min(1, speechRhythm + noise));
}
