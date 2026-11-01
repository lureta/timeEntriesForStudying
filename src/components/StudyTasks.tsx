import { useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";

export type Task = { id: string; title: string; due: string; done: boolean };
const todayKey = () => { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`; };
export default function StudyTasks({ data, setData }: { data: { tasks: Task[] }; setData: React.Dispatch<React.SetStateAction<{ tasks: Task[] }>> }) {
  const [day, setDay] = useState(todayKey);
  const [taskTitle, setTaskTitle] = useState("");
  const [due, setDue] = useState("");
  const [editingTask, setEditingTask] = useState<string | null>(null);
  useEffect(() => {
    const update = () => setDay(todayKey());
    const interval = window.setInterval(update, 30_000);
    window.addEventListener("focus", update);
    return () => { window.clearInterval(interval); window.removeEventListener("focus", update); };
  }, []);
  const clearTask = () => { setTaskTitle(""); setDue(""); setEditingTask(null); };
  return <div className="study-tasks-layout">
    <section className="panel">
      <div className="panel-heading"><div><h2>To-do list</h2><p>{data.tasks.filter((task) => task.done).length} of {data.tasks.length} complete</p></div></div>
      <form className="study-task-form" onSubmit={(event) => {
        event.preventDefault(); const title = taskTitle.trim(); if (!title) return;
        setData((current) => ({ ...current, tasks: editingTask ? current.tasks.map((task) => task.id === editingTask ? { ...task, title, due } : task) : [...current.tasks, { id: crypto.randomUUID(), title, due, done: false }] })); clearTask();
      }}>
        <label>Task<input required maxLength={200} placeholder="What do you want to get done?" value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} /></label>
        <label>Due date (optional)<input type="date" value={due} onChange={(event) => setDue(event.target.value)} /></label>
        <div className="study-task-actions"><button type="submit" className="primary small"><Plus size={14} />{editingTask ? "Save task" : "Add task"}</button>{editingTask && <button type="button" className="secondary small" onClick={clearTask}>Cancel</button>}</div>
      </form>
      {!data.tasks.length && <p className="empty">Start with one small task.</p>}
      {data.tasks.map((task) => <div className="study-task-row" key={task.id}>
        <label className={task.done ? "study-task-done" : ""}><input type="checkbox" checked={task.done} onChange={() => setData((current) => ({ ...current, tasks: current.tasks.map((item) => item.id === task.id ? { ...item, done: !item.done } : item) }))} /><span>{task.title}{task.due && <small>{!task.done && task.due < day ? "Overdue · " : "Due · "}{new Date(`${task.due}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</small>}</span></label>
        <button className="icon-button" aria-label={`Edit ${task.title}`} onClick={() => { setEditingTask(task.id); setTaskTitle(task.title); setDue(task.due); }}><Pencil size={14} /></button>
        <button className="icon-button" aria-label={`Delete ${task.title}`} onClick={() => { setData((current) => ({ ...current, tasks: current.tasks.filter((item) => item.id !== task.id) })); if (editingTask === task.id) clearTask(); }}><Trash2 size={14} /></button>
      </div>)}
    </section>
    <p className="helper">Tasks sync to your account.</p>
  </div>;
}
