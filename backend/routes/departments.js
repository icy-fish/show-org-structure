const express = require('express');
const router = express.Router();
const { getDb } = require('../database');

router.get('/org/:orgId', async (req, res) => {
  const db = await getDb();
  const depts = await db.all(`
    SELECT d.*, p.name as owner_name, p.title as owner_title, p.email as owner_email, p.description as owner_description
    FROM departments d
    LEFT JOIN persons p ON d.owner_id = p.id
    WHERE d.org_id = ?
    ORDER BY d.name
  `, req.params.orgId);
  res.json(depts);
});

router.post('/', async (req, res) => {
  const { org_id, name, description, parent_dept_id, owner_id, pos_x, pos_y } = req.body;
  if (!org_id || !name) return res.status(400).json({ error: 'org_id and name are required' });
  const db = await getDb();
  const result = await db.run(
    'INSERT INTO departments (org_id, name, description, parent_dept_id, owner_id, pos_x, pos_y) VALUES (?, ?, ?, ?, ?, ?, ?)',
    org_id, name, description || null, parent_dept_id || null, owner_id || null, pos_x || 0, pos_y || 0
  );
  res.status(201).json({ id: result.lastID, org_id, name, description, parent_dept_id, owner_id, pos_x: pos_x || 0, pos_y: pos_y || 0 });
});

router.put('/:id', async (req, res) => {
  const { name, description, parent_dept_id, owner_id, pos_x, pos_y } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  const db = await getDb();
  const result = await db.run(
    'UPDATE departments SET name = ?, description = ?, parent_dept_id = ?, owner_id = ?, pos_x = ?, pos_y = ? WHERE id = ?',
    name, description || null, parent_dept_id || null, owner_id || null, pos_x || 0, pos_y || 0, req.params.id
  );
  if (result.changes === 0) return res.status(404).json({ error: 'Department not found' });
  res.json({ id: parseInt(req.params.id), name, description, parent_dept_id, owner_id, pos_x, pos_y });
});

router.patch('/:id/position', async (req, res) => {
  const { pos_x, pos_y } = req.body;
  const db = await getDb();
  await db.run('UPDATE departments SET pos_x = ?, pos_y = ? WHERE id = ?', pos_x, pos_y, req.params.id);
  res.json({ success: true });
});

router.delete('/:id', async (req, res) => {
  const db = await getDb();
  const result = await db.run('DELETE FROM departments WHERE id = ?', req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Department not found' });
  res.json({ success: true });
});

module.exports = router;
