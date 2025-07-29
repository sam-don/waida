import { useEffect, useState } from 'react';
import './App.css';

interface Task {
  id: number;
  text: string;
  notes: string;
}
interface TaskDetail extends Task {
  subtasks: { id: number; text: string }[];
}

function App() {
  const today = new Date().toISOString().substring(0,10);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [prevTasks, setPrevTasks] = useState<Task[]>([]);
  const [nextTasks, setNextTasks] = useState<Task[]>([]);
  const [text, setText] = useState('');
  const [date, setDate] = useState(today);
  const [selected, setSelected] = useState<number | null>(null);
  const [details, setDetails] = useState<TaskDetail | null>(null);

  const fetchTasks = async (d: string) => {
    const res = await fetch(`/api/tasks?date=${d}`);
    return res.json();
  };

  const loadTasks = async (d = date) => {
    const current = await fetchTasks(d);
    setTasks(current);
    const prev = new Date(d);
    prev.setDate(prev.getDate() - 1);
    setPrevTasks(await fetchTasks(prev.toISOString().substring(0, 10)));
    const next = new Date(d);
    next.setDate(next.getDate() + 1);
    setNextTasks(await fetchTasks(next.toISOString().substring(0, 10)));
  };

  const fetchDetails = async (id: number) => {
    const res = await fetch(`/api/tasks/${id}`);
    const data = await res.json();
    setDetails(data);
  };

  useEffect(() => { loadTasks(); }, [date]);

  const addTask = async () => {
    if (!text) return;
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, date })
    });
    setText('');
    loadTasks();
  };

  const deleteTask = async (id: number) => {
    await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
    if (selected === id) setSelected(null);
    loadTasks();
  };

  const editTask = async (task: Task) => {
    const newText = prompt('Edit task', task.text);
    if (!newText) return;
    await fetch(`/api/tasks/${task.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: newText })
    });
    loadTasks();
  };

  const prevDay = () => {
    const d = new Date(date);
    d.setDate(d.getDate() - 1);
    setDate(d.toISOString().substring(0,10));
  };
  const nextDay = () => {
    const d = new Date(date);
    d.setDate(d.getDate() + 1);
    setDate(d.toISOString().substring(0,10));
  };

  const prevDateStr = () => {
    const d = new Date(date);
    d.setDate(d.getDate() - 1);
    return d.toISOString().substring(0,10);
  };
  const nextDateStr = () => {
    const d = new Date(date);
    d.setDate(d.getDate() + 1);
    return d.toISOString().substring(0,10);
  };

  const selectTask = (id: number) => {
    if (selected === id) {
      setSelected(null);
      setDetails(null);
    } else {
      setSelected(id);
      fetchDetails(id);
    }
  };

  return (
    <div className="App">
      <h1>What Am I Doing Again?</h1>
      <div className="toolbar">
        <button onClick={prevDay}>Previous</button>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} />
        <button onClick={nextDay}>Next</button>
      </div>
      <div className="days">
        <div className="day">
          <h3>{prevDateStr()}</h3>
          <ul className="tasks">
            {prevTasks.map(t => (
              <li key={t.id}>
                <span onClick={() => selectTask(t.id)} className="task-text">{t.text}</span>
                <button onClick={() => editTask(t)}>Edit</button>
                <button onClick={() => deleteTask(t.id)}>Delete</button>
                {selected === t.id && details && (
                  <div className="details">
                    <p>{details.notes}</p>
                    {details.subtasks.length > 0 && (
                      <ul>
                        {details.subtasks.map(s => <li key={s.id}>{s.text}</li>)}
                      </ul>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
        <div className="day focus">
          <h3>{date}</h3>
          <div className="new-task">
            <input value={text} onChange={e => setText(e.target.value)} placeholder="New task" />
            <button onClick={addTask}>Add</button>
          </div>
          <ul className="tasks">
            {tasks.map(t => (
              <li key={t.id}>
                <span onClick={() => selectTask(t.id)} className="task-text">{t.text}</span>
                <button onClick={() => editTask(t)}>Edit</button>
                <button onClick={() => deleteTask(t.id)}>Delete</button>
                {selected === t.id && details && (
                  <div className="details">
                    <p>{details.notes}</p>
                    {details.subtasks.length > 0 && (
                      <ul>
                        {details.subtasks.map(s => <li key={s.id}>{s.text}</li>)}
                      </ul>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
        <div className="day">
          <h3>{nextDateStr()}</h3>
          <ul className="tasks">
            {nextTasks.map(t => (
              <li key={t.id}>
                <span onClick={() => selectTask(t.id)} className="task-text">{t.text}</span>
                <button onClick={() => editTask(t)}>Edit</button>
                <button onClick={() => deleteTask(t.id)}>Delete</button>
                {selected === t.id && details && (
                  <div className="details">
                    <p>{details.notes}</p>
                    {details.subtasks.length > 0 && (
                      <ul>
                        {details.subtasks.map(s => <li key={s.id}>{s.text}</li>)}
                      </ul>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default App;
