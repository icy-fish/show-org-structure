/**
 * Backend integration tests for /api/relations
 *
 * Uses a real SQLite in-memory database — no mocks.
 */

'use strict';

process.env.DB_PATH = ':memory:';
jest.resetModules();

const request = require('supertest');
const app = require('../app');

let orgId;
let deptA;
let deptB;
let deptC;

beforeAll(async () => {
  await request(app).get('/api/organizations');

  const orgRes = await request(app)
    .post('/api/organizations')
    .send({ name: 'Relations Test Org' });
  orgId = orgRes.body.id;

  const da = await request(app).post('/api/departments').send({ org_id: orgId, name: 'Dept A' });
  const db_ = await request(app).post('/api/departments').send({ org_id: orgId, name: 'Dept B' });
  const dc = await request(app).post('/api/departments').send({ org_id: orgId, name: 'Dept C' });
  deptA = da.body;
  deptB = db_.body;
  deptC = dc.body;
});

afterAll(async () => {
  const { getDb } = require('../database');
  const db = await getDb();
  await db.close();
});

// Helper: create a relation and return the full response body.
async function createRelation(fields = {}) {
  const res = await request(app)
    .post('/api/relations')
    .send({ from_dept_id: deptA.id, to_dept_id: deptB.id, ...fields });
  expect(res.status).toBe(201);
  return res.body;
}

// ---------------------------------------------------------------------------
// GET /api/relations/org/:orgId
// ---------------------------------------------------------------------------

describe('GET /api/relations/org/:orgId', () => {
  it('returns an empty array when no relations exist', async () => {
    const orgRes = await request(app).post('/api/organizations').send({ name: 'No Relations Org' });
    const emptyOrgId = orgRes.body.id;

    const res = await request(app).get(`/api/relations/org/${emptyOrgId}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns relations with from_dept_name and to_dept_name joined', async () => {
    const rel = await createRelation({ label: 'Named Relation' });

    const res = await request(app).get(`/api/relations/org/${orgId}`);
    expect(res.status).toBe(200);
    const found = res.body.find(r => r.id === rel.id);
    expect(found).toBeDefined();
    expect(found.from_dept_name).toBe('Dept A');
    expect(found.to_dept_name).toBe('Dept B');
  });

  it('returns multiple relations for the same org', async () => {
    const r1 = await createRelation({ from_dept_id: deptA.id, to_dept_id: deptB.id });
    const r2 = await createRelation({ from_dept_id: deptB.id, to_dept_id: deptC.id });

    const res = await request(app).get(`/api/relations/org/${orgId}`);
    const ids = res.body.map(r => r.id);
    expect(ids).toContain(r1.id);
    expect(ids).toContain(r2.id);
  });

  it('does not return relations from departments in other organizations', async () => {
    const org2Res = await request(app).post('/api/organizations').send({ name: 'Other Relations Org' });
    const oid2 = org2Res.body.id;
    const d1 = (await request(app).post('/api/departments').send({ org_id: oid2, name: 'D1' })).body;
    const d2 = (await request(app).post('/api/departments').send({ org_id: oid2, name: 'D2' })).body;
    await request(app).post('/api/relations').send({ from_dept_id: d1.id, to_dept_id: d2.id });

    const res = await request(app).get(`/api/relations/org/${orgId}`);
    const ownDeptIds = new Set([deptA.id, deptB.id, deptC.id]);
    // All returned relations' from_dept must belong to orgId
    for (const r of res.body) {
      expect(ownDeptIds.has(r.from_dept_id)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// POST /api/relations
// ---------------------------------------------------------------------------

describe('POST /api/relations', () => {
  it('creates a relation with required fields only', async () => {
    const res = await request(app)
      .post('/api/relations')
      .send({ from_dept_id: deptA.id, to_dept_id: deptC.id });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      from_dept_id: deptA.id,
      to_dept_id: deptC.id,
      relation_type: 'custom',
    });
    expect(res.body).toHaveProperty('id');
  });

  it('creates a relation with label and relation_type', async () => {
    const res = await request(app)
      .post('/api/relations')
      .send({
        from_dept_id: deptA.id,
        to_dept_id: deptB.id,
        label: 'Collaborates',
        relation_type: 'collaborates',
      });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      label: 'Collaborates',
      relation_type: 'collaborates',
    });
  });

  it('defaults relation_type to "custom" when not provided', async () => {
    const res = await request(app)
      .post('/api/relations')
      .send({ from_dept_id: deptB.id, to_dept_id: deptC.id });
    expect(res.status).toBe(201);
    expect(res.body.relation_type).toBe('custom');
  });

  it('returns 400 when from_dept_id is missing', async () => {
    const res = await request(app)
      .post('/api/relations')
      .send({ to_dept_id: deptB.id });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 when to_dept_id is missing', async () => {
    const res = await request(app)
      .post('/api/relations')
      .send({ from_dept_id: deptA.id });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 when both ids are missing', async () => {
    const res = await request(app)
      .post('/api/relations')
      .send({});
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });
});

// ---------------------------------------------------------------------------
// PUT /api/relations/:id
// ---------------------------------------------------------------------------

describe('PUT /api/relations/:id', () => {
  let relId;

  beforeEach(async () => {
    const rel = await createRelation({ label: 'Old Label', relation_type: 'custom' });
    relId = rel.id;
  });

  it('updates label and relation_type', async () => {
    const res = await request(app)
      .put(`/api/relations/${relId}`)
      .send({ label: 'New Label', relation_type: 'supports' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: relId, label: 'New Label', relation_type: 'supports' });
  });

  it('allows clearing the label', async () => {
    const res = await request(app)
      .put(`/api/relations/${relId}`)
      .send({ relation_type: 'collaborates' });
    expect(res.status).toBe(200);
    expect(res.body.relation_type).toBe('collaborates');
  });

  it('stores "custom" in the database when relation_type is omitted from update', async () => {
    // The route echoes what was sent, so relation_type will be undefined in the response.
    // The DB value is persisted as 'custom' due to the || 'custom' in the SQL.
    const res = await request(app)
      .put(`/api/relations/${relId}`)
      .send({ label: 'Some Label' });
    expect(res.status).toBe(200);
    // Verify the DB stored 'custom' by reading via GET
    const listRes = await request(app).get(`/api/relations/org/${orgId}`);
    const found = listRes.body.find(r => r.id === relId);
    expect(found.relation_type).toBe('custom');
  });

  it('returns 404 when relation does not exist', async () => {
    const res = await request(app)
      .put('/api/relations/999999')
      .send({ label: 'Ghost' });
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/relations/:id
// ---------------------------------------------------------------------------

describe('DELETE /api/relations/:id', () => {
  let relId;

  beforeEach(async () => {
    const rel = await createRelation();
    relId = rel.id;
  });

  it('deletes the relation and returns success', async () => {
    const res = await request(app).delete(`/api/relations/${relId}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
  });

  it('is no longer returned after deletion', async () => {
    await request(app).delete(`/api/relations/${relId}`);
    const listRes = await request(app).get(`/api/relations/org/${orgId}`);
    expect(listRes.body.find(r => r.id === relId)).toBeUndefined();
  });

  it('returns 404 when relation does not exist', async () => {
    const res = await request(app).delete('/api/relations/999999');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });
});
