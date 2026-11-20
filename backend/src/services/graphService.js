/**
 * Graph algorithms for the movie prerequisite graph.
 *
 * A graph is a plain object / Map-like structure: movieId -> array of prerequisite movieIds.
 * An edge A -> B means "A requires B to be watched first".
 *
 * Both algorithms are implemented by hand with Depth-First Search; no graph library is used.
 */

const WHITE = 0; // not visited
const GRAY = 1; // on the current DFS path
const BLACK = 2; // fully explored

const neighboursOf = (graph, id) => graph.get(id) || [];

/**
 * Cycle detection with DFS and three-colour marking.
 *
 * Starting from `startId`, walk prerequisites. If the walk reaches a node that is already
 * on the current path (GRAY), the path contains a cycle. Only nodes reachable from the
 * start are explored, which is exactly what is needed to validate one create/update:
 * any new cycle must pass through the movie being changed.
 *
 * @param {Map<string, string[]>} graph movieId -> prerequisite ids
 * @param {string} startId node to start from
 * @returns {string[]|null} the cycle as an ordered path of ids (first id repeated at the end), or null
 */
const findCycleFrom = (graph, startId) => {
  const colour = new Map();
  const path = [];

  const visit = (id) => {
    colour.set(id, GRAY);
    path.push(id);

    for (const next of neighboursOf(graph, id)) {
      const state = colour.get(next) || WHITE;
      if (state === GRAY) {
        return [...path.slice(path.indexOf(next)), next];
      }
      if (state === WHITE) {
        const cycle = visit(next);
        if (cycle) return cycle;
      }
    }

    path.pop();
    colour.set(id, BLACK);
    return null;
  };

  return visit(startId);
};

/**
 * Would giving `movieId` the prerequisites `prerequisiteIds` produce a cycle?
 * The proposed prerequisites replace whatever the graph currently holds for that movie.
 * Works for a movie that does not exist yet (create) as well as an existing one (update).
 *
 * @param {Map<string, string[]>} graph current graph (not mutated)
 * @param {string} movieId
 * @param {string[]} prerequisiteIds
 * @returns {boolean}
 */
const wouldCreateCycle = (graph, movieId, prerequisiteIds) => {
  const candidate = new Map(graph);
  candidate.set(movieId, prerequisiteIds);
  return findCycleFrom(candidate, movieId) !== null;
};

/**
 * Prerequisite-first ordering of everything `targetId` depends on, via DFS topological sort.
 *
 * A node is appended to the result only after all of its own prerequisites have been
 * appended (post-order), so every prerequisite precedes the movie that needs it. A visited
 * set guarantees each movie appears exactly once even when reached through several paths
 * (the "diamond" case). The target itself is never included.
 *
 * Prerequisites are visited in the order they are stored, so the output is deterministic.
 *
 * @param {Map<string, string[]>} graph movieId -> prerequisite ids
 * @param {string} targetId
 * @returns {string[]} ids in watch order, excluding the target
 * @throws {Error} with code CYCLE_DETECTED if the reachable graph contains a cycle
 */
const topologicalPrerequisites = (graph, targetId) => {
  const cycle = findCycleFrom(graph, targetId);
  if (cycle) {
    const error = new Error('The prerequisite graph contains a circular dependency.');
    error.code = 'CYCLE_DETECTED';
    error.cycle = cycle;
    throw error;
  }

  const visited = new Set();
  const ordered = [];

  const visit = (id) => {
    visited.add(id);
    for (const prerequisite of neighboursOf(graph, id)) {
      if (!visited.has(prerequisite)) visit(prerequisite);
    }
    ordered.push(id);
  };

  visit(targetId);
  return ordered.filter((id) => id !== targetId);
};

/**
 * Build the adjacency structure from movie documents (or lean objects).
 * @param {Array<{ id?: any, _id?: any, prerequisites: any[] }>} movies
 * @returns {Map<string, string[]>}
 */
const buildGraph = (movies) => {
  const graph = new Map();
  for (const movie of movies) {
    const id = String(movie._id ?? movie.id);
    graph.set(id, (movie.prerequisites || []).map(String));
  }
  return graph;
};

module.exports = { findCycleFrom, wouldCreateCycle, topologicalPrerequisites, buildGraph };
