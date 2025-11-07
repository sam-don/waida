import { Database } from 'sqlite';
import path from 'path';
import express from 'express';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
const app = express();
app.use(express.json());

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Vary', 'Origin');
  } else {
    res.header('Access-Control-Allow-Origin', '*');
  }
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header(
    'Access-Control-Allow-Headers',
    req.header('Access-Control-Request-Headers') || 'Content-Type, Authorization'
  );
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

let db: Database;

const initializeDatabase = async () => {
  try {
    console.log('Initializing database...');
    const dbFile = process.env.DB_PATH || path.join(process.cwd(), 'database.db');
    const database = await open({
      filename: dbFile,
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

    // Lightweight migration: ensure required columns exist on older databases
    try {
      const columns: any[] = await db.all("PRAGMA table_info(tasks)");
      const colNames = new Set(columns.map((c: any) => c.name));

      if (!colNames.has('completed')) {
        console.log("Adding missing 'completed' column to tasks table...");
        await db.exec("ALTER TABLE tasks ADD COLUMN completed INTEGER DEFAULT 0");
        await db.exec("UPDATE tasks SET completed = 0 WHERE completed IS NULL");
        console.log("'completed' column added.");
      }

      if (!colNames.has('task_group_id')) {
        console.log("Adding missing 'task_group_id' column to tasks table...");
        await db.exec("ALTER TABLE tasks ADD COLUMN task_group_id TEXT");
        console.log("'task_group_id' column added.");
      }

      if (!colNames.has('updated_at')) {
        console.log("Adding missing 'updated_at' column to tasks table...");
        // Note: SQLite can't add a column with a non-constant default, so add without default then backfill
        await db.exec("ALTER TABLE tasks ADD COLUMN updated_at TEXT");
        await db.exec("UPDATE tasks SET updated_at = CURRENT_TIMESTAMP WHERE updated_at IS NULL");
        console.log("'updated_at' column added.");
      }
    } catch (e) {
      console.warn('Non-fatal: failed to run migration checks for tasks table:', e);
    }

    await db.exec(`CREATE TABLE IF NOT EXISTS subtasks(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER NOT NULL,
        text TEXT NOT NULL,
        FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE
      )`);
    console.log('Database initialized successfully');
    return database;
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
};

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
  const groupId = task_group_id || `group_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  const result: any = await db.run('INSERT INTO tasks(text, notes, date, task_group_id) VALUES(?, ?, ?, ?)', text, notes, date, groupId);
  const task = await db.get('SELECT * FROM tasks WHERE id = ?', result.lastID);
  res.json(task);
});

app.put('/api/tasks/:id', async (req, res) => {
  const { text, notes, completed } = req.body;
  const id = req.params.id;
  const task = await db.get('SELECT * FROM tasks WHERE id = ?', id);
  if (!task) return res.status(404).json({ error: 'not found' });
  const updatedCompleted =
    completed === undefined ? task.completed : completed ? 1 : 0;
  await db.run(
    'UPDATE tasks SET text = ?, notes = ?, completed = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    text ?? task.text,
    notes ?? task.notes,
    updatedCompleted,
    id
  );
  const updatedTask = await db.get('SELECT * FROM tasks WHERE id = ?', id);
  res.json(updatedTask);
});

app.delete('/api/tasks/:id', async (req, res) => {
  const id = req.params.id;
  await db.run('DELETE FROM tasks WHERE id = ?', id);
  res.json({ ok: true });
});

app.get('/api/tasks/:id/subtasks', async (req, res) => {
  const id = req.params.id;
  const task = await db.get('SELECT id FROM tasks WHERE id = ?', id);
  if (!task) return res.status(404).json({ error: 'not found' });
  const subtasks = await db.all('SELECT * FROM subtasks WHERE task_id = ?', id);
  res.json(subtasks);
});

app.put('/api/tasks/:id/complete', async (req, res) => {
  try {
    const { completed } = req.body;
    const id = req.params.id;
    const task = await db.get('SELECT * FROM tasks WHERE id = ?', id);
    if (!task) return res.status(404).json({ error: 'not found' });

  const completedInt = completed ? 1 : 0;

    if (task.task_group_id) {
      await db.run(
        'UPDATE tasks SET completed = ?, updated_at = CURRENT_TIMESTAMP WHERE task_group_id = ?',
        completedInt,
        task.task_group_id
      );
      const updatedTasks = await db.all('SELECT * FROM tasks WHERE task_group_id = ?', task.task_group_id);
      return res.json(updatedTasks);
    } else {
      await db.run(
        'UPDATE tasks SET completed = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        completedInt,
        id
      );
      const updatedTask = await db.get('SELECT * FROM tasks WHERE id = ?', id);
      return res.json([updatedTask]);
    }
  } catch (err) {
    console.error('Failed to update completed status:', err);
    return res.status(500).json({ error: 'Failed to update completed status' });
  }
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

    // Ensure the source task has a task_group_id so copies are grouped
    let groupId = task.task_group_id as string | null;
    if (!groupId) {
      groupId = `group_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
      console.log(`Assigning new task_group_id ${groupId} to source task ${id}`);
      await db.run('UPDATE tasks SET task_group_id = ? WHERE id = ?', groupId, id);
    }

    const existingCopy = await db.get(
      'SELECT id FROM tasks WHERE task_group_id = ? AND date = ?',
      groupId, target_date
    );
    if (existingCopy) {
      console.log(`Task already copied to ${target_date}`);
      return res.status(409).json({ error: 'Task has already been copied to this date' });
    }

    console.log(`Copying task "${task.text}" to date: ${target_date}`);
    const result: any = await db.run(
      'INSERT INTO tasks(text, notes, date, task_group_id) VALUES(?, ?, ?, ?)',
      task.text, task.notes, target_date, groupId
    );
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
  const id = req.params.id;
  const task = await db.get('SELECT id FROM tasks WHERE id = ?', id);
  if (!task) return res.status(404).json({ error: 'not found' });
  const result: any = await db.run('INSERT INTO subtasks(task_id, text) VALUES(?, ?)', id, text);
  res.json({ id: result.lastID, task_id: id, text });
});

app.use(express.static(path.join(__dirname, '../../client/dist')));

app.get(/^(?!\/api).*/, (_req, res) => {
  res.sendFile(path.join(__dirname, '../../client/dist/index.html'));
});

const port = process.env.PORT || 3001;

initializeDatabase()
  .then(() => {
    app.listen(port, () => {
      console.log(`Server listening on port ${port}`);
    });
  })
  .catch(error => {
    console.error('Server startup aborted due to initialization failure:', error);
    process.exit(1);
  });

