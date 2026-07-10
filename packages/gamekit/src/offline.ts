export const DEFAULT_OFFLINE_CAP_SECONDS = 8 * 3600;

/**
 * Seconds of offline progress to grant for a save stamped at `savedAt`.
 * Clock skew (future saves) yields 0; long absences are capped.
 */
export function elapsedOfflineSeconds(
  savedAt: number | null,
  now: number,
  capSeconds: number = DEFAULT_OFFLINE_CAP_SECONDS,
): number {
  if (savedAt === null) return 0;
  const seconds = (now - savedAt) / 1000;
  if (!Number.isFinite(seconds) || seconds <= 0) return 0;
  return Math.min(seconds, capSeconds);
}
