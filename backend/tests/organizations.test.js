/**
 * Backend integration tests for /api/organizations
 *
 * Uses a real SQLite in-memory database — no mocks.
 * Each test file sets DB_PATH=:memory: and resets the module registry
 * so every suite gets a fresh, empty database.
 */

'use strict';

process.env.DB_PATH = ':memory:';

// Reset module registry so database.js creates a fresh :memory: handle
// for this test file, not reusing any cached handle from another suite.
jest.resetModules();

const request = require('supertest');
const app = require('../app');

// Ensure the DB schema is initialised before the first test by making one call.
beforeAll(async () => {
  await request(app).get('/api/organizations');
});

afterAll(async () => {
  // Close the SQLite connection so Jest can exit cleanly.
  const { getDb } = require('../database');
  const db = await getDb();
  await db.close();
});

// ---------------------------------------------------------------------------
// GET /api/organizations
// ---------------------------------------------------------------------------

describe('GET /api/organizations', () => {
  it('returns an empty array when no organizations exist', async () => {
    const res = await request(app).get('/api/organizations');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns all organizations sorted by name', async () => {
    await request(app).post('/api/organizations').send({ name: 'Zebra Corp' });
    await request(app).post('/api/organizations').send({ name: 'Acme Inc' });

    const res = await request(app).get('/api/organizations');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
    const names = res.body.map(o => o.name);
    expect(names.indexOf('Acme Inc')).toBeLessThan(names.indexOf('Zebra Corp'));
  });

  it('includes id, name, description, and created_at fields', async () => {
    const res = await request(app).get('/api/organizations');
    expect(res.status).toBe(200);
    const org = res.body.find(o => o.name === 'Acme Inc');
    expect(org).toMatchObject({ name: 'Acme Inc' });
    expect(org).toHaveProperty('id');
    expect(org).toHaveProperty('created_at');
  });
});

// ---------------------------------------------------------------------------
// GET /api/organizations/:id
// ---------------------------------------------------------------------------

describe('GET /api/organizations/:id', () => {
  let orgId;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/organizations')
      .send({ name: 'Get By Id Corp', description: 'A test org' });
    orgId = res.body.id;
  });

  it('returns the organization when it exists', async () => {
    const res = await request(app).get(`/api/organizations/${orgId}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: orgId, name: 'Get By Id Corp', description: 'A test org' });
  });

  it('returns 404 when the organization does not exist', async () => {
    const res = await request(app).get('/api/organizations/999999');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });
});

// ---------------------------------------------------------------------------
// POST /api/organizations
// ---------------------------------------------------------------------------

describe('POST /api/organizations', () => {
  it('creates an organization with name and description', async () => {
    const res = await request(app)
      .post('/api/organizations')
      .send({ name: 'New Org', description: 'Some description' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: 'New Org', description: 'Some description' });
    expect(res.body).toHaveProperty('id');
  });

  it('creates an organization with name only (no description)', async () => {
    const res = await request(app)
      .post('/api/organizations')
      .send({ name: 'Minimal Org' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: 'Minimal Org' });
  });

  it('returns 400 when name is missing', async () => {
    const res = await request(app)
      .post('/api/organizations')
      .send({ description: 'No name here' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 when body is empty', async () => {
    const res = await request(app)
      .post('/api/organizations')
      .send({});
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('persists the organization so it can be retrieved afterwards', async () => {
    const createRes = await request(app)
      .post('/api/organizations')
      .send({ name: 'Persistent Org' });
    const { id } = createRes.body;

    const getRes = await request(app).get(`/api/organizations/${id}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.name).toBe('Persistent Org');
  });
});

// ---------------------------------------------------------------------------
// PUT /api/organizations/:id
// ---------------------------------------------------------------------------

describe('PUT /api/organizations/:id', () => {
  let orgId;

  beforeEach(async () => {
    const res = await request(app)
      .post('/api/organizations')
      .send({ name: 'Before Update', description: 'Old desc' });
    orgId = res.body.id;
  });

  it('updates name and description successfully', async () => {
    const res = await request(app)
      .put(`/api/organizations/${orgId}`)
      .send({ name: 'After Update', description: 'New desc' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: orgId, name: 'After Update', description: 'New desc' });
  });

  it('allows clearing description by omitting it', async () => {
    const res = await request(app)
      .put(`/api/organizations/${orgId}`)
      .send({ name: 'After Update' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('After Update');
  });

  it('returns 400 when name is missing', async () => {
    const res = await request(app)
      .put(`/api/organizations/${orgId}`)
      .send({ description: 'No name' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 404 when organization does not exist', async () => {
    const res = await request(app)
      .put('/api/organizations/999999')
      .send({ name: 'Ghost' });
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });

  it('persists the update so subsequent GET reflects the change', async () => {
    await request(app)
      .put(`/api/organizations/${orgId}`)
      .send({ name: 'Verified Update' });

    const getRes = await request(app).get(`/api/organizations/${orgId}`);
    expect(getRes.body.name).toBe('Verified Update');
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/organizations/:id
// ---------------------------------------------------------------------------

describe('DELETE /api/organizations/:id', () => {
  let orgId;

  beforeEach(async () => {
    const res = await request(app)
      .post('/api/organizations')
      .send({ name: 'To Be Deleted' });
    orgId = res.body.id;
  });

  it('deletes the organization and returns success', async () => {
    const res = await request(app).delete(`/api/organizations/${orgId}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
  });

  it('is no longer retrievable after deletion', async () => {
    await request(app).delete(`/api/organizations/${orgId}`);
    const res = await request(app).get(`/api/organizations/${orgId}`);
    expect(res.status).toBe(404);
  });

  it('returns 404 when the organization does not exist', async () => {
    const res = await request(app).delete('/api/organizations/999999');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });
});
