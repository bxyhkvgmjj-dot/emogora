"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  Flame,
  Plus,
  Sparkles,
  Trophy,
  Trash2,
  X,
} from "lucide-react";

type Habit = {
  id: string;
  name: string;
  created_at: string;
  done: boolean;
  current_streak?: number | null;
  best_streak?: number | null;
};

type Props = {
  initialHabits: Habit[];
  today: string;
};

export default function HabitClients({ initialHabits, today }: Props) {
  const [habits, setHabits] = useState<Habit[]>(initialHabits);

  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");

  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [burstId, setBurstId] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Habit | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const busySetRef = useRef(new Set<string>());

  const completedCount = useMemo(
    () => habits.filter((h) => h.done).length,
    [habits]
  );

  const topStreak = useMemo(
    () => habits.reduce((max, h) => Math.max(max, h.current_streak ?? 0), 0),
    [habits]
  );

  useEffect(() => {
    setHabits(initialHabits);
  }, [initialHabits]);

  function openCreate() {
    setErr(null);
    setName("");
    setCreating(true);
  }

  async function createHabit() {
    setErr(null);
    const trimmed = name.trim();
    if (!trimmed) return setErr("Name required.");

    try {
      const res = await fetch("/m/api/habits/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });

      const j = await res.json().catch(() => ({} as any));
      if (!res.ok) {
        setErr(`${res.status} — ${j?.error ?? "Could not create habit."}`);
        return;
      }

      const created: Habit = {
        id: j?.habit?.id,
        name: j?.habit?.name ?? trimmed,
        created_at: j?.habit?.created_at ?? new Date().toISOString(),
        done: false,
        current_streak: j?.habit?.current_streak ?? 0,
        best_streak: j?.habit?.best_streak ?? 0,
      };

      if (!created.id) {
        setErr("Server response missing habit id.");
        return;
      }

      setHabits((prev) => [created, ...prev]);
      setName("");
      setCreating(false);
    } catch {
      setErr("Network error. Try again.");
    }
  }

  async function toggleHabit(habitId: string) {
    setErr(null);

    if (busySetRef.current.has(habitId)) return;
    busySetRef.current.add(habitId);
    setBusyId(habitId);

    const current = habits.find((h) => h.id === habitId);
    const nextDone = current ? !current.done : true;

    setHabits((prev) =>
      prev.map((h) => (h.id === habitId ? { ...h, done: !h.done } : h))
    );

    try {
      const res = await fetch("/m/api/habits/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ habit_id: habitId, date: today }),
      });

      const j = await res.json().catch(() => ({} as any));

      if (!res.ok) {
        setHabits((prev) =>
          prev.map((h) => (h.id === habitId ? { ...h, done: !h.done } : h))
        );
        setErr(`${res.status} — ${j?.error ?? "Could not update habit."}`);
        return;
      }

      const done = !!j?.done;
      const currentStreak =
        typeof j?.current_streak === "number"
          ? j.current_streak
          : current?.current_streak ?? 0;

      const bestStreak =
        typeof j?.best_streak === "number"
          ? j.best_streak
          : current?.best_streak ?? 0;

      setHabits((prev) =>
        prev.map((h) =>
          h.id === habitId
            ? {
                ...h,
                done,
                current_streak: currentStreak,
                best_streak: bestStreak,
              }
            : h
        )
      );

      if (done && nextDone) {
        setBurstId(habitId);
        window.setTimeout(() => setBurstId(null), 650);
      }
    } catch {
      setHabits((prev) =>
        prev.map((h) => (h.id === habitId ? { ...h, done: !h.done } : h))
      );
      setErr("Network error. Try again.");
    } finally {
      busySetRef.current.delete(habitId);
      setBusyId((prev) => (prev === habitId ? null : prev));
    }
  }

  async function deleteHabit() {
    if (!deleteTarget) return;

    setErr(null);
    setDeletingId(deleteTarget.id);

    try {
      const res = await fetch("/m/api/habits/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ habit_id: deleteTarget.id }),
      });

      const j = await res.json().catch(() => ({} as any));

      if (!res.ok) {
        setErr(`${res.status} — ${j?.error ?? "Could not delete habit."}`);
        setDeletingId(null);
        return;
      }

      setHabits((prev) => prev.filter((h) => h.id !== deleteTarget.id));
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
          <h1 className="text-3xl font-semibold tracking-tight">Habits</h1>
          <p className="mt-1 text-sm text-zinc-600">
            {completedCount} / {habits.length} completed today
          </p>

          {topStreak > 0 ? (
            <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700">
              <Flame className="h-3.5 w-3.5" />
              Best active streak: {topStreak} day{topStreak > 1 ? "s" : ""}
            </div>
          ) : null}
        </div>

        <button
          onClick={openCreate}
          className="hidden sm:inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium shadow-sm ring-1 ring-black/5 transition hover:bg-zinc-50 active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          Add habit
        </button>
      </div>

      <div className="mt-4 sm:hidden">
        <button
          onClick={openCreate}
          className="w-full rounded-2xl bg-gradient-to-r from-fuchsia-500 via-purple-500 to-indigo-500 px-4 py-3 text-sm font-semibold text-white shadow-sm transition active:scale-[0.99]"
        >
          + Add habit
        </button>
      </div>

      <div className="mt-6 space-y-3">
        {habits.length === 0 ? (
          <div className="rounded-3xl border border-white/50 bg-white/60 p-6 shadow-sm backdrop-blur">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500 to-indigo-500 text-white">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold">No habits yet</div>
                <div className="text-sm text-zinc-600">
                  Add your first habit and start building momentum.
                </div>
              </div>
            </div>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {habits.map((h) => {
              const isBusy = busyId === h.id;
              const isDeleting = deletingId === h.id;
              const currentStreak = h.current_streak ?? 0;
              const bestStreak = h.best_streak ?? 0;

              return (
                <motion.div
                  key={h.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    scale: h.done ? 1.01 : 1,
                  }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{
                    layout: { duration: 0.2 },
                    opacity: { duration: 0.2 },
                    y: { duration: 0.2 },
                    scale: { type: "spring", stiffness: 260, damping: 18 },
                  }}
                  className={[
                    "group relative overflow-hidden rounded-3xl border shadow-sm transition",
                    "border-white/60 bg-white/70 backdrop-blur",
                    h.done ? "hover:bg-white/85" : "hover:bg-white/80",
                    isBusy || isDeleting ? "opacity-80" : "",
                  ].join(" ")}
                >
                  <button
                    onClick={() => toggleHabit(h.id)}
                    disabled={isBusy || isDeleting}
                    className="block w-full text-left"
                  >
                    <div className="flex items-center justify-between gap-4 px-5 py-4">
                      <div className="flex min-w-0 items-center gap-4">
                        <div className="relative shrink-0">
                          <motion.div
                            animate={h.done ? { scale: [1, 1.08, 1] } : { scale: 1 }}
                            transition={{ duration: 0.22 }}
                            className={[
                              "flex h-10 w-10 items-center justify-center rounded-2xl",
                              h.done
                                ? "bg-gradient-to-br from-fuchsia-500 to-indigo-500 text-white shadow"
                                : "bg-white text-zinc-900 ring-1 ring-black/10",
                            ].join(" ")}
                          >
                            {h.done ? <Check className="h-5 w-5" /> : null}
                          </motion.div>

                          {burstId === h.id ? (
                            <>
                              <span className="pointer-events-none absolute inset-0 rounded-2xl bg-fuchsia-500/25 animate-[ping_0.65s_ease-out_1]" />
                              <span className="pointer-events-none absolute -top-2 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-fuchsia-400 animate-[pop_0.65s_ease-out_1]" />
                              <span className="pointer-events-none absolute top-1/2 -right-2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-indigo-400 animate-[pop_0.65s_ease-out_1]" />
                              <span className="pointer-events-none absolute -bottom-2 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-indigo-400 animate-[pop_0.65s_ease-out_1]" />
                              <span className="pointer-events-none absolute top-1/2 -left-2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-fuchsia-400 animate-[pop_0.65s_ease-out_1]" />
                            </>
                          ) : null}
                        </div>

                        <div className="min-w-0">
                          <div
                            className={[
                              "truncate text-sm font-semibold",
                              h.done ? "text-zinc-700 line-through" : "text-zinc-900",
                            ].join(" ")}
                          >
                            {h.name}
                          </div>

                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                            <span>Tap to {h.done ? "mark as not done" : "complete"}</span>

                            {currentStreak > 0 ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-1 font-medium text-orange-700">
                                <Flame className="h-3 w-3" />
                                {currentStreak} day{currentStreak > 1 ? "s" : ""}
                              </span>
                            ) : null}

                            {bestStreak > 0 ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-1 font-medium text-zinc-600">
                                <Trophy className="h-3 w-3" />
                                Best {bestStreak}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-3">
                        <div className="text-xs text-zinc-500">
                          {isDeleting
                            ? "Deleting…"
                            : isBusy
                            ? "Saving…"
                            : h.done
                            ? "Completed"
                            : "Pending"}
                        </div>
                      </div>
                    </div>

                    <div className="px-5 pb-4">
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
                        <motion.div
                          className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 via-purple-500 to-indigo-500"
                          initial={false}
                          animate={{ width: h.done ? "100%" : "0%" }}
                          transition={{ duration: 0.35 }}
                        />
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeleteTarget(h)}
                    disabled={isDeleting || isBusy}
                    className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-2xl bg-white/90 text-zinc-500 shadow-sm ring-1 ring-black/5 transition hover:bg-red-50 hover:text-red-600 sm:opacity-0 sm:group-hover:opacity-100"
                    aria-label={`Delete ${h.name}`}
                    title="Delete habit"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
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
                  <div className="text-lg font-semibold">New habit</div>
                  <div className="text-sm text-zinc-600">
                    Keep it simple and repeatable.
                  </div>
                </div>
                <button
                  className="flex h-9 w-9 items-center justify-center rounded-2xl hover:bg-zinc-100"
                  onClick={() => setCreating(false)}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") createHabit();
                  }}
                  placeholder="Drink water"
                  autoFocus
                  className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-purple-400"
                />
                {err ? <div className="mt-2 text-sm text-red-600">{err}</div> : null}
              </div>

              <div className="mt-5 flex gap-3">
                <button
                  onClick={() => setCreating(false)}
                  className="flex-1 rounded-2xl bg-zinc-100 px-4 py-3 text-sm font-semibold transition hover:bg-zinc-200"
                >
                  Cancel
                </button>
                <button
                  onClick={createHabit}
                  className="flex-1 rounded-2xl bg-gradient-to-r from-fuchsia-500 via-purple-500 to-indigo-500 px-4 py-3 text-sm font-semibold text-white transition hover:opacity-95 active:scale-[0.99]"
                >
                  Create
                </button>
              </div>

              <div className="mt-3 text-xs text-zinc-500">
                Tip: start with one habit. Consistency beats intensity.
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
                    Delete habit?
                  </div>
                  <div className="mt-1 text-sm text-zinc-600">
                    <span className="font-medium text-zinc-900">
                      {deleteTarget.name}
                    </span>{" "}
                    will be removed from your habits.
                  </div>
                </div>

                <button
                  className="flex h-9 w-9 items-center justify-center rounded-2xl hover:bg-zinc-100"
                  onClick={() => {
                    if (!deletingId) setDeleteTarget(null);
                  }}
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
                  className="flex-1 rounded-2xl bg-zinc-100 px-4 py-3 text-sm font-semibold transition hover:bg-zinc-200 disabled:opacity-60"
                >
                  Cancel
                </button>

                <button
                  onClick={deleteHabit}
                  disabled={!!deletingId}
                  className="flex-1 rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
                >
                  {deletingId ? "Deleting..." : "Delete habit"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}