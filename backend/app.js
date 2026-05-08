const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/organizations', require('./routes/organizations'));
app.use('/api/departments', require('./routes/departments'));
app.use('/api/persons', require('./routes/persons'));
app.use('/api/relations', require('./routes/relations'));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

module.exports = app;
