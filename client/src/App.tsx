import { useEffect, useState, useCallback } from 'react';
import './App.css';

interface Task {
  id: number;
  text: string;
  notes: string;
  date: string;
  created_at: string;
  updated_at: string;
  completed: boolean;
  task_group_id?: string;
}

interface TaskDetail extends Task {
  subtasks: { id: number; text: string }[];
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'long', day: 'numeric' };
  return new Intl.DateTimeFormat('en-US', options).format(date);
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

  const fetchAllTasks = useCallback(async (d = date) => {
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
    
    setPrevTasks(prevData.map((t: any) => ({ ...t, completed: !!t.completed })));
    setCurrentTasks(currentData.map((t: any) => ({ ...t, completed: !!t.completed })));
    setNextTasks(nextData.map((t: any) => ({ ...t, completed: !!t.completed })));
  }, [date]);

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

  const toggleComplete = async (task: Task) => {
    await fetch(`/api/tasks/${task.id}/complete`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: !task.completed })
    });
    fetchAllTasks();
  };

  const copyToNextDay = async (task: Task) => {
    try {
      const nextDate = getNextDate(task.date);
      console.log(`Copying task ${task.id} to ${nextDate}`);
      const response = await fetch(`/api/tasks/${task.id}/copy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_date: nextDate })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Copy failed:', response.status, errorData);
        alert(`Failed to copy task: ${errorData.error || 'Unknown error'}`);
        return;
      }
      
      const newTask = await response.json();
      console.log('Task copied successfully:', newTask);
      fetchAllTasks();
    } catch (error) {
      console.error('Error copying task:', error);
      alert('Failed to copy task. Please try again.');
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
      <div className="new-task">
        <input value={text} onChange={e => setText(e.target.value)} placeholder="New task" />
        <button onClick={addTask}>Add</button>
      </div>
      <div className="three-day-container">
        <div className="day-column">
          <div className="day-header">{formatDate(getPrevDate(date))}</div>
          <ul className="day-tasks">
            {prevTasks.map(t => (
              <li key={t.id} className={t.completed ? 'completed' : ''}>
                <div className="task-content">
                  <input 
                    type="checkbox" 
                    checked={t.completed} 
                    onChange={() => toggleComplete(t)}
                    className="task-checkbox"
                  />
                  <span onClick={() => selectTask(t.id)} className="task-text">{t.text}</span>
                </div>
                <div className="task-actions">
                  <button onClick={() => editTask(t)}>Edit</button>
                  <button onClick={() => deleteTask(t.id)}>Delete</button>
                  <button onClick={() => copyToNextDay(t)}>Copy →</button>
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
          <div className="day-header">{formatDate(date)}</div>
          <ul className="day-tasks">
            {currentTasks.map(t => (
              <li key={t.id} className={t.completed ? 'completed' : ''}>
                <div className="task-content">
                  <input 
                    type="checkbox" 
                    checked={t.completed} 
                    onChange={() => toggleComplete(t)}
                    className="task-checkbox"
                  />
                  <span onClick={() => selectTask(t.id)} className="task-text">{t.text}</span>
                </div>
                <div className="task-actions">
                  <button onClick={() => editTask(t)}>Edit</button>
                  <button onClick={() => deleteTask(t.id)}>Delete</button>
                  <button onClick={() => copyToNextDay(t)}>Copy →</button>
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
          <div className="day-header">{formatDate(getNextDate(date))}</div>
          <ul className="day-tasks">
            {nextTasks.map(t => (
              <li key={t.id} className={t.completed ? 'completed' : ''}>
                <div className="task-content">
                  <input 
                    type="checkbox" 
                    checked={t.completed} 
                    onChange={() => toggleComplete(t)}
                    className="task-checkbox"
                  />
                  <span onClick={() => selectTask(t.id)} className="task-text">{t.text}</span>
                </div>
                <div className="task-actions">
                  <button onClick={() => editTask(t)}>Edit</button>
                  <button onClick={() => deleteTask(t.id)}>Delete</button>
                  <button onClick={() => copyToNextDay(t)}>Copy →</button>
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
