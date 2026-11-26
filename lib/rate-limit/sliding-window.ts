export interface SlidingWindowResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  timestamps: number[];
}

export function evaluateSlidingWindow(
  timestamps: number[],
  now: number,
  limit: number,
  windowMs: number,
): SlidingWindowResult {
  if (!Number.isInteger(limit) || limit < 1 || windowMs <= 0) {
    throw new RangeError('Rate limit and window duration must be positive.');
  }

  const activeTimestamps = timestamps
    .filter((timestamp) => timestamp > now - windowMs)
    .sort((a, b) => a - b);
  if (activeTimestamps.length >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: activeTimestamps[0] + windowMs,
      timestamps: activeTimestamps,
    };
  }

  activeTimestamps.push(now);
  return {
    allowed: true,
    remaining: limit - activeTimestamps.length,
    resetAt: activeTimestamps[0] + windowMs,
    timestamps: activeTimestamps,
  };
}
