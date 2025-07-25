import { Database } from 'sqlite';
import path from 'path';
import express from 'express';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
const app = express();
app.use(express.json());

let db: Database;
(async () => {
  const database = await open({
    filename: './database.db',
    driver: sqlite3.Database
  });
  db = database;
  await db.exec(`CREATE TABLE IF NOT EXISTS tasks(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      text TEXT NOT NULL,
      notes TEXT DEFAULT '',
      date TEXT NOT NULL
    )`);
  await db.exec(`CREATE TABLE IF NOT EXISTS subtasks(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL,
      text TEXT NOT NULL,
      FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE
    )`);
})();

app.get('/api/tasks', async (req, res) => {
  const date = (req.query.date as string) || new Date().toISOString().substring(0,10);
  const tasks = await db.all('SELECT * FROM tasks WHERE date = ?', date);
  res.json(tasks);
});

app.get('/api/tasks/:id', async (req, res) => {
  const id = req.params.id;
  const task = await db.get('SELECT * FROM tasks WHERE id = ?', id);
  if (!task) return res.status(404).json({ error: 'not found' });
  const subtasks = await db.all('SELECT * FROM subtasks WHERE task_id = ?', id);
  res.json({ ...task, subtasks });
});

app.post('/api/tasks', async (req, res) => {
  const { text, notes = '', date } = req.body;
  if (!text || !date) return res.status(400).json({ error: 'text and date required' });
  const result: any = await db.run('INSERT INTO tasks(text, notes, date) VALUES(?, ?, ?)', text, notes, date);
  res.json({ id: result.lastID, text, notes, date });
});

app.put('/api/tasks/:id', async (req, res) => {
  const { text, notes } = req.body;
  const id = req.params.id;
  const task = await db.get('SELECT * FROM tasks WHERE id = ?', id);
  if (!task) return res.status(404).json({ error: 'not found' });
  await db.run('UPDATE tasks SET text = ?, notes = ? WHERE id = ?', text ?? task.text, notes ?? task.notes, id);
  res.json({ id, text: text ?? task.text, notes: notes ?? task.notes, date: task.date });
});

app.delete('/api/tasks/:id', async (req, res) => {
  const id = req.params.id;
  await db.run('DELETE FROM tasks WHERE id = ?', id);
  res.json({ ok: true });
});

app.get('/api/tasks/:id/subtasks', async (req, res) => {
  const subtasks = await db.all('SELECT * FROM subtasks WHERE task_id = ?', req.params.id);
  res.json(subtasks);
});

app.post('/api/tasks/:id/subtasks', async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'text required' });
  const result: any = await db.run('INSERT INTO subtasks(task_id, text) VALUES(?, ?)', req.params.id, text);
  res.json({ id: result.lastID, task_id: req.params.id, text });
});

app.use(express.static(path.join(__dirname, '../../client/dist')));
app.get('/*path', (_req, res) => {
  res.sendFile(path.join(__dirname, '../../client/dist/index.html'));
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
