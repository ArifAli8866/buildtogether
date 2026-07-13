"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Task, TaskStatus, TeamMember, ProgressUpdate } from "@/lib/types";
import { Plus } from "lucide-react";

const COLUMNS: { key: TaskStatus; label: string; accent: string }[] = [
  { key: "todo", label: "To do", accent: "border-mist-400/40" },
  { key: "in_progress", label: "In progress", accent: "border-signal-amber/50" },
  { key: "done", label: "Done", accent: "border-signal-green/50" },
];

export default function TaskBoard({
  projectId,
  members,
}: {
  projectId: string;
  members: TeamMember[];
}) {
  const supabase = createClient();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [updates, setUpdates] = useState<ProgressUpdate[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [updateText, setUpdateText] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [{ data: taskData }, { data: updateData }] = await Promise.all([
      supabase
        .from("tasks")
        .select("*, assignee:profiles(*)")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true }),
      supabase
        .from("progress_updates")
        .select("*, author:profiles(*)")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);
    setTasks((taskData as Task[]) ?? []);
    setUpdates((updateData as ProgressUpdate[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    const title = newTaskTitle;
    setNewTaskTitle("");
    await supabase.from("tasks").insert({ project_id: projectId, title });
    load();
  };

  const updateTaskStatus = async (taskId: string, status: TaskStatus) => {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status } : t)));
    await supabase.from("tasks").update({ status }).eq("id", taskId);
  };

  const assignTask = async (taskId: string, assigneeId: string) => {
    await supabase
      .from("tasks")
      .update({ assignee_id: assigneeId || null })
      .eq("id", taskId);
    load();
  };

  const postUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!updateText.trim()) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const text = updateText;
    setUpdateText("");
    await supabase.from("progress_updates").insert({
      project_id: projectId,
      user_id: user.id,
      content: text,
    });
    load();
  };

  if (loading) return <p className="text-mist-400 text-sm">Loading workspace…</p>;

  return (
    <div className="flex flex-col gap-8">
      {/* Task board */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-bold text-mist-100">Tasks</h3>
        </div>
        <form onSubmit={addTask} className="flex gap-2 mb-4">
          <input
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="Add a task, e.g. 'Wire up auth callback'"
            className="flex-1 bg-ink-700 border border-ink-600 rounded-lg px-3 py-2 text-sm text-mist-100 placeholder:text-mist-400 focus:border-signal-violet outline-none"
          />
          <button
            type="submit"
            className="bg-signal-violet hover:bg-signal-violetSoft text-white rounded-lg px-3 flex items-center gap-1 text-sm transition-colors"
          >
            <Plus size={16} /> Add
          </button>
        </form>

        <div className="grid md:grid-cols-3 gap-4">
          {COLUMNS.map((col) => (
            <div key={col.key} className={`border-t-2 ${col.accent} bg-ink-800/50 rounded-b-xl p-3`}>
              <p className="text-xs font-mono uppercase tracking-wide text-mist-400 mb-3">
                {col.label} · {tasks.filter((t) => t.status === col.key).length}
              </p>
              <div className="flex flex-col gap-2">
                {tasks
                  .filter((t) => t.status === col.key)
                  .map((task) => (
                    <div key={task.id} className="bg-ink-700/60 border border-ink-600 rounded-lg p-3">
                      <p className="text-sm text-mist-100">{task.title}</p>
                      <div className="flex items-center justify-between mt-3 gap-2">
                        <select
                          value={task.assignee_id ?? ""}
                          onChange={(e) => assignTask(task.id, e.target.value)}
                          className="text-xs bg-ink-800 border border-ink-600 rounded-md px-1.5 py-1 text-mist-300 max-w-[45%]"
                        >
                          <option value="">Unassigned</option>
                          {members.map((m) => (
                            <option key={m.user_id} value={m.user_id}>
                              {m.profile?.username}
                            </option>
                          ))}
                        </select>
                        <select
                          value={task.status}
                          onChange={(e) => updateTaskStatus(task.id, e.target.value as TaskStatus)}
                          className="text-xs bg-ink-800 border border-ink-600 rounded-md px-1.5 py-1 text-mist-300"
                        >
                          {COLUMNS.map((c) => (
                            <option key={c.key} value={c.key}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                {tasks.filter((t) => t.status === col.key).length === 0 && (
                  <p className="text-xs text-mist-400">Nothing here.</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Progress feed */}
      <div>
        <h3 className="font-display font-bold text-mist-100 mb-3">Progress updates</h3>
        <form onSubmit={postUpdate} className="flex gap-2 mb-4">
          <input
            value={updateText}
            onChange={(e) => setUpdateText(e.target.value)}
            placeholder="Share what you shipped today…"
            className="flex-1 bg-ink-700 border border-ink-600 rounded-lg px-3 py-2 text-sm text-mist-100 placeholder:text-mist-400 focus:border-signal-violet outline-none"
          />
          <button
            type="submit"
            className="bg-signal-violet hover:bg-signal-violetSoft text-white rounded-lg px-3 flex items-center gap-1 text-sm transition-colors"
          >
            <Plus size={16} /> Post
          </button>
        </form>
        <div className="flex flex-col gap-3">
          {updates.length === 0 && <p className="text-mist-400 text-sm">No updates yet.</p>}
          {updates.map((u) => (
            <div key={u.id} className="border border-ink-700 rounded-xl p-3.5">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-medium text-mist-100">{u.author?.username}</span>
                <span className="text-[11px] text-mist-400">
                  {new Date(u.created_at).toLocaleString()}
                </span>
              </div>
              <p className="text-sm text-mist-200 mt-1 whitespace-pre-wrap">{u.content}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
