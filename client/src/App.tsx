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
  const [prevTasks, setPrevTasks] = useState<Task[]>([]);
  const [currentTasks, setCurrentTasks] = useState<Task[]>([]);
  const [nextTasks, setNextTasks] = useState<Task[]>([]);
  const [text, setText] = useState('');
  const [date, setDate] = useState(today);
  const [selected, setSelected] = useState<number | null>(null);
  const [details, setDetails] = useState<TaskDetail | null>(null);

  const getPrevDate = (d: string) => {
    const date = new Date(d);
    date.setDate(date.getDate() - 1);
    return date.toISOString().substring(0, 10);
  };

  const getNextDate = (d: string) => {
    const date = new Date(d);
    date.setDate(date.getDate() + 1);
    return date.toISOString().substring(0, 10);
  };

  const fetchAllTasks = async (d = date) => {
    const prevDate = getPrevDate(d);
    const nextDate = getNextDate(d);
    
    const [prevRes, currentRes, nextRes] = await Promise.all([
      fetch(`/api/tasks?date=${prevDate}`),
      fetch(`/api/tasks?date=${d}`),
      fetch(`/api/tasks?date=${nextDate}`)
    ]);
    
    const [prevData, currentData, nextData] = await Promise.all([
      prevRes.json(), currentRes.json(), nextRes.json()
    ]);
    
    setPrevTasks(prevData);
    setCurrentTasks(currentData);
    setNextTasks(nextData);
  };

  const fetchDetails = async (id: number) => {
    const res = await fetch(`/api/tasks/${id}`);
    const data = await res.json();
    setDetails(data);
  };

  useEffect(() => { fetchAllTasks(); }, [date, fetchAllTasks]);

  const addTask = async () => {
    if (!text) return;
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, date })
    });
    setText('');
    fetchAllTasks();
  };

  const deleteTask = async (id: number) => {
    await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
    if (selected === id) setSelected(null);
    fetchAllTasks();
  };

  const editTask = async (task: Task) => {
    const newText = prompt('Edit task', task.text);
    if (!newText) return;
    await fetch(`/api/tasks/${task.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: newText })
    });
    fetchAllTasks();
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
      <div className="three-day-container">
        <div className="day-column">
          <div className="day-header">{getPrevDate(date)}</div>
          <ul className="day-tasks">
            {prevTasks.map(t => (
              <li key={t.id}>
                <span onClick={() => selectTask(t.id)} className="task-text">{t.text}</span>
                <div className="task-actions">
                  <button onClick={() => editTask(t)}>Edit</button>
                  <button onClick={() => deleteTask(t.id)}>Delete</button>
                </div>
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
        
        <div className="day-column focused">
          <div className="day-header">{date} (Today)</div>
          <div className="new-task">
            <input value={text} onChange={e => setText(e.target.value)} placeholder="New task" />
            <button onClick={addTask}>Add</button>
          </div>
          <ul className="day-tasks">
            {currentTasks.map(t => (
              <li key={t.id}>
                <span onClick={() => selectTask(t.id)} className="task-text">{t.text}</span>
                <div className="task-actions">
                  <button onClick={() => editTask(t)}>Edit</button>
                  <button onClick={() => deleteTask(t.id)}>Delete</button>
                </div>
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
        
        <div className="day-column">
          <div className="day-header">{getNextDate(date)}</div>
          <ul className="day-tasks">
            {nextTasks.map(t => (
              <li key={t.id}>
                <span onClick={() => selectTask(t.id)} className="task-text">{t.text}</span>
                <div className="task-actions">
                  <button onClick={() => editTask(t)}>Edit</button>
                  <button onClick={() => deleteTask(t.id)}>Delete</button>
                </div>
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
