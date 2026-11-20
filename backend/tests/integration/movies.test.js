const request = require('supertest');
const { setupDatabase, resetDatabase, seedExample, teardownDatabase } = require('./helpers');

let app;

beforeAll(async () => {
  app = await setupDatabase();
});

afterAll(async () => {
  await teardownDatabase();
});

const createMovie = (body) => request(app).post('/api/movies').send(body);

describe('POST /api/movies', () => {
  beforeEach(resetDatabase);

  test('creates a valid movie with defaults', async () => {
    const res = await createMovie({ title: 'Iron Man', releaseYear: 2008, runtime: 126 });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      title: 'Iron Man',
      releaseYear: 2008,
      runtime: 126,
      prerequisites: [],
      watched: false,
    });
    expect(res.body.id).toMatch(/^[a-f\d]{24}$/);
    expect(res.body._id).toBeUndefined();
  });

  test('creates a movie with valid prerequisites', async () => {
    const base = await createMovie({ title: 'Base', runtime: 100 });
    const res = await createMovie({ title: 'Sequel', runtime: 110, prerequisites: [base.body.id] });
    expect(res.status).toBe(201);
    expect(res.body.prerequisites).toEqual([base.body.id]);
  });

  test('rejects a duplicate title (409), ignoring letter case', async () => {
    await createMovie({ title: 'Iron Man', runtime: 126 });
    const res = await createMovie({ title: 'iron man', runtime: 100 });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('DUPLICATE_TITLE');
  });

  test.each([0, 301, -5, 90.5, '120', null])('rejects runtime %p with 400', async (runtime) => {
    const res = await createMovie({ title: 'Bad Runtime', runtime });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
    expect(res.body.details.some((d) => d.field === 'runtime')).toBe(true);
  });

  test('accepts the runtime boundaries 1 and 300', async () => {
    expect((await createMovie({ title: 'Short', runtime: 1 })).status).toBe(201);
    expect((await createMovie({ title: 'Long', runtime: 300 })).status).toBe(201);
  });

  test('rejects a missing title', async () => {
    const res = await createMovie({ runtime: 100 });
    expect(res.status).toBe(400);
    expect(res.body.details[0].field).toBe('title');
  });

  test('rejects a prerequisite that does not exist', async () => {
    const res = await createMovie({
      title: 'Orphan',
      runtime: 100,
      prerequisites: ['64b7f0f0f0f0f0f0f0f0f0f0'],
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('INVALID_PREREQUISITE');
  });

  test('rejects malformed prerequisite IDs and duplicates', async () => {
    const malformed = await createMovie({ title: 'A', runtime: 100, prerequisites: ['nope'] });
    expect(malformed.status).toBe(400);

    const base = await createMovie({ title: 'Base', runtime: 100 });
    const duplicated = await createMovie({ title: 'B', runtime: 100, prerequisites: [base.body.id, base.body.id] });
    expect(duplicated.status).toBe(400);
  });

  test('rejects unknown fields and invalid JSON', async () => {
    const unknown = await createMovie({ title: 'X', runtime: 100, rating: 10 });
    expect(unknown.status).toBe(400);

    const invalidJson = await request(app)
      .post('/api/movies')
      .set('Content-Type', 'application/json')
      .send('{"title": ');
    expect(invalidJson.status).toBe(400);
    expect(invalidJson.body.error).toBe('INVALID_JSON');
  });
});

describe('GET /api/movies', () => {
  beforeEach(resetDatabase);

  test('returns an empty array when there are no movies', async () => {
    const res = await request(app).get('/api/movies');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('lists all movies', async () => {
    await seedExample();
    const res = await request(app).get('/api/movies');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(8);
  });
});

describe('PATCH /api/movies/:id', () => {
  let ids;
  beforeEach(async () => {
    ids = await seedExample();
  });

  const patch = (id, body) => request(app).patch(`/api/movies/${id}`).send(body);

  test('marks a movie watched and unwatched', async () => {
    const watched = await patch(ids['Iron Man'], { watched: true });
    expect(watched.status).toBe(200);
    expect(watched.body.watched).toBe(true);

    const unwatched = await patch(ids['Iron Man'], { watched: false });
    expect(unwatched.body.watched).toBe(false);
  });

  test('edits title, year and runtime', async () => {
    const res = await patch(ids['Iron Man'], { title: 'Iron Man (2008)', releaseYear: 2008, runtime: 125 });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ title: 'Iron Man (2008)', runtime: 125 });
  });

  test('allows re-saving a movie with its own title', async () => {
    const res = await patch(ids['Iron Man'], { title: 'Iron Man' });
    expect(res.status).toBe(200);
  });

  test('rejects renaming to another movie\'s title (409)', async () => {
    const res = await patch(ids['Iron Man'], { title: 'The Avengers' });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('DUPLICATE_TITLE');
  });

  test('rejects an invalid runtime and a non-boolean watched flag', async () => {
    expect((await patch(ids['Iron Man'], { runtime: 500 })).status).toBe(400);
    expect((await patch(ids['Iron Man'], { watched: 'yes' })).status).toBe(400);
    expect((await patch(ids['Iron Man'], {})).status).toBe(400);
  });

  test('updates prerequisites without creating a cycle', async () => {
    const res = await patch(ids['Thor: Ragnarok'], { prerequisites: [ids['Iron Man']] });
    expect(res.status).toBe(200);
    expect(res.body.prerequisites).toEqual([ids['Iron Man']]);

    const cleared = await patch(ids['Thor: Ragnarok'], { prerequisites: [] });
    expect(cleared.status).toBe(200);
    expect(cleared.body.prerequisites).toEqual([]);
  });

  test('assessment case 4: Endgame as a prerequisite of Iron Man -> 409 CIRCULAR_DEPENDENCY', async () => {
    const res = await patch(ids['Iron Man'], { prerequisites: [ids['Avengers: Endgame']] });
    expect(res.status).toBe(409);
    expect(res.body).toEqual({
      error: 'CIRCULAR_DEPENDENCY',
      message: 'This prerequisite selection creates a circular dependency.',
    });
  });

  test('rejects a direct self-dependency with 409 CIRCULAR_DEPENDENCY', async () => {
    const res = await patch(ids['Iron Man'], { prerequisites: [ids['Iron Man']] });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('CIRCULAR_DEPENDENCY');
  });

  test('rejects an indirect cycle: Iron Man -> Civil War (-> Avengers -> Iron Man)', async () => {
    const res = await patch(ids['Iron Man'], { prerequisites: [ids['Captain America: Civil War']] });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('CIRCULAR_DEPENDENCY');
  });

  test('a rejected update leaves the stored prerequisites unchanged', async () => {
    await patch(ids['Iron Man'], { prerequisites: [ids['Avengers: Endgame']] });
    const list = await request(app).get('/api/movies');
    const ironMan = list.body.find((m) => m.title === 'Iron Man');
    expect(ironMan.prerequisites).toEqual([]);
  });

  test('rejects nonexistent prerequisite IDs (400)', async () => {
    const res = await patch(ids['Iron Man'], { prerequisites: ['64b7f0f0f0f0f0f0f0f0f0f0'] });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('INVALID_PREREQUISITE');
  });

  test('returns 404 for a missing movie and 400 for an invalid ID', async () => {
    expect((await patch('64b7f0f0f0f0f0f0f0f0f0f0', { watched: true })).status).toBe(404);
    const invalid = await patch('not-an-id', { watched: true });
    expect(invalid.status).toBe(400);
    expect(invalid.body.error).toBe('INVALID_ID');
  });
});

describe('GET /api/movies/:id/rewatch-order', () => {
  let ids;
  beforeEach(async () => {
    ids = await seedExample();
  });

  const rewatch = (title) => request(app).get(`/api/movies/${ids[title]}/rewatch-order`);
  const markWatched = (title) => request(app).patch(`/api/movies/${ids[title]}`).send({ watched: true });

  test('case 1: Avengers: Doomsday needs the 7 other movies exactly once, prerequisites first', async () => {
    const res = await rewatch('Avengers: Doomsday');
    expect(res.status).toBe(200);
    expect(res.body.targetMovie).toEqual({ id: ids['Avengers: Doomsday'], title: 'Avengers: Doomsday' });

    const titles = res.body.movies.map((m) => m.title);
    expect(titles).toHaveLength(7);
    expect(new Set(titles).size).toBe(7);
    expect(titles).not.toContain('Avengers: Doomsday');

    const before = (a, b) => titles.indexOf(a) < titles.indexOf(b);
    expect(before('Iron Man', 'The Avengers')).toBe(true);
    expect(before('Captain America: The First Avenger', 'The Avengers')).toBe(true);
    expect(before('The Avengers', 'Captain America: Civil War')).toBe(true);
    expect(before('Captain America: Civil War', 'Avengers: Infinity War')).toBe(true);
    expect(before('Thor: Ragnarok', 'Avengers: Infinity War')).toBe(true);
    expect(before('Avengers: Infinity War', 'Avengers: Endgame')).toBe(true);
  });

  test('case 2: Civil War needs Iron Man, The First Avenger and The Avengers', async () => {
    const res = await rewatch('Captain America: Civil War');
    const titles = res.body.movies.map((m) => m.title);
    expect([...titles].sort()).toEqual(
      ['Captain America: The First Avenger', 'Iron Man', 'The Avengers'].sort()
    );
    expect(titles[2]).toBe('The Avengers');
  });

  test('case 3: Thor: Ragnarok has an empty prerequisite list', async () => {
    const res = await rewatch('Thor: Ragnarok');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ movies: [], watchedCount: 0, totalMovies: 0, remainingRuntime: 0 });
  });

  test('with nothing watched, remaining runtime is the sum of all prerequisites', async () => {
    const res = await rewatch('Avengers: Doomsday');
    expect(res.body.watchedCount).toBe(0);
    expect(res.body.totalMovies).toBe(7);
    expect(res.body.remainingRuntime).toBe(126 + 124 + 143 + 147 + 130 + 149 + 181);
  });

  test('watched count and remaining runtime reflect watched prerequisites', async () => {
    await markWatched('Iron Man');
    await markWatched('The Avengers');
    const res = await rewatch('Avengers: Doomsday');
    expect(res.body.watchedCount).toBe(2);
    expect(res.body.remainingRuntime).toBe(124 + 147 + 130 + 149 + 181);
    expect(res.body.movies.find((m) => m.title === 'Iron Man').watched).toBe(true);
  });

  test('the target movie\'s own watched status and runtime are not counted', async () => {
    await markWatched('Avengers: Doomsday');
    const res = await rewatch('Avengers: Doomsday');
    expect(res.body.watchedCount).toBe(0);
    expect(res.body.totalMovies).toBe(7);
    expect(res.body.remainingRuntime).toBe(1000);
  });

  test('all prerequisites watched leaves zero remaining runtime', async () => {
    const titles = [
      'Iron Man',
      'Captain America: The First Avenger',
      'The Avengers',
      'Captain America: Civil War',
      'Thor: Ragnarok',
      'Avengers: Infinity War',
      'Avengers: Endgame',
    ];
    for (const title of titles) await markWatched(title);
    const res = await rewatch('Avengers: Doomsday');
    expect(res.body).toMatchObject({ watchedCount: 7, totalMovies: 7, remainingRuntime: 0 });
  });

  test('reflects changed prerequisites dynamically', async () => {
    await request(app)
      .patch(`/api/movies/${ids['Thor: Ragnarok']}`)
      .send({ prerequisites: [ids['Iron Man']] });
    const res = await rewatch('Thor: Ragnarok');
    expect(res.body.movies.map((m) => m.title)).toEqual(['Iron Man']);
  });

  test('returns 404 for a missing movie and 400 for an invalid ID', async () => {
    expect((await request(app).get('/api/movies/64b7f0f0f0f0f0f0f0f0f0f0/rewatch-order')).status).toBe(404);
    expect((await request(app).get('/api/movies/abc/rewatch-order')).status).toBe(400);
  });
});

describe('DELETE /api/movies/:id', () => {
  let ids;
  beforeEach(async () => {
    ids = await seedExample();
  });

  test('deletes a movie nothing depends on', async () => {
    const res = await request(app).delete(`/api/movies/${ids['Avengers: Doomsday']}`);
    expect(res.status).toBe(200);
    expect((await request(app).get('/api/movies')).body).toHaveLength(7);
  });

  test('refuses to delete a movie that others depend on (409 HAS_DEPENDENTS)', async () => {
    const res = await request(app).delete(`/api/movies/${ids['Iron Man']}`);
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('HAS_DEPENDENTS');
    expect(res.body.message).toContain('The Avengers');
  });

  test('force delete removes the reference from dependents so none dangle', async () => {
    const res = await request(app).delete(`/api/movies/${ids['Iron Man']}?force=true`);
    expect(res.status).toBe(200);
    expect(res.body.removedFromDependents).toBe(1);

    const movies = (await request(app).get('/api/movies')).body;
    movies.forEach((m) => expect(m.prerequisites).not.toContain(ids['Iron Man']));
    const avengers = movies.find((m) => m.title === 'The Avengers');
    expect(avengers.prerequisites).toEqual([ids['Captain America: The First Avenger']]);
  });

  test('returns 404 when deleting a missing movie', async () => {
    expect((await request(app).delete('/api/movies/64b7f0f0f0f0f0f0f0f0f0f0')).status).toBe(404);
  });
});

describe('general API behaviour', () => {
  test('unknown routes return a JSON 404', async () => {
    const res = await request(app).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('ROUTE_NOT_FOUND');
  });

  test('health check responds', async () => {
    expect((await request(app).get('/api/health')).body).toEqual({ status: 'ok' });
  });
});
