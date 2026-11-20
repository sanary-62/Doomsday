const request = require('supertest');
const { setupDatabase, resetDatabase, teardownDatabase } = require('./helpers');

let app;

beforeAll(async () => {
  app = await setupDatabase();
});

afterAll(async () => {
  await teardownDatabase();
});

beforeEach(resetDatabase);

const createCinema = (body) => request(app).post('/api/cinemas').send(body);
const quote = (id, groupSize) => request(app).get(`/api/cinemas/${id}/booking`).query({ groupSize });

describe('POST /api/cinemas', () => {
  test('creates a cinema and stores bundle sizes in ascending order', async () => {
    const res = await createCinema({ name: 'Metro', bundleSizes: [5, 2] });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: 'Metro', bundleSizes: [2, 5] });
    expect(res.body.id).toMatch(/^[a-f\d]{24}$/);
  });

  test('rejects a duplicate cinema name (409), ignoring letter case', async () => {
    await createCinema({ name: 'Metro', bundleSizes: [2, 5] });
    const res = await createCinema({ name: 'METRO', bundleSizes: [3] });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('DUPLICATE_NAME');
  });

  test.each([
    ['empty array', []],
    ['missing array', undefined],
    ['duplicate sizes', [3, 3]],
    ['size 0', [0, 4]],
    ['size 501', [501]],
    ['decimal size', [2.5]],
    ['string size', ['5']],
    ['11 sizes', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]],
  ])('rejects %s with 400', async (_label, bundleSizes) => {
    const res = await createCinema({ name: 'Bad', bundleSizes });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  test('rejects a missing name', async () => {
    expect((await createCinema({ bundleSizes: [2] })).status).toBe(400);
  });
});

describe('GET /api/cinemas and /api/cinemas/:id', () => {
  test('lists cinemas and returns details by ID', async () => {
    expect((await request(app).get('/api/cinemas')).body).toEqual([]);

    const created = await createCinema({ name: 'Metro', bundleSizes: [2, 5] });
    await createCinema({ name: 'Alpha', bundleSizes: [1] });

    const list = await request(app).get('/api/cinemas');
    expect(list.status).toBe(200);
    expect(list.body.map((c) => c.name)).toEqual(['Alpha', 'Metro']);

    const detail = await request(app).get(`/api/cinemas/${created.body.id}`);
    expect(detail.status).toBe(200);
    expect(detail.body.name).toBe('Metro');
  });

  test('returns 404 for a missing cinema and 400 for an invalid ID', async () => {
    expect((await request(app).get('/api/cinemas/64b7f0f0f0f0f0f0f0f0f0f0')).status).toBe(404);
    expect((await request(app).get('/api/cinemas/xyz')).status).toBe(400);
  });
});

describe('GET /api/cinemas/:id/booking', () => {
  const makeCinema = async (bundleSizes) => (await createCinema({ name: `Cinema ${bundleSizes}`, bundleSizes })).body;

  test.each([
    [[1, 3, 4], 6, 2, { 3: 2 }],
    [[2, 5], 11, 4, { 5: 1, 2: 3 }],
    [[6, 9, 20], 44, 4, { 20: 1, 9: 2, 6: 1 }],
  ])('assessment example %p for group %p', async (sizes, groupSize, totalBundles, bundles) => {
    const cinema = await makeCinema(sizes);
    const res = await quote(cinema.id, groupSize);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ possible: true, groupSize, totalBundles, bundles });
  });

  test('assessment example [4,6] for 7 is not possible', async () => {
    const cinema = await makeCinema([4, 6]);
    const res = await quote(cinema.id, 7);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      possible: false,
      message: 'No exact bundle combination is possible for this group size.',
    });
    expect(res.body.bundles).toBeUndefined();
  });

  test('handles the group size limits 1 and 10,000', async () => {
    const cinema = await makeCinema([1, 500]);
    expect((await quote(cinema.id, 1)).body).toMatchObject({ possible: true, totalBundles: 1 });
    expect((await quote(cinema.id, 10000)).body).toMatchObject({
      possible: true,
      totalBundles: 20,
      bundles: { 500: 20 },
    });
  });

  test.each(['0', '10001', '-1', '6.5', 'abc', ''])('rejects groupSize %p with 400', async (groupSize) => {
    const cinema = await makeCinema([2, 5]);
    const res = await quote(cinema.id, groupSize);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  test('rejects a missing groupSize', async () => {
    const cinema = await makeCinema([2, 5]);
    expect((await request(app).get(`/api/cinemas/${cinema.id}/booking`)).status).toBe(400);
  });

  test('returns 404 for a missing cinema and 400 for an invalid ID', async () => {
    expect((await quote('64b7f0f0f0f0f0f0f0f0f0f0', 6)).status).toBe(404);
    expect((await quote('bad-id', 6)).status).toBe(400);
  });
});
