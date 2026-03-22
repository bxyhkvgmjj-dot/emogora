"use client";

import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Calendar,
  Check,
  Plus,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

type Task = {
  id: string;
  title: string;
  notes: string | null;
  due_date: string | null;
  created_at: string;
  done: boolean;
};

export default function TaskClients({
  initialTasks,
  today,
}: {
  initialTasks: Task[];
  today: string;
}) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);

  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [due, setDue] = useState<string>("");
  const [notes, setNotes] = useState("");

  const [busyId, setBusyId] = useState<string | null>(null);
  const busySetRef = useRef(new Set<string>());
  const [err, setErr] = useState<string | null>(null);

  const [pulseId, setPulseId] = useState<string | null>(null);

  // ✅ NEW
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const completed = useMemo(() => tasks.filter((t) => t.done).length, [tasks]);

  function openCreate() {
    setErr(null);
    setTitle("");
    setNotes("");
    setDue("");
    setCreating(true);
  }

  async function createTask() {
    setErr(null);
    const trimmed = title.trim();
    if (!trimmed) return setErr("Title required.");

    try {
      const res = await fetch("/m/api/tasks/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: trimmed,
          notes: notes.trim() || null,
          due_date: due || null,
        }),
      });

      const j = await res.json().catch(() => ({} as any));
      if (!res.ok) {
        return setErr(`${res.status} — ${j?.error ?? "Could not create task."}`);
      }

      const created: Task = {
        id: j?.task?.id,
        title: j?.task?.title ?? trimmed,
        notes: j?.task?.notes ?? null,
        due_date: j?.task?.due_date ?? null,
        created_at: j?.task?.created_at ?? new Date().toISOString(),
        done: false,
      };

      setTasks((prev) => [created, ...prev]);
      setCreating(false);
    } catch {
      setErr("Network error. Try again.");
    }
  }

  async function toggleTask(taskId: string) {
    if (busySetRef.current.has(taskId)) return;

    busySetRef.current.add(taskId);
    setBusyId(taskId);

    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, done: !t.done } : t))
    );

    try {
      await fetch("/m/api/tasks/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_id: taskId, log_date: today }),
      });

      setPulseId(taskId);
      setTimeout(() => setPulseId(null), 500);
    } catch {
      setErr("Error updating task.");
    } finally {
      busySetRef.current.delete(taskId);
      setBusyId(null);
    }
  }

  // ✅ DELETE FUNCTION
  async function deleteTask() {
    if (!deleteTarget) return;

    setDeletingId(deleteTarget.id);

    try {
      const res = await fetch("/m/api/tasks/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_id: deleteTarget.id }),
      });

      if (!res.ok) throw new Error();

      setTasks((prev) => prev.filter((t) => t.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch {
      setErr("Could not delete task.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="w-full">
      <div className="flex items-start justify-between">
        <h1 className="text-3xl font-semibold">Tasks</h1>

        <button onClick={openCreate} className="rounded-xl bg-white px-4 py-2 shadow">
          + Add task
        </button>
      </div>

      <div className="mt-6 space-y-3">
        <AnimatePresence>
          {tasks.map((t) => {
            const isBusy = busyId === t.id;

            return (
              <motion.div
                key={t.id}
                layout
                className="group relative rounded-3xl bg-white/70 p-4 shadow"
              >
                {/* CLICK AREA */}
                <button
                  onClick={() => toggleTask(t.id)}
                  className="w-full text-left"
                >
                  <div className="flex justify-between">
                    <div>
                      <div className="font-semibold">{t.title}</div>
                      {t.due_date && (
                        <div className="text-xs text-zinc-500">
                          Due {t.due_date}
                        </div>
                      )}
                    </div>

                    <div className="text-xs">
                      {isBusy ? "..." : t.done ? "Done" : "Pending"}
                    </div>
                  </div>
                </button>

                {/* ✅ DELETE BUTTON */}
                <button
                  onClick={() => setDeleteTarget(t)}
                  className="absolute right-3 top-3 hidden h-8 w-8 items-center justify-center rounded-xl bg-white shadow group-hover:flex hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* ✅ DELETE MODAL */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/30" />

            <div className="relative rounded-2xl bg-white p-6 shadow-xl">
              <div className="font-semibold">Delete task?</div>
              <div className="text-sm text-zinc-600 mt-1">
                {deleteTarget.title}
              </div>

              <div className="mt-4 flex gap-2">
                <button onClick={() => setDeleteTarget(null)}>Cancel</button>
                <button onClick={deleteTask} className="text-red-600">
                  Delete
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {err && <div className="mt-4 text-red-500">{err}</div>}
    </div>
  );
}