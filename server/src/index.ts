import { Database } from 'sqlite';
import path from 'path';
import express from 'express';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
const app = express();
app.use(express.json());

let db: Database;
(async () => {
  try {
    console.log('Initializing database...');
    const database = await open({
      filename: './database.db',
      driver: sqlite3.Database
    });
    db = database;
    await db.exec(`CREATE TABLE IF NOT EXISTS tasks(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        text TEXT NOT NULL,
        notes TEXT DEFAULT '',
        date TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        completed INTEGER DEFAULT 0,
        task_group_id TEXT
      )`);
    await db.exec(`CREATE TABLE IF NOT EXISTS subtasks(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER NOT NULL,
        text TEXT NOT NULL,
        FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE
      )`);
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
  }
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
  const { text, notes = '', date, task_group_id } = req.body;
  if (!text || !date) return res.status(400).json({ error: 'text and date required' });
  const groupId = task_group_id || `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const result: any = await db.run('INSERT INTO tasks(text, notes, date, task_group_id) VALUES(?, ?, ?, ?)', text, notes, date, groupId);
  const task = await db.get('SELECT * FROM tasks WHERE id = ?', result.lastID);
  res.json(task);
});

app.put('/api/tasks/:id', async (req, res) => {
  const { text, notes, completed } = req.body;
  const id = req.params.id;
  const task = await db.get('SELECT * FROM tasks WHERE id = ?', id);
  if (!task) return res.status(404).json({ error: 'not found' });
  await db.run('UPDATE tasks SET text = ?, notes = ?, completed = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', 
    text ?? task.text, notes ?? task.notes, completed ?? task.completed, id);
  const updatedTask = await db.get('SELECT * FROM tasks WHERE id = ?', id);
  res.json(updatedTask);
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

app.put('/api/tasks/:id/complete', async (req, res) => {
  const { completed } = req.body;
  const id = req.params.id;
  const task = await db.get('SELECT * FROM tasks WHERE id = ?', id);
  if (!task) return res.status(404).json({ error: 'not found' });
  
  await db.run('UPDATE tasks SET completed = ?, updated_at = CURRENT_TIMESTAMP WHERE task_group_id = ?', 
    completed ? 1 : 0, task.task_group_id);
  
  const updatedTasks = await db.all('SELECT * FROM tasks WHERE task_group_id = ?', task.task_group_id);
  res.json(updatedTasks);
});

app.post('/api/tasks/:id/copy', async (req, res) => {
  try {
    console.log(`Copy request received for task ID: ${req.params.id}`);
    const { target_date } = req.body;
    const id = req.params.id;
    
    if (!target_date) {
      return res.status(400).json({ error: 'target_date is required' });
    }
    
    const task = await db.get('SELECT * FROM tasks WHERE id = ?', id);
    if (!task) {
      console.log(`Task not found for ID: ${id}`);
      return res.status(404).json({ error: 'not found' });
    }
    
    console.log(`Copying task "${task.text}" to date: ${target_date}`);
    const result: any = await db.run('INSERT INTO tasks(text, notes, date, task_group_id) VALUES(?, ?, ?, ?)', 
      task.text, task.notes, target_date, task.task_group_id);
    const newTask = await db.get('SELECT * FROM tasks WHERE id = ?', result.lastID);
    console.log(`Successfully created copy with ID: ${newTask.id}`);
    res.json(newTask);
  } catch (error) {
    console.error('Error in copy endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
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
