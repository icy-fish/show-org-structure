/**
 * Backend integration tests for /api/departments
 *
 * Uses a real SQLite in-memory database — no mocks.
 */

'use strict';

process.env.DB_PATH = ':memory:';
jest.resetModules();

const request = require('supertest');
const app = require('../app');

let orgId;

beforeAll(async () => {
  // Initialise schema via first request, then create an org to use throughout.
  await request(app).get('/api/organizations');
  const res = await request(app)
    .post('/api/organizations')
    .send({ name: 'Test Org' });
  orgId = res.body.id;
});

afterAll(async () => {
  const { getDb } = require('../database');
  const db = await getDb();
  await db.close();
});

// Helper: create a department and return its id.
async function createDept(fields = {}) {
  const res = await request(app)
    .post('/api/departments')
    .send({ org_id: orgId, name: 'Dept', ...fields });
  expect(res.status).toBe(201);
  return res.body.id;
}

// Helper: create a person and return its id.
async function createPerson(fields = {}) {
  const res = await request(app)
    .post('/api/persons')
    .send({ org_id: orgId, name: 'Person', ...fields });
  expect(res.status).toBe(201);
  return res.body.id;
}

// ---------------------------------------------------------------------------
// GET /api/departments/org/:orgId
// ---------------------------------------------------------------------------

describe('GET /api/departments/org/:orgId', () => {
  it('returns an empty array when no departments exist for the org', async () => {
    // Create a separate org so we get a clean slate.
    const orgRes = await request(app)
      .post('/api/organizations')
      .send({ name: 'Empty Org' });
    const emptyOrgId = orgRes.body.id;

    const res = await request(app).get(`/api/departments/org/${emptyOrgId}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns departments sorted by name', async () => {
    const orgRes = await request(app).post('/api/organizations').send({ name: 'Sort Org' });
    const oid = orgRes.body.id;
    await request(app).post('/api/departments').send({ org_id: oid, name: 'Zebra' });
    await request(app).post('/api/departments').send({ org_id: oid, name: 'Alpha' });

    const res = await request(app).get(`/api/departments/org/${oid}`);
    expect(res.status).toBe(200);
    const names = res.body.map(d => d.name);
    expect(names[0]).toBe('Alpha');
    expect(names[1]).toBe('Zebra');
  });

  it('includes owner fields joined from persons when owner_id is set', async () => {
    const orgRes = await request(app).post('/api/organizations').send({ name: 'Owner Org' });
    const oid = orgRes.body.id;

    const personRes = await request(app)
      .post('/api/persons')
      .send({ org_id: oid, name: 'Jane Smith', title: 'CTO', email: 'jane@example.com', description: 'Lead engineer' });
    const pid = personRes.body.id;

    const deptRes = await request(app)
      .post('/api/departments')
      .send({ org_id: oid, name: 'Engineering', owner_id: pid });
    const did = deptRes.body.id;

    const res = await request(app).get(`/api/departments/org/${oid}`);
    expect(res.status).toBe(200);
    const dept = res.body.find(d => d.id === did);
    expect(dept).toMatchObject({
      owner_name: 'Jane Smith',
      owner_title: 'CTO',
      owner_email: 'jane@example.com',
      owner_description: 'Lead engineer',
    });
  });

  it('returns null owner fields when owner_id is not set', async () => {
    const orgRes = await request(app).post('/api/organizations').send({ name: 'No Owner Org' });
    const oid = orgRes.body.id;
    await request(app).post('/api/departments').send({ org_id: oid, name: 'No Owner Dept' });

    const res = await request(app).get(`/api/departments/org/${oid}`);
    const dept = res.body[0];
    expect(dept.owner_name).toBeNull();
    expect(dept.owner_title).toBeNull();
    expect(dept.owner_email).toBeNull();
  });

  it('does not return departments from other organizations', async () => {
    const org1Res = await request(app).post('/api/organizations').send({ name: 'Org One' });
    const org2Res = await request(app).post('/api/organizations').send({ name: 'Org Two' });
    const oid1 = org1Res.body.id;
    const oid2 = org2Res.body.id;

    await request(app).post('/api/departments').send({ org_id: oid1, name: 'Only In Org1' });

    const res = await request(app).get(`/api/departments/org/${oid2}`);
    expect(res.body.every(d => d.org_id === oid2)).toBe(true);
    expect(res.body.find(d => d.name === 'Only In Org1')).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// POST /api/departments
// ---------------------------------------------------------------------------

describe('POST /api/departments', () => {
  it('creates a department with required fields only', async () => {
    const res = await request(app)
      .post('/api/departments')
      .send({ org_id: orgId, name: 'Sales' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ org_id: orgId, name: 'Sales' });
    expect(res.body).toHaveProperty('id');
    expect(res.body.pos_x).toBe(0);
    expect(res.body.pos_y).toBe(0);
  });

  it('creates a department with all optional fields', async () => {
    const parentId = await createDept({ name: 'Parent' });
    const personId = await createPerson({ name: 'Owner' });

    const res = await request(app)
      .post('/api/departments')
      .send({
        org_id: orgId,
        name: 'Child Dept',
        description: 'A child',
        parent_dept_id: parentId,
        owner_id: personId,
        pos_x: 100,
        pos_y: 200,
      });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      name: 'Child Dept',
      description: 'A child',
      parent_dept_id: parentId,
      owner_id: personId,
      pos_x: 100,
      pos_y: 200,
    });
  });

  it('returns 400 when org_id is missing', async () => {
    const res = await request(app)
      .post('/api/departments')
      .send({ name: 'No Org' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 when name is missing', async () => {
    const res = await request(app)
      .post('/api/departments')
      .send({ org_id: orgId });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 when both org_id and name are missing', async () => {
    const res = await request(app)
      .post('/api/departments')
      .send({});
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });
});

// ---------------------------------------------------------------------------
// PUT /api/departments/:id
// ---------------------------------------------------------------------------

describe('PUT /api/departments/:id', () => {
  let deptId;

  beforeEach(async () => {
    deptId = await createDept({ name: 'Original', description: 'Old desc', pos_x: 10, pos_y: 20 });
  });

  it('updates name and description', async () => {
    const res = await request(app)
      .put(`/api/departments/${deptId}`)
      .send({ name: 'Updated', description: 'New desc' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: deptId, name: 'Updated', description: 'New desc' });
  });

  it('allows setting a parent department', async () => {
    const parentId = await createDept({ name: 'Parent Dept' });
    const res = await request(app)
      .put(`/api/departments/${deptId}`)
      .send({ name: 'Child', parent_dept_id: parentId });
    expect(res.status).toBe(200);
    expect(res.body.parent_dept_id).toBe(parentId);
  });

  it('allows setting an owner', async () => {
    const personId = await createPerson({ name: 'New Owner' });
    const res = await request(app)
      .put(`/api/departments/${deptId}`)
      .send({ name: 'Dept With Owner', owner_id: personId });
    expect(res.status).toBe(200);
    expect(res.body.owner_id).toBe(personId);
  });

  it('preserves pos_x and pos_y when provided', async () => {
    const res = await request(app)
      .put(`/api/departments/${deptId}`)
      .send({ name: 'Moved', pos_x: 300, pos_y: 400 });
    expect(res.status).toBe(200);
    expect(res.body.pos_x).toBe(300);
    expect(res.body.pos_y).toBe(400);
  });

  it('returns 400 when name is missing', async () => {
    const res = await request(app)
      .put(`/api/departments/${deptId}`)
      .send({ description: 'No name' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 404 when department does not exist', async () => {
    const res = await request(app)
      .put('/api/departments/999999')
      .send({ name: 'Ghost' });
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/departments/:id/position
// ---------------------------------------------------------------------------

describe('PATCH /api/departments/:id/position', () => {
  let deptId;

  beforeEach(async () => {
    deptId = await createDept({ name: 'Pos Dept', pos_x: 0, pos_y: 0 });
  });

  it('updates position and returns success', async () => {
    const res = await request(app)
      .patch(`/api/departments/${deptId}/position`)
      .send({ pos_x: 150, pos_y: 250 });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
  });

  it('persists position so subsequent org query reflects it', async () => {
    await request(app)
      .patch(`/api/departments/${deptId}/position`)
      .send({ pos_x: 500, pos_y: 600 });

    const listRes = await request(app).get(`/api/departments/org/${orgId}`);
    const dept = listRes.body.find(d => d.id === deptId);
    expect(dept.pos_x).toBe(500);
    expect(dept.pos_y).toBe(600);
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/departments/:id
// ---------------------------------------------------------------------------

describe('DELETE /api/departments/:id', () => {
  let deptId;

  beforeEach(async () => {
    deptId = await createDept({ name: 'To Delete' });
  });

  it('deletes the department and returns success', async () => {
    const res = await request(app).delete(`/api/departments/${deptId}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
  });

  it('is no longer returned after deletion', async () => {
    await request(app).delete(`/api/departments/${deptId}`);
    const listRes = await request(app).get(`/api/departments/org/${orgId}`);
    expect(listRes.body.find(d => d.id === deptId)).toBeUndefined();
  });

  it('returns 404 when department does not exist', async () => {
    const res = await request(app).delete('/api/departments/999999');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });
});
