const {
  findCycleFrom,
  wouldCreateCycle,
  topologicalPrerequisites,
  buildGraph,
} = require('../../src/services/graphService');

// The assessment's example graph, keyed by short ids for readability.
const mcuGraph = () =>
  new Map([
    ['ironMan', []],
    ['firstAvenger', []],
    ['avengers', ['ironMan', 'firstAvenger']],
    ['civilWar', ['avengers']],
    ['ragnarok', []],
    ['infinityWar', ['civilWar', 'ragnarok']],
    ['endgame', ['infinityWar']],
    ['doomsday', ['endgame']],
  ]);

const assertPrerequisitesFirst = (graph, orderedIds) => {
  const position = new Map(orderedIds.map((id, index) => [id, index]));
  for (const id of orderedIds) {
    for (const prerequisite of graph.get(id)) {
      expect(position.has(prerequisite)).toBe(true);
      expect(position.get(prerequisite)).toBeLessThan(position.get(id));
    }
  }
};

describe('cycle detection (DFS)', () => {
  test('accepts the valid assessment graph', () => {
    const graph = mcuGraph();
    for (const id of graph.keys()) {
      expect(findCycleFrom(graph, id)).toBeNull();
    }
  });

  test('rejects a direct self-dependency', () => {
    expect(wouldCreateCycle(mcuGraph(), 'ironMan', ['ironMan'])).toBe(true);
  });

  test('rejects a two-movie cycle', () => {
    expect(wouldCreateCycle(mcuGraph(), 'ironMan', ['avengers'])).toBe(true);
  });

  test('rejects the indirect cycle Iron Man -> Endgame -> ... -> Iron Man (assessment case 4)', () => {
    expect(wouldCreateCycle(mcuGraph(), 'ironMan', ['endgame'])).toBe(true);
  });

  test('rejects the example Iron Man -> The Avengers -> Civil War -> Iron Man', () => {
    expect(wouldCreateCycle(mcuGraph(), 'ironMan', ['civilWar'])).toBe(true);
  });

  test('accepts an update that adds a valid prerequisite', () => {
    expect(wouldCreateCycle(mcuGraph(), 'ragnarok', ['ironMan'])).toBe(false);
  });

  test('accepts replacing prerequisites with a different valid set', () => {
    expect(wouldCreateCycle(mcuGraph(), 'doomsday', ['infinityWar', 'ragnarok'])).toBe(false);
  });

  test('accepts a brand new movie that is not yet in the graph', () => {
    expect(wouldCreateCycle(mcuGraph(), 'newMovie', ['endgame', 'ironMan'])).toBe(false);
  });

  test('replacing prerequisites removes the old edges (no false positive)', () => {
    // endgame currently requires infinityWar; swapping to ironMan only is valid.
    expect(wouldCreateCycle(mcuGraph(), 'endgame', ['ironMan'])).toBe(false);
  });

  test('does not mutate the graph it is given', () => {
    const graph = mcuGraph();
    wouldCreateCycle(graph, 'ironMan', ['endgame']);
    expect(graph.get('ironMan')).toEqual([]);
  });

  test('findCycleFrom reports the cycle path', () => {
    const graph = new Map([
      ['a', ['b']],
      ['b', ['c']],
      ['c', ['a']],
    ]);
    expect(findCycleFrom(graph, 'a')).toEqual(['a', 'b', 'c', 'a']);
  });

  test('diamond-shaped graphs are not cycles', () => {
    const graph = new Map([
      ['top', ['left', 'right']],
      ['left', ['bottom']],
      ['right', ['bottom']],
      ['bottom', []],
    ]);
    expect(findCycleFrom(graph, 'top')).toBeNull();
  });
});

describe('rewatch order (DFS topological sort)', () => {
  test('Avengers: Doomsday needs all 7 other movies exactly once, prerequisites first', () => {
    const graph = mcuGraph();
    const order = topologicalPrerequisites(graph, 'doomsday');

    expect(order).toHaveLength(7);
    expect(new Set(order).size).toBe(7);
    expect(order).not.toContain('doomsday');
    expect([...order].sort()).toEqual(
      ['avengers', 'civilWar', 'endgame', 'firstAvenger', 'infinityWar', 'ironMan', 'ragnarok'].sort()
    );
    assertPrerequisitesFirst(graph, order);
  });

  test('is deterministic and matches the assessment sample order', () => {
    expect(topologicalPrerequisites(mcuGraph(), 'doomsday')).toEqual([
      'ironMan',
      'firstAvenger',
      'avengers',
      'civilWar',
      'ragnarok',
      'infinityWar',
      'endgame',
    ]);
  });

  test('Civil War needs Iron Man, The First Avenger and The Avengers (Avengers last)', () => {
    const order = topologicalPrerequisites(mcuGraph(), 'civilWar');
    expect([...order].sort()).toEqual(['avengers', 'firstAvenger', 'ironMan']);
    expect(order[2]).toBe('avengers');
  });

  test('Thor: Ragnarok has an empty prerequisite list', () => {
    expect(topologicalPrerequisites(mcuGraph(), 'ragnarok')).toEqual([]);
  });

  test('a shared prerequisite reached by several paths appears once', () => {
    const graph = new Map([
      ['top', ['left', 'right']],
      ['left', ['bottom']],
      ['right', ['bottom']],
      ['bottom', []],
    ]);
    const order = topologicalPrerequisites(graph, 'top');
    expect(order.filter((id) => id === 'bottom')).toHaveLength(1);
    assertPrerequisitesFirst(graph, order);
  });

  test('throws CYCLE_DETECTED when stored data already contains a cycle', () => {
    const graph = new Map([
      ['a', ['b']],
      ['b', ['a']],
    ]);
    expect(() => topologicalPrerequisites(graph, 'a')).toThrow(
      expect.objectContaining({ code: 'CYCLE_DETECTED' })
    );
  });
});

describe('buildGraph', () => {
  test('maps movie documents to an id -> prerequisite ids structure', () => {
    const graph = buildGraph([
      { _id: 'x', prerequisites: [] },
      { _id: 'y', prerequisites: ['x'] },
    ]);
    expect(graph.get('y')).toEqual(['x']);
    expect(graph.get('x')).toEqual([]);
  });
});
