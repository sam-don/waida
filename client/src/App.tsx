import { useEffect, useState } from 'react';
import './App.css';

interface Task {
  id: number;
  text: string;
}

function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [text, setText] = useState('');

  const fetchTasks = async () => {
    const res = await fetch('/api/tasks');
    const data = await res.json();
    setTasks(data);
  };

  useEffect(() => { fetchTasks(); }, []);

  const addTask = async () => {
    if (!text) return;
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    setText('');
    fetchTasks();
  };

  return (
    <div className="App">
      <h1>What Am I Doing Again?</h1>
      <div>
        <input value={text} onChange={e => setText(e.target.value)} placeholder="New task" />
        <button onClick={addTask}>Add</button>
      </div>
      <ul>
        {tasks.map(t => (<li key={t.id}>{t.text}</li>))}
      </ul>
    </div>
  );
}

export default App;
