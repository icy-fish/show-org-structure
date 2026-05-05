const express = require('express');
const router = express.Router();
const { getDb } = require('../database');

router.get('/', async (req, res) => {
  const db = await getDb();
  const orgs = await db.all('SELECT * FROM organizations ORDER BY name');
  res.json(orgs);
});

router.get('/:id', async (req, res) => {
  const db = await getDb();
  const org = await db.get('SELECT * FROM organizations WHERE id = ?', req.params.id);
  if (!org) return res.status(404).json({ error: 'Organization not found' });
  res.json(org);
});

router.post('/', async (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  const db = await getDb();
  const result = await db.run('INSERT INTO organizations (name, description) VALUES (?, ?)', name, description || null);
  res.status(201).json({ id: result.lastID, name, description });
});

router.put('/:id', async (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  const db = await getDb();
  const result = await db.run('UPDATE organizations SET name = ?, description = ? WHERE id = ?', name, description || null, req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Organization not found' });
  res.json({ id: parseInt(req.params.id), name, description });
});

router.delete('/:id', async (req, res) => {
  const db = await getDb();
  const result = await db.run('DELETE FROM organizations WHERE id = ?', req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Organization not found' });
  res.json({ success: true });
});

module.exports = router;
