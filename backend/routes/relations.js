const express = require('express');
const router = express.Router();
const { getDb } = require('../database');

router.get('/org/:orgId', async (req, res) => {
  const db = await getDb();
  const relations = await db.all(`
    SELECT dr.*, d1.name as from_dept_name, d2.name as to_dept_name
    FROM department_relations dr
    JOIN departments d1 ON dr.from_dept_id = d1.id
    JOIN departments d2 ON dr.to_dept_id = d2.id
    WHERE d1.org_id = ?
  `, req.params.orgId);
  res.json(relations);
});

router.post('/', async (req, res) => {
  const { from_dept_id, to_dept_id, label, relation_type } = req.body;
  if (!from_dept_id || !to_dept_id) return res.status(400).json({ error: 'from_dept_id and to_dept_id are required' });
  const db = await getDb();
  const result = await db.run(
    'INSERT INTO department_relations (from_dept_id, to_dept_id, label, relation_type) VALUES (?, ?, ?, ?)',
    from_dept_id, to_dept_id, label || null, relation_type || 'custom'
  );
  res.status(201).json({ id: result.lastID, from_dept_id, to_dept_id, label, relation_type: relation_type || 'custom' });
});

router.put('/:id', async (req, res) => {
  const { label, relation_type } = req.body;
  const db = await getDb();
  const result = await db.run(
    'UPDATE department_relations SET label = ?, relation_type = ? WHERE id = ?',
    label || null, relation_type || 'custom', req.params.id
  );
  if (result.changes === 0) return res.status(404).json({ error: 'Relation not found' });
  res.json({ id: parseInt(req.params.id), label, relation_type });
});

router.delete('/:id', async (req, res) => {
  const db = await getDb();
  const result = await db.run('DELETE FROM department_relations WHERE id = ?', req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Relation not found' });
  res.json({ success: true });
});

module.exports = router;
