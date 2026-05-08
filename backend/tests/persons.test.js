/**
 * Backend integration tests for /api/persons
 *
 * Uses a real SQLite in-memory database — no mocks.
 */

'use strict';

process.env.DB_PATH = ':memory:';
jest.resetModules();

const request = require('supertest');
const app = require('../app');

let orgId;
let deptId;

beforeAll(async () => {
  await request(app).get('/api/organizations');
  const orgRes = await request(app)
    .post('/api/organizations')
    .send({ name: 'Persons Test Org' });
  orgId = orgRes.body.id;

  const deptRes = await request(app)
    .post('/api/departments')
    .send({ org_id: orgId, name: 'Engineering' });
  deptId = deptRes.body.id;
});

afterAll(async () => {
  const { getDb } = require('../database');
  const db = await getDb();
  await db.close();
});

// Helper: create a person and return the full response body.
async function createPerson(fields = {}) {
  const res = await request(app)
    .post('/api/persons')
    .send({ org_id: orgId, name: 'Test Person', ...fields });
  expect(res.status).toBe(201);
  return res.body;
}

// ---------------------------------------------------------------------------
// GET /api/persons/org/:orgId
// ---------------------------------------------------------------------------

describe('GET /api/persons/org/:orgId', () => {
  it('returns an empty array when no persons exist for the org', async () => {
    const orgRes = await request(app).post('/api/organizations').send({ name: 'Empty Person Org' });
    const emptyOrgId = orgRes.body.id;

    const res = await request(app).get(`/api/persons/org/${emptyOrgId}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns persons sorted by name', async () => {
    const orgRes = await request(app).post('/api/organizations').send({ name: 'Sort Person Org' });
    const oid = orgRes.body.id;
    await request(app).post('/api/persons').send({ org_id: oid, name: 'Zelda' });
    await request(app).post('/api/persons').send({ org_id: oid, name: 'Alice' });

    const res = await request(app).get(`/api/persons/org/${oid}`);
    expect(res.status).toBe(200);
    const names = res.body.map(p => p.name);
    expect(names[0]).toBe('Alice');
    expect(names[1]).toBe('Zelda');
  });

  it('includes dept_name joined from departments', async () => {
    const person = await createPerson({ name: 'Dept Person', dept_id: deptId });

    const res = await request(app).get(`/api/persons/org/${orgId}`);
    const found = res.body.find(p => p.id === person.id);
    expect(found).toBeDefined();
    expect(found.dept_name).toBe('Engineering');
  });

  it('includes an empty reports_to array when the person has no reporting relations', async () => {
    const person = await createPerson({ name: 'Solo Person' });

    const res = await request(app).get(`/api/persons/org/${orgId}`);
    const found = res.body.find(p => p.id === person.id);
    expect(found).toBeDefined();
    expect(found.reports_to).toEqual([]);
  });

  it('includes reports_to entries when reporting relations exist', async () => {
    const manager = await createPerson({ name: 'Manager' });
    const report = await createPerson({ name: 'Report' });

    await request(app)
      .post('/api/persons/reports')
      .send({ person_id: report.id, reports_to_id: manager.id });

    const res = await request(app).get(`/api/persons/org/${orgId}`);
    const found = res.body.find(p => p.id === report.id);
    expect(found.reports_to).toHaveLength(1);
    expect(found.reports_to[0]).toMatchObject({ id: manager.id, name: 'Manager' });
    expect(found.reports_to[0]).toHaveProperty('rel_id');
  });

  it('does not return persons from other organizations', async () => {
    const org2Res = await request(app).post('/api/organizations').send({ name: 'Other Org' });
    const oid2 = org2Res.body.id;
    await request(app).post('/api/persons').send({ org_id: oid2, name: 'Foreign Person' });

    const res = await request(app).get(`/api/persons/org/${orgId}`);
    expect(res.body.every(p => p.org_id === orgId)).toBe(true);
    expect(res.body.find(p => p.name === 'Foreign Person')).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// POST /api/persons
// ---------------------------------------------------------------------------

describe('POST /api/persons', () => {
  it('creates a person with required fields only', async () => {
    const res = await request(app)
      .post('/api/persons')
      .send({ org_id: orgId, name: 'Minimal Person' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ org_id: orgId, name: 'Minimal Person' });
    expect(res.body).toHaveProperty('id');
    expect(res.body.pos_x).toBe(0);
    expect(res.body.pos_y).toBe(0);
    expect(res.body.reports_to).toEqual([]);
  });

  it('creates a person with all optional fields', async () => {
    const res = await request(app)
      .post('/api/persons')
      .send({
        org_id: orgId,
        name: 'Full Person',
        title: 'Engineer',
        email: 'full@example.com',
        description: 'A full person',
        dept_id: deptId,
        pos_x: 100,
        pos_y: 200,
      });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      name: 'Full Person',
      title: 'Engineer',
      email: 'full@example.com',
      description: 'A full person',
      dept_id: deptId,
      pos_x: 100,
      pos_y: 200,
    });
  });

  it('returns 400 when org_id is missing', async () => {
    const res = await request(app)
      .post('/api/persons')
      .send({ name: 'No Org' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 when name is missing', async () => {
    const res = await request(app)
      .post('/api/persons')
      .send({ org_id: orgId });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });
});

// ---------------------------------------------------------------------------
// PUT /api/persons/:id
// ---------------------------------------------------------------------------

describe('PUT /api/persons/:id', () => {
  let personId;

  beforeEach(async () => {
    const p = await createPerson({ name: 'Before Update', title: 'Old Title' });
    personId = p.id;
  });

  it('updates name and title', async () => {
    const res = await request(app)
      .put(`/api/persons/${personId}`)
      .send({ name: 'After Update', title: 'New Title' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: personId, name: 'After Update', title: 'New Title' });
  });

  it('allows updating all optional fields', async () => {
    const res = await request(app)
      .put(`/api/persons/${personId}`)
      .send({
        name: 'Full Update',
        title: 'CTO',
        email: 'cto@example.com',
        description: 'Top exec',
        dept_id: deptId,
        pos_x: 500,
        pos_y: 600,
      });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: personId,
      name: 'Full Update',
      title: 'CTO',
      email: 'cto@example.com',
      description: 'Top exec',
    });
  });

  it('returns 400 when name is missing', async () => {
    const res = await request(app)
      .put(`/api/persons/${personId}`)
      .send({ title: 'No Name' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 404 when person does not exist', async () => {
    const res = await request(app)
      .put('/api/persons/999999')
      .send({ name: 'Ghost' });
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/persons/:id/position
// ---------------------------------------------------------------------------

describe('PATCH /api/persons/:id/position', () => {
  let personId;

  beforeEach(async () => {
    const p = await createPerson({ name: 'Position Person', pos_x: 0, pos_y: 0 });
    personId = p.id;
  });

  it('updates position and returns success', async () => {
    const res = await request(app)
      .patch(`/api/persons/${personId}/position`)
      .send({ pos_x: 350, pos_y: 450 });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
  });

  it('persists position so subsequent org query reflects it', async () => {
    await request(app)
      .patch(`/api/persons/${personId}/position`)
      .send({ pos_x: 111, pos_y: 222 });

    const listRes = await request(app).get(`/api/persons/org/${orgId}`);
    const found = listRes.body.find(p => p.id === personId);
    expect(found.pos_x).toBe(111);
    expect(found.pos_y).toBe(222);
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/persons/:id
// ---------------------------------------------------------------------------

describe('DELETE /api/persons/:id', () => {
  let personId;

  beforeEach(async () => {
    const p = await createPerson({ name: 'To Delete' });
    personId = p.id;
  });

  it('deletes the person and returns success', async () => {
    const res = await request(app).delete(`/api/persons/${personId}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
  });

  it('is no longer returned after deletion', async () => {
    await request(app).delete(`/api/persons/${personId}`);
    const listRes = await request(app).get(`/api/persons/org/${orgId}`);
    expect(listRes.body.find(p => p.id === personId)).toBeUndefined();
  });

  it('returns 404 when person does not exist', async () => {
    const res = await request(app).delete('/api/persons/999999');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });
});

// ---------------------------------------------------------------------------
// POST /api/persons/reports
// ---------------------------------------------------------------------------

describe('POST /api/persons/reports', () => {
  let personA;
  let personB;

  beforeEach(async () => {
    personA = await createPerson({ name: 'Person A' });
    personB = await createPerson({ name: 'Person B' });
  });

  it('creates a reporting relation and returns its id', async () => {
    const res = await request(app)
      .post('/api/persons/reports')
      .send({ person_id: personA.id, reports_to_id: personB.id });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ person_id: personA.id, reports_to_id: personB.id });
    expect(res.body).toHaveProperty('id');
  });

  it('returns 400 when person_id is missing', async () => {
    const res = await request(app)
      .post('/api/persons/reports')
      .send({ reports_to_id: personB.id });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 when reports_to_id is missing', async () => {
    const res = await request(app)
      .post('/api/persons/reports')
      .send({ person_id: personA.id });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 409 when the same relation already exists', async () => {
    await request(app)
      .post('/api/persons/reports')
      .send({ person_id: personA.id, reports_to_id: personB.id });

    const res = await request(app)
      .post('/api/persons/reports')
      .send({ person_id: personA.id, reports_to_id: personB.id });
    expect(res.status).toBe(409);
    expect(res.body).toHaveProperty('error');
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/persons/reports/:id
// ---------------------------------------------------------------------------

describe('DELETE /api/persons/reports/:id', () => {
  let personA;
  let personB;
  let relId;

  beforeEach(async () => {
    personA = await createPerson({ name: 'Report Person A' });
    personB = await createPerson({ name: 'Report Person B' });

    const relRes = await request(app)
      .post('/api/persons/reports')
      .send({ person_id: personA.id, reports_to_id: personB.id });
    relId = relRes.body.id;
  });

  it('deletes the reporting relation and returns success', async () => {
    const res = await request(app).delete(`/api/persons/reports/${relId}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
  });

  it('relation is no longer present in org persons query after deletion', async () => {
    await request(app).delete(`/api/persons/reports/${relId}`);

    const listRes = await request(app).get(`/api/persons/org/${orgId}`);
    const found = listRes.body.find(p => p.id === personA.id);
    expect(found.reports_to).toEqual([]);
  });

  it('returns 404 when report relation does not exist', async () => {
    const res = await request(app).delete('/api/persons/reports/999999');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });
});
