import { Database } from "sqlite";
import path from "path";
import express from 'express';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

const app = express();
app.use(express.json());

let db: Database;
(async () => {
  // open database
  const database = await open({
    filename: './database.db',
    driver: sqlite3.Database
  });
  db = database;
  await db.run('CREATE TABLE IF NOT EXISTS tasks(id INTEGER PRIMARY KEY AUTOINCREMENT, text TEXT)');
})();

app.get('/api/tasks', async (_req, res) => {
  const tasks = await db.all('SELECT * FROM tasks');
  res.json(tasks);
});

app.post('/api/tasks', async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'text required' });
  const result = await db.run('INSERT INTO tasks(text) VALUES(?)', text) as any;
  res.json({ id: result.lastID, text });
});

app.use(express.static(path.join(__dirname, "../../client/dist")));
app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "../../client/dist/index.html"));
});
const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
