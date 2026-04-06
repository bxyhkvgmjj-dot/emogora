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

  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const completed = useMemo(() => tasks.filter((t) => t.done).length, [tasks]);

  const overdueCount = useMemo(() => {
    return tasks.filter((t) => !t.done && t.due_date && t.due_date < today).length;
  }, [tasks, today]);

  const todayCount = useMemo(() => {
    return tasks.filter((t) => !t.done && t.due_date === today).length;
  }, [tasks, today]);

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
    if (!trimmed) {
      setErr("Title required.");
      return;
    }

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
        setErr(`${res.status} — ${j?.error ?? "Could not create task."}`);
        return;
      }

      const created: Task = {
        id: j?.task?.id,
        title: j?.task?.title ?? trimmed,
        notes: j?.task?.notes ?? null,
        due_date: j?.task?.due_date ?? null,
        created_at: j?.task?.created_at ?? new Date().toISOString(),
        done: false,
      };

      if (!created.id) {
        setErr("Server response missing task id.");
        return;
      }

      setTasks((prev) => [created, ...prev]);
      setCreating(false);
      setTitle("");
      setDue("");
      setNotes("");
    } catch {
      setErr("Network error. Try again.");
    }
  }

  async function toggleTask(taskId: string) {
    setErr(null);
    if (busySetRef.current.has(taskId)) return;

    busySetRef.current.add(taskId);
    setBusyId(taskId);

    const current = tasks.find((t) => t.id === taskId);
    const nextDone = current ? !current.done : true;

    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, done: !t.done } : t))
    );

    try {
      const res = await fetch("/m/api/tasks/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_id: taskId, log_date: today }),
      });

      const j = await res.json().catch(() => ({} as any));

      if (!res.ok) {
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, done: !t.done } : t))
        );
        setErr(`${res.status} — ${j?.error ?? "Could not update task."}`);
        return;
      }

      const done = !!j?.done;

      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, done } : t))
      );

      if (done && nextDone) {
        setPulseId(taskId);
        window.setTimeout(() => setPulseId(null), 500);
      }
    } catch {
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, done: !t.done } : t))
      );
      setErr("Network error. Try again.");
    } finally {
      busySetRef.current.delete(taskId);
      setBusyId((p) => (p === taskId ? null : p));
    }
  }

  async function deleteTask() {
    if (!deleteTarget) return;

    setErr(null);
    setDeletingId(deleteTarget.id);

    try {
      const res = await fetch("/m/api/tasks/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_id: deleteTarget.id }),
      });

      const j = await res.json().catch(() => ({} as any));

      if (!res.ok) {
        setErr(`${res.status} — ${j?.error ?? "Could not delete task."}`);
        setDeletingId(null);
        return;
      }

      setTasks((prev) => prev.filter((t) => t.id !== deleteTarget.id));
      setDeleteTarget(null);
      setDeletingId(null);
    } catch {
      setErr("Network error. Try again.");
      setDeletingId(null);
    }
  }

  return (
    <div className="w-full">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Tasks</h1>
          <p className="mt-1 text-sm text-zinc-600">
            {completed} / {tasks.length} done today
            {overdueCount ? (
              <span className="ml-2 text-red-600">• {overdueCount} overdue</span>
            ) : null}
            {!overdueCount && todayCount ? (
              <span className="ml-2 text-amber-600">• {todayCount} due today</span>
            ) : null}
          </p>
        </div>

        <button
          onClick={openCreate}
          className="hidden sm:inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium shadow-sm ring-1 ring-black/5 transition hover:bg-zinc-50 active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          Add task
        </button>
      </div>

      <div className="mt-4 sm:hidden">
        <button
          onClick={openCreate}
          className="w-full rounded-2xl bg-gradient-to-r from-fuchsia-500 via-purple-500 to-indigo-500 px-4 py-3 text-sm font-semibold text-white shadow-sm transition active:scale-[0.99]"
        >
          + Add task
        </button>
      </div>

      <div className="mt-6 space-y-3">
        {tasks.length === 0 ? (
          <div className="rounded-3xl border border-white/50 bg-white/60 p-6 shadow-sm backdrop-blur">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500 to-indigo-500 text-white">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold">No tasks yet</div>
                <div className="mt-1 text-sm text-zinc-600">
                  Add a task and keep the day clean.
                </div>
              </div>
            </div>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {tasks.map((t) => {
              const isBusy = busyId === t.id;
              const isDeleting = deletingId === t.id;
              const isOverdue = !t.done && !!t.due_date && t.due_date < today;
              const isToday = !t.done && t.due_date === today;

              const statusLabel = isDeleting
                ? "Deleting…"
                : isBusy
                ? "Saving…"
                : t.done
                ? "Complete"
                : isOverdue
                ? "Overdue"
                : isToday
                ? "Today"
                : "Pending";

              const statusClass = isDeleting
                ? "bg-zinc-100 text-zinc-600"
                : isBusy
                ? "bg-zinc-100 text-zinc-600"
                : t.done
                ? "bg-emerald-50 text-emerald-700"
                : isOverdue
                ? "bg-red-50 text-red-700"
                : isToday
                ? "bg-amber-50 text-amber-700"
                : "bg-zinc-100 text-zinc-600";

              return (
                <motion.div
                  key={t.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    scale: t.done ? 1.01 : 1,
                  }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{
                    layout: { duration: 0.2 },
                    opacity: { duration: 0.2 },
                    y: { duration: 0.2 },
                    scale: { type: "spring", stiffness: 260, damping: 18 },
                  }}
                  className={[
                    "group overflow-hidden rounded-3xl border text-left shadow-sm transition",
                    "bg-white/70 backdrop-blur hover:bg-white/80",
                    isOverdue ? "border-red-200" : "border-white/60",
                    isBusy || isDeleting ? "opacity-80" : "",
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between gap-3 px-4 py-4 sm:px-5">
                    <button
                      onClick={() => toggleTask(t.id)}
                      disabled={isBusy || isDeleting}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="flex items-start gap-4">
                        <div className="relative shrink-0 pt-0.5">
                          <motion.div
                            animate={t.done ? { scale: [1, 1.06, 1] } : { scale: 1 }}
                            transition={{ duration: 0.2 }}
                            className={[
                              "flex h-10 w-10 items-center justify-center rounded-2xl",
                              t.done
                                ? "bg-gradient-to-br from-fuchsia-500 to-indigo-500 text-white shadow"
                                : isOverdue
                                ? "bg-red-50 text-red-600 ring-1 ring-red-200"
                                : "bg-white text-zinc-900 ring-1 ring-black/10",
                            ].join(" ")}
                          >
                            {t.done ? (
                              <Check className="h-5 w-5" />
                            ) : isOverdue ? (
                              <AlertTriangle className="h-4 w-4" />
                            ) : null}
                          </motion.div>

                          {pulseId === t.id ? (
                            <span className="pointer-events-none absolute inset-0 rounded-2xl bg-fuchsia-500/20 animate-[ping_0.5s_ease-out_1]" />
                          ) : null}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div
                            className={[
                              "break-words text-sm font-semibold leading-5 sm:text-[15px]",
                              t.done ? "text-zinc-700 line-through" : "text-zinc-900",
                            ].join(" ")}
                          >
                            {t.title}
                          </div>

                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                            <span>Tap to {t.done ? "undo" : "complete"}</span>

                            {t.due_date ? (
                              <span
                                className={[
                                  "inline-flex items-center gap-1 rounded-full px-2 py-1 font-medium",
                                  isOverdue
                                    ? "bg-red-50 text-red-600"
                                    : isToday
                                    ? "bg-amber-50 text-amber-700"
                                    : "bg-zinc-100 text-zinc-600",
                                ].join(" ")}
                              >
                                <Calendar className="h-3 w-3" />
                                Due {t.due_date}
                              </span>
                            ) : null}
                          </div>

                          {t.notes ? (
                            <div className="mt-2 line-clamp-2 text-xs text-zinc-600">
                              {t.notes}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </button>

                    <div className="flex shrink-0 items-start gap-2 pl-2">
                      <div
                        className={[
                          "inline-flex min-h-9 items-center rounded-full px-3 py-2 text-xs font-medium whitespace-nowrap",
                          statusClass,
                        ].join(" ")}
                      >
                        {statusLabel}
                      </div>

                      <button
                        type="button"
                        onClick={() => setDeleteTarget(t)}
                        disabled={isDeleting || isBusy}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white/90 text-zinc-500 shadow-sm ring-1 ring-black/5 transition hover:bg-red-50 hover:text-red-600"
                        aria-label={`Delete ${t.title}`}
                        title="Delete task"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="px-4 pb-4 sm:px-5">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
                      <motion.div
                        className={[
                          "h-full rounded-full",
                          t.done
                            ? "bg-gradient-to-r from-fuchsia-500 via-purple-500 to-indigo-500"
                            : isOverdue
                            ? "bg-red-400"
                            : isToday
                            ? "bg-amber-400"
                            : "bg-transparent",
                        ].join(" ")}
                        initial={false}
                        animate={{
                          width: t.done ? "100%" : isOverdue || isToday ? "35%" : "0%",
                        }}
                        transition={{ duration: 0.35 }}
                      />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {err ? <div className="mt-4 text-sm text-red-600">{err}</div> : null}

      <AnimatePresence>
        {creating ? (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              className="absolute inset-0 bg-black/30 backdrop-blur-sm"
              onClick={() => setCreating(false)}
            />
            <motion.div
              initial={{ y: 20, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 20, opacity: 0, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
              className="relative w-full rounded-3xl bg-white p-5 shadow-xl ring-1 ring-black/5 sm:max-w-lg sm:p-6"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-semibold">New task</div>
                  <div className="text-sm text-zinc-600">
                    Make it clear and finishable.
                  </div>
                </div>
                <button
                  className="flex h-9 w-9 items-center justify-center rounded-2xl hover:bg-zinc-100"
                  onClick={() => setCreating(false)}
                  type="button"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 space-y-3">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") createTask();
                  }}
                  placeholder="Send invoice"
                  autoFocus
                  className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-purple-400"
                />

                <input
                  value={due}
                  onChange={(e) => setDue(e.target.value)}
                  type="date"
                  className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-purple-400"
                />

                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional notes…"
                  rows={3}
                  className="w-full resize-none rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-purple-400"
                />

                {err ? <div className="text-sm text-red-600">{err}</div> : null}
              </div>

              <div className="mt-5 flex gap-3">
                <button
                  onClick={() => setCreating(false)}
                  type="button"
                  className="flex-1 rounded-2xl bg-zinc-100 px-4 py-3 text-sm font-semibold transition hover:bg-zinc-200"
                >
                  Cancel
                </button>
                <button
                  onClick={createTask}
                  type="button"
                  className="flex-1 rounded-2xl bg-gradient-to-r from-fuchsia-500 via-purple-500 to-indigo-500 px-4 py-3 text-sm font-semibold text-white transition hover:opacity-95 active:scale-[0.99]"
                >
                  Create
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {deleteTarget ? (
          <motion.div
            className="fixed inset-0 z-[60] flex items-end justify-center p-3 sm:items-center sm:p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              className="absolute inset-0 bg-black/30 backdrop-blur-sm"
              onClick={() => {
                if (!deletingId) setDeleteTarget(null);
              }}
            />

            <motion.div
              initial={{ y: 20, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 20, opacity: 0, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
              className="relative w-full rounded-3xl bg-white p-5 shadow-xl ring-1 ring-black/5 sm:max-w-md sm:p-6"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-semibold text-zinc-900">
                    Delete task?
                  </div>
                  <div className="mt-1 text-sm text-zinc-600">
                    <span className="font-medium text-zinc-900">
                      {deleteTarget.title}
                    </span>{" "}
                    will be removed from your tasks.
                  </div>
                </div>

                <button
                  className="flex h-9 w-9 items-center justify-center rounded-2xl hover:bg-zinc-100"
                  onClick={() => {
                    if (!deletingId) setDeleteTarget(null);
                  }}
                  type="button"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                This action cannot be undone from the app.
              </div>

              <div className="mt-5 flex gap-3">
                <button
                  onClick={() => setDeleteTarget(null)}
                  disabled={!!deletingId}
                  type="button"
                  className="flex-1 rounded-2xl bg-zinc-100 px-4 py-3 text-sm font-semibold transition hover:bg-zinc-200 disabled:opacity-60"
                >
                  Cancel
                </button>

                <button
                  onClick={deleteTask}
                  disabled={!!deletingId}
                  type="button"
                  className="flex-1 rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
                >
                  {deletingId ? "Deleting..." : "Delete task"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}