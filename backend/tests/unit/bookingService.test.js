const { calculateMinimumBundles } = require('../../src/services/bookingService');
const { validateCinemaPayload, validateGroupSize } = require('../../src/utils/validators');

const seatsIn = (bundles) =>
  Object.entries(bundles).reduce((sum, [size, count]) => sum + Number(size) * count, 0);
const bundleCount = (bundles) => Object.values(bundles).reduce((sum, count) => sum + count, 0);

describe('minimum bundle calculation (dynamic programming)', () => {
  test('assessment example: [1,3,4], 6 -> 2 bundles (3 x 2)', () => {
    const result = calculateMinimumBundles([1, 3, 4], 6);
    expect(result).toEqual({ possible: true, groupSize: 6, totalBundles: 2, bundles: { 3: 2 } });
  });

  test('assessment example: [2,5], 11 -> 4 bundles (5 x 1, 2 x 3)', () => {
    const result = calculateMinimumBundles([2, 5], 11);
    expect(result.possible).toBe(true);
    expect(result.totalBundles).toBe(4);
    expect(result.bundles).toEqual({ 5: 1, 2: 3 });
  });

  test('assessment example: [6,9,20], 44 -> 4 bundles (20 x 1, 9 x 2, 6 x 1)', () => {
    const result = calculateMinimumBundles([6, 9, 20], 44);
    expect(result.possible).toBe(true);
    expect(result.totalBundles).toBe(4);
    expect(result.bundles).toEqual({ 20: 1, 9: 2, 6: 1 });
  });

  test('assessment example: [4,6], 7 -> not possible', () => {
    expect(calculateMinimumBundles([4, 6], 7)).toEqual({
      possible: false,
      groupSize: 7,
      message: 'No exact bundle combination is possible for this group size.',
    });
  });

  test('greedy would fail here but DP finds the optimum ([1,3,4], 6 is not 4+1+1)', () => {
    expect(calculateMinimumBundles([1, 3, 4], 6).totalBundles).toBe(2);
  });

  test('group size 1 with a size-1 bundle', () => {
    expect(calculateMinimumBundles([1, 5], 1)).toEqual({
      possible: true,
      groupSize: 1,
      totalBundles: 1,
      bundles: { 1: 1 },
    });
  });

  test('group size 1 is impossible without a size-1 bundle', () => {
    expect(calculateMinimumBundles([2, 5], 1).possible).toBe(false);
  });

  test('a single bundle size that divides the group size exactly', () => {
    const result = calculateMinimumBundles([25], 100);
    expect(result).toEqual({ possible: true, groupSize: 100, totalBundles: 4, bundles: { 25: 4 } });
  });

  test('a single bundle size that does not divide the group size is impossible', () => {
    expect(calculateMinimumBundles([25], 110).possible).toBe(false);
  });

  test('group size equal to a bundle size uses exactly one bundle', () => {
    expect(calculateMinimumBundles([5, 7, 12], 12).totalBundles).toBe(1);
  });

  test('maximum group size (10,000) is solved exactly', () => {
    const result = calculateMinimumBundles([1, 7, 500], 10000);
    expect(result.possible).toBe(true);
    expect(seatsIn(result.bundles)).toBe(10000);
    expect(result.totalBundles).toBe(20); // 20 x 500
    expect(result.bundles).toEqual({ 500: 20 });
  });

  test('maximum group size with awkward sizes still matches exactly', () => {
    const result = calculateMinimumBundles([499, 500, 3], 10000);
    expect(result.possible).toBe(true);
    expect(seatsIn(result.bundles)).toBe(10000);
    expect(bundleCount(result.bundles)).toBe(result.totalBundles);
  });

  test('maximum group size impossible case', () => {
    expect(calculateMinimumBundles([4, 6, 500], 9999).possible).toBe(false);
  });

  test('exact seat matching and reported count agree for many inputs', () => {
    const sizeSets = [[1, 3, 4], [2, 5], [6, 9, 20], [7, 13], [10, 25, 50], [3, 11, 17, 29]];
    for (const sizes of sizeSets) {
      for (let group = 1; group <= 200; group += 1) {
        const result = calculateMinimumBundles(sizes, group);
        if (result.possible) {
          expect(seatsIn(result.bundles)).toBe(group);
          expect(bundleCount(result.bundles)).toBe(result.totalBundles);
          Object.keys(result.bundles).forEach((size) => expect(sizes).toContain(Number(size)));
        }
      }
    }
  });

  test('result is minimal: matches a brute-force search on small inputs', () => {
    const bruteForce = (sizes, target) => {
      let best = Infinity;
      const search = (remaining, used) => {
        if (used >= best) return;
        if (remaining === 0) {
          best = used;
          return;
        }
        sizes.forEach((size) => {
          if (size <= remaining) search(remaining - size, used + 1);
        });
      };
      search(target, 0);
      return best === Infinity ? null : best;
    };

    const sizeSets = [[1, 3, 4], [2, 5], [4, 6], [3, 7, 10], [5, 8]];
    for (const sizes of sizeSets) {
      for (let group = 1; group <= 30; group += 1) {
        const result = calculateMinimumBundles(sizes, group);
        const expected = bruteForce(sizes, group);
        expect(result.possible ? result.totalBundles : null).toBe(expected);
      }
    }
  });

  test('tie-breaking is deterministic: with several optimal answers the larger final bundle wins', () => {
    // 6 can be 3+3 ... or 2+4? sizes [2,3,4]: 6 = 2+4 = 3+3, both 2 bundles.
    const first = calculateMinimumBundles([2, 3, 4], 6);
    expect(first.totalBundles).toBe(2);
    expect(first.bundles).toEqual({ 4: 1, 2: 1 });

    // Input order must not change the answer.
    expect(calculateMinimumBundles([4, 2, 3], 6)).toEqual(first);
    expect(calculateMinimumBundles([3, 4, 2], 6)).toEqual(first);
  });

  test('does not mutate the bundle size array it receives', () => {
    const sizes = [20, 6, 9];
    calculateMinimumBundles(sizes, 44);
    expect(sizes).toEqual([20, 6, 9]);
  });
});

describe('group size validation', () => {
  test.each(['1', '6', '10000', ' 42 '])('accepts %p', (raw) => {
    expect(validateGroupSize(raw).errors).toHaveLength(0);
  });

  test.each([undefined, '', '0', '-5', '10001', '6.5', 'abc', '1e3', '12abc', '0x10'])('rejects %p', (raw) => {
    expect(validateGroupSize(raw).errors).toHaveLength(1);
  });
});

describe('cinema payload validation', () => {
  const valid = { name: 'Test Cinema', bundleSizes: [5, 2] };

  test('accepts a valid payload and stores bundle sizes in ascending order', () => {
    const { errors, value } = validateCinemaPayload(valid);
    expect(errors).toHaveLength(0);
    expect(value).toEqual({ name: 'Test Cinema', bundleSizes: [2, 5] });
  });

  test('requires a name', () => {
    expect(validateCinemaPayload({ ...valid, name: '  ' }).errors[0].field).toBe('name');
  });

  test.each([
    ['missing array', undefined],
    ['empty array', []],
    ['more than 10 sizes', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]],
    ['size below 1', [0, 5]],
    ['size above 500', [501]],
    ['non-integer size', [2.5]],
    ['string size', ['5']],
    ['negative size', [-3]],
    ['duplicate sizes', [3, 3, 4]],
    ['not an array', 5],
  ])('rejects %s', (_label, bundleSizes) => {
    const { errors } = validateCinemaPayload({ name: 'X', bundleSizes });
    expect(errors.some((e) => e.field === 'bundleSizes')).toBe(true);
  });

  test('accepts exactly 10 sizes and the boundary values 1 and 500', () => {
    expect(validateCinemaPayload({ name: 'X', bundleSizes: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] }).errors).toHaveLength(0);
    expect(validateCinemaPayload({ name: 'X', bundleSizes: [1, 500] }).errors).toHaveLength(0);
  });
});
