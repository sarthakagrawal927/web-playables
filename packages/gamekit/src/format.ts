const NAMED_SUFFIXES = ["", "K", "M", "B", "T"];

function suffixFor(tier: number): string {
  const named = NAMED_SUFFIXES[tier];
  if (named !== undefined) return named;
  // Past T: aa, ab, … az, ba, … (idle-game convention).
  const i = tier - NAMED_SUFFIXES.length;
  return (
    String.fromCharCode(97 + Math.floor(i / 26)) + String.fromCharCode(97 + (i % 26))
  );
}

function trim(value: number, decimals: number): string {
  const s = value.toFixed(decimals);
  return s.includes(".") ? s.replace(/\.?0+$/, "") : s;
}

/** 1234 → "1.23K", 1e6 → "1M", 1e15 → "1aa". Plain JS numbers (fine < ~1e15 precision). */
export function formatNumber(n: number, decimals = 2): string {
  if (!Number.isFinite(n)) return "∞";
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  if (abs < 1000) return sign + trim(abs, abs < 10 ? 1 : 0);
  const tier = Math.floor(Math.log10(abs) / 3);
  const mantissa = abs / 10 ** (tier * 3);
  return sign + trim(mantissa, decimals) + suffixFor(tier);
}

/** 8130 → "2h 15m"; under a minute → "42s". */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}
