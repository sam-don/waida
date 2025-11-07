import { useCallback, useEffect, useState } from 'react';
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

interface RawTask extends Omit<Task, 'completed'> {
  completed: boolean | number;
}

interface TaskDetail extends Task {
  subtasks: { id: number; text: string }[];
}

interface TaskColumnProps {
  title: string;
  tasks: Task[];
  isFocused?: boolean;
  selectedTaskId: number | null;
  details: TaskDetail | null;
  onToggleComplete(task: Task): void | Promise<void>;
  onSelect(taskId: number): void;
  onEdit(task: Task): void | Promise<void>;
  onDelete(taskId: number): void | Promise<void>;
  onCopy(task: Task): void | Promise<void>;
}

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');
const apiUrl = (path: string) => `${API_BASE}${path}`;

function formatDate(dateString: string) {
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'long', day: 'numeric' };
  return new Intl.DateTimeFormat('en-US', options).format(date);
}

function normalizeTask(raw: RawTask): Task {
  return { ...raw, completed: Boolean(raw.completed) };
}

function TaskColumn({
  title,
  tasks,
  isFocused,
  selectedTaskId,
  details,
  onToggleComplete,
  onSelect,
  onEdit,
  onDelete,
  onCopy
}: TaskColumnProps) {
  return (
    <div className={`day-column${isFocused ? ' focused' : ''}`}>
      <div className="day-header">{title}</div>
      <ul className="day-tasks">
        {tasks.map(task => {
          const showDetails = selectedTaskId === task.id && details?.id === task.id;
          return (
            <li key={task.id} className={task.completed ? 'completed' : ''}>
              <div className="task-content">
                <input
                  type="checkbox"
                  checked={task.completed}
                  onChange={() => onToggleComplete(task)}
                  className="task-checkbox"
                />
                <span onClick={() => onSelect(task.id)} className="task-text">
                  {task.text}
                </span>
              </div>
              <div className="task-actions">
                <button onClick={() => onEdit(task)}>Edit</button>
                <button onClick={() => onDelete(task.id)}>Delete</button>
                <button onClick={() => onCopy(task)}>Copy →</button>
              </div>
              {showDetails && details && (
                <div className="details">
                  {details.notes.trim() !== '' && <p>{details.notes}</p>}
                  {details.subtasks.length > 0 && (
                    <ul>
                      {details.subtasks.map(subtask => (
                        <li key={subtask.id}>{subtask.text}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function App() {
  const today = new Date().toISOString().substring(0, 10);
  const [prevTasks, setPrevTasks] = useState<Task[]>([]);
  const [currentTasks, setCurrentTasks] = useState<Task[]>([]);
  const [nextTasks, setNextTasks] = useState<Task[]>([]);
  const [text, setText] = useState('');
  const [date, setDate] = useState(today);
  const [selected, setSelected] = useState<number | null>(null);
  const [details, setDetails] = useState<TaskDetail | null>(null);

  const getPrevDate = (d: string) => {
    const dateObj = new Date(d);
    dateObj.setDate(dateObj.getDate() - 1);
    return dateObj.toISOString().substring(0, 10);
  };

  const getNextDate = (d: string) => {
    const dateObj = new Date(d);
    dateObj.setDate(dateObj.getDate() + 1);
    return dateObj.toISOString().substring(0, 10);
  };

  const fetchTasksForDate = useCallback(async (targetDate: string) => {
    const response = await fetch(apiUrl(`/api/tasks?date=${targetDate}`));
    if (!response.ok) {
      throw new Error(`Failed to fetch tasks for ${targetDate}`);
    }
    const data: RawTask[] = await response.json();
    return data.map(normalizeTask);
  }, []);

  const fetchAllTasks = useCallback(
    async (targetDate = date) => {
      try {
        const [prev, current, next] = await Promise.all([
          fetchTasksForDate(getPrevDate(targetDate)),
          fetchTasksForDate(targetDate),
          fetchTasksForDate(getNextDate(targetDate))
        ]);
        setPrevTasks(prev);
        setCurrentTasks(current);
        setNextTasks(next);
      } catch (error) {
        console.error('Failed to load tasks:', error);
      }
    },
    [date, fetchTasksForDate]
  );

  const fetchDetails = useCallback(async (id: number) => {
    try {
      const response = await fetch(apiUrl(`/api/tasks/${id}`));
      if (!response.ok) {
        throw new Error(`Failed to fetch details for task ${id}`);
      }
      const data: (RawTask & { subtasks: { id: number; text: string }[] }) = await response.json();
      const { subtasks, ...rest } = data;
      setDetails({ ...normalizeTask(rest), subtasks });
    } catch (error) {
      console.error(error);
      setDetails(null);
      alert('Failed to load task details. Please try again.');
    }
  }, []);

  useEffect(() => {
    fetchAllTasks();
  }, [fetchAllTasks]);

  const addTask = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const response = await fetch(apiUrl('/api/tasks'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: trimmed, date })
    });
    if (!response.ok) {
      alert('Failed to add task. Please try again.');
      return;
    }
    setText('');
    fetchAllTasks();
  };

  const deleteTask = async (id: number) => {
    const response = await fetch(apiUrl(`/api/tasks/${id}`), { method: 'DELETE' });
    if (!response.ok) {
      alert('Failed to delete task. Please try again.');
      return;
    }
    if (selected === id) {
      setSelected(null);
      setDetails(null);
    }
    fetchAllTasks();
  };

  const editTask = async (task: Task) => {
    const newText = prompt('Edit task', task.text)?.trim();
    if (!newText) return;
    const response = await fetch(apiUrl(`/api/tasks/${task.id}`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: newText })
    });
    if (!response.ok) {
      alert('Failed to update task. Please try again.');
      return;
    }
    if (selected === task.id) {
      fetchDetails(task.id);
    }
    fetchAllTasks();
  };

  const prevDay = () => {
    const prev = getPrevDate(date);
    setDate(prev);
  };

  const nextDay = () => {
    const next = getNextDate(date);
    setDate(next);
  };

  const selectTask = (id: number) => {
    if (selected === id) {
      setSelected(null);
      setDetails(null);
      return;
    }
    setSelected(id);
    setDetails(null);
    fetchDetails(id);
  };

  const toggleComplete = async (task: Task) => {
    try {
      const response = await fetch(apiUrl(`/api/tasks/${task.id}/complete`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !task.completed })
      });
      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        const message = typeof errorBody.error === 'string' ? errorBody.error : 'Failed to update task status.';
        alert(message);
        return;
      }
      fetchAllTasks();
      if (selected === task.id) {
        fetchDetails(task.id);
      }
    } catch (error) {
      console.error('Failed to toggle task completion:', error);
      alert('Failed to update task status. Please try again.');
    }
  };

  const copyToNextDay = async (task: Task) => {
    try {
      const nextDate = getNextDate(task.date);
      const response = await fetch(apiUrl(`/api/tasks/${task.id}/copy`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_date: nextDate })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const message = typeof errorData.error === 'string' ? errorData.error : 'Unknown error';
        alert(`Failed to copy task: ${message}`);
        return;
      }

      await response.json();
      fetchAllTasks();
    } catch (error) {
      console.error('Error copying task:', error);
      alert('Failed to copy task. Please try again.');
    }
  };

  const columns = [
    {
      key: 'prev',
      title: formatDate(getPrevDate(date)),
      tasks: prevTasks,
      isFocused: false
    },
    {
      key: 'current',
      title: formatDate(date),
      tasks: currentTasks,
      isFocused: true
    },
    {
      key: 'next',
      title: formatDate(getNextDate(date)),
      tasks: nextTasks,
      isFocused: false
    }
  ];

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
        {columns.map(column => (
          <TaskColumn
            key={column.key}
            title={column.title}
            tasks={column.tasks}
            isFocused={column.isFocused}
            selectedTaskId={selected}
            details={details}
            onToggleComplete={toggleComplete}
            onSelect={selectTask}
            onEdit={editTask}
            onDelete={deleteTask}
            onCopy={copyToNextDay}
          />
        ))}
      </div>
    </div>
  );
}

export default App;
