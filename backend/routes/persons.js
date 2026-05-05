const express = require('express');
const router = express.Router();
const { getDb } = require('../database');

router.get('/org/:orgId', async (req, res) => {
  const db = await getDb();
  const persons = await db.all(`
    SELECT p.*, d.name as dept_name
    FROM persons p
    LEFT JOIN departments d ON p.dept_id = d.id
    WHERE p.org_id = ?
    ORDER BY p.name
  `, req.params.orgId);

  const reports = await db.all(`
    SELECT pr.id, pr.person_id, pr.reports_to_id, p.name as reports_to_name
    FROM person_reports pr
    JOIN persons p ON pr.reports_to_id = p.id
    WHERE pr.person_id IN (SELECT id FROM persons WHERE org_id = ?)
  `, req.params.orgId);

  const reportsMap = {};
  reports.forEach(r => {
    if (!reportsMap[r.person_id]) reportsMap[r.person_id] = [];
    reportsMap[r.person_id].push({ id: r.reports_to_id, name: r.reports_to_name, rel_id: r.id });
  });

  res.json(persons.map(p => ({ ...p, reports_to: reportsMap[p.id] || [] })));
});

router.post('/', async (req, res) => {
  const { org_id, dept_id, name, title, email, pos_x, pos_y } = req.body;
  if (!org_id || !name) return res.status(400).json({ error: 'org_id and name are required' });
  const db = await getDb();
  const result = await db.run(
    'INSERT INTO persons (org_id, dept_id, name, title, email, pos_x, pos_y) VALUES (?, ?, ?, ?, ?, ?, ?)',
    org_id, dept_id || null, name, title || null, email || null, pos_x || 0, pos_y || 0
  );
  res.status(201).json({ id: result.lastID, org_id, dept_id, name, title, email, pos_x: pos_x || 0, pos_y: pos_y || 0, reports_to: [] });
});

router.put('/:id', async (req, res) => {
  const { dept_id, name, title, email, pos_x, pos_y } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  const db = await getDb();
  const result = await db.run(
    'UPDATE persons SET dept_id = ?, name = ?, title = ?, email = ?, pos_x = ?, pos_y = ? WHERE id = ?',
    dept_id || null, name, title || null, email || null, pos_x || 0, pos_y || 0, req.params.id
  );
  if (result.changes === 0) return res.status(404).json({ error: 'Person not found' });
  res.json({ id: parseInt(req.params.id), dept_id, name, title, email, pos_x, pos_y });
});

router.patch('/:id/position', async (req, res) => {
  const { pos_x, pos_y } = req.body;
  const db = await getDb();
  await db.run('UPDATE persons SET pos_x = ?, pos_y = ? WHERE id = ?', pos_x, pos_y, req.params.id);
  res.json({ success: true });
});

router.delete('/:id', async (req, res) => {
  const db = await getDb();
  const result = await db.run('DELETE FROM persons WHERE id = ?', req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Person not found' });
  res.json({ success: true });
});

router.post('/reports', async (req, res) => {
  const { person_id, reports_to_id } = req.body;
  if (!person_id || !reports_to_id) return res.status(400).json({ error: 'person_id and reports_to_id are required' });
  const db = await getDb();
  const existing = await db.get('SELECT id FROM person_reports WHERE person_id = ? AND reports_to_id = ?', person_id, reports_to_id);
  if (existing) return res.status(409).json({ error: 'Relation already exists' });
  const result = await db.run('INSERT INTO person_reports (person_id, reports_to_id) VALUES (?, ?)', person_id, reports_to_id);
  res.status(201).json({ id: result.lastID, person_id, reports_to_id });
});

router.delete('/reports/:id', async (req, res) => {
  const db = await getDb();
  const result = await db.run('DELETE FROM person_reports WHERE id = ?', req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Report relation not found' });
  res.json({ success: true });
});

module.exports = router;
