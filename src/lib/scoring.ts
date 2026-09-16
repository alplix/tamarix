import type { CheckStatus, ScanChecks, ScoreBreakdownEntry, ScoreResult } from "./types";

/**
 * Explicit, fixed weighting of each check category out of 100 points total.
 * A PASS earns the full weight, WARNING earns half, FAIL earns zero.
 * These weights are the single source of truth for the security score —
 * nothing about the score is randomized or inferred by the AI.
 */
export const CATEGORY_WEIGHTS: Record<keyof ScanChecks, number> = {
  https: 25,
  headers: 30,
  cookies: 15,
  infoDisclosure: 10,
  exposure: 10,
  httpMethods: 10,
};

const STATUS_MULTIPLIER: Record<CheckStatus, number> = {
  PASS: 1,
  WARNING: 0.5,
  FAIL: 0,
};

export function computeScore(checks: ScanChecks): ScoreResult {
  const breakdown: ScoreBreakdownEntry[] = (Object.keys(CATEGORY_WEIGHTS) as Array<keyof ScanChecks>).map(
    (category) => {
      const weight = CATEGORY_WEIGHTS[category];
      const status = checks[category].status;
      const earned = Math.round(weight * STATUS_MULTIPLIER[status]);
      return { category, weight, earned, status };
    }
  );

  const score = breakdown.reduce((sum, entry) => sum + entry.earned, 0);

  return { score, breakdown };
}
