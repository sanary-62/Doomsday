/**
 * Minimum-bundle booking using bottom-up Dynamic Programming (the classic coin-change problem).
 *
 *   dp[a]   = minimum number of bundles whose sizes add up to exactly `a` seats
 *   last[a] = the bundle size used as the final bundle in that optimal solution
 *
 * dp[0] = 0. For every amount a from 1 to groupSize, try each bundle size s <= a with
 * dp[a - s] reachable and keep the smallest dp[a - s] + 1.
 *
 * TIE-BREAKING RULE (deterministic): sizes are tried from largest to smallest and a candidate
 * only replaces the current best when it is strictly better. So when several bundle sizes give
 * the same minimum count for an amount, the LARGEST of those sizes is recorded as that amount's
 * final bundle. The combination is then rebuilt by following `last` back from groupSize to 0.
 *
 * Time O(groupSize * bundleCount), space O(groupSize).
 */

const UNREACHABLE = Infinity;

/**
 * @param {number[]} bundleSizes distinct positive integers
 * @param {number} groupSize positive integer
 * @returns {{ possible: true, groupSize: number, totalBundles: number, bundles: Record<string, number> }
 *   | { possible: false, groupSize: number, message: string }}
 */
const calculateMinimumBundles = (bundleSizes, groupSize) => {
  const sizesDescending = [...bundleSizes].sort((a, b) => b - a);

  const dp = new Array(groupSize + 1).fill(UNREACHABLE);
  const last = new Array(groupSize + 1).fill(0);
  dp[0] = 0;

  for (let amount = 1; amount <= groupSize; amount += 1) {
    for (const size of sizesDescending) {
      if (size > amount) continue;
      const previous = dp[amount - size];
      if (previous !== UNREACHABLE && previous + 1 < dp[amount]) {
        dp[amount] = previous + 1;
        last[amount] = size;
      }
    }
  }

  if (dp[groupSize] === UNREACHABLE) {
    return {
      possible: false,
      groupSize,
      message: 'No exact bundle combination is possible for this group size.',
    };
  }

  const counts = new Map();
  for (let remaining = groupSize; remaining > 0; remaining -= last[remaining]) {
    counts.set(last[remaining], (counts.get(last[remaining]) || 0) + 1);
  }

  const bundles = {};
  [...counts.keys()]
    .sort((a, b) => b - a)
    .forEach((size) => {
      bundles[String(size)] = counts.get(size);
    });

  return { possible: true, groupSize, totalBundles: dp[groupSize], bundles };
};

module.exports = { calculateMinimumBundles };
