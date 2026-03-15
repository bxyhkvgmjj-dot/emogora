"use client";

import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Calendar, Check, Plus, Sparkles, X } from "lucide-react";

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

      if (!created.id) {
        return setErr("Server response missing task id.");
      }

      setTasks((prev) => [created, ...prev]);
      setCreating(false);
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
        return setErr(`${res.status} — ${j?.error ?? "Could not update task."}`);
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
              const isOverdue = !t.done && !!t.due_date && t.due_date < today;
              const isToday = !t.done && t.due_date === today;

              return (
                <motion.button
                  key={t.id}
                  layout
                  onClick={() => toggleTask(t.id)}
                  disabled={isBusy}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    scale: t.done ? 1.01 : 1,
                  }}
                  exit={{ opacity: 0, y: -10 }}
                  whileTap={{ scale: 0.995 }}
                  transition={{
                    layout: { duration: 0.2 },
                    opacity: { duration: 0.2 },
                    y: { duration: 0.2 },
                    scale: { type: "spring", stiffness: 260, damping: 18 },
                  }}
                  className={[
                    "relative w-full overflow-hidden rounded-3xl border text-left shadow-sm transition",
                    "bg-white/70 backdrop-blur hover:bg-white/80",
                    isOverdue ? "border-red-200" : "border-white/60",
                    isBusy ? "opacity-80" : "",
                  ].join(" ")}
                >
                  <div className="flex items-center justify-between gap-4 px-5 py-4">
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="relative shrink-0">
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
                          {t.done ? <Check className="h-5 w-5" /> : isOverdue ? <AlertTriangle className="h-4 w-4" /> : null}
                        </motion.div>

                        {pulseId === t.id ? (
                          <span className="pointer-events-none absolute inset-0 rounded-2xl bg-fuchsia-500/20 animate-[ping_0.5s_ease-out_1]" />
                        ) : null}
                      </div>

                      <div className="min-w-0">
                        <div
                          className={[
                            "truncate text-sm font-semibold",
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

                    <div className="shrink-0 text-xs text-zinc-500">
                      {isBusy ? "Saving…" : t.done ? "Done" : isOverdue ? "Overdue" : isToday ? "Today" : "Pending"}
                    </div>
                  </div>

                  <div className="px-5 pb-4">
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
                </motion.button>
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
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 space-y-3">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && createTask()}
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
                  className="flex-1 rounded-2xl bg-zinc-100 px-4 py-3 text-sm font-semibold transition hover:bg-zinc-200"
                >
                  Cancel
                </button>
                <button
                  onClick={createTask}
                  className="flex-1 rounded-2xl bg-gradient-to-r from-fuchsia-500 via-purple-500 to-indigo-500 px-4 py-3 text-sm font-semibold text-white transition hover:opacity-95 active:scale-[0.99]"
                >
                  Create
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}