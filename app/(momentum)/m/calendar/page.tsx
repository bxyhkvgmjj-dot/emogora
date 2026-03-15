import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";

type SearchParams = Promise<{
  month?: string | string[];
  day?: string | string[];
}>;

type Habit = {
  id: string;
  name: string;
};

type Task = {
  id: string;
  title: string;
  due_date: string | null;
};

type HabitLog = {
  habit_id: string;
  log_date: string;
};

type TaskLog = {
  task_id: string;
  log_date: string;
};

function isoDate(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function monthKey(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}`;
}

function parseMonthParam(input?: string) {
  if (!input || !/^\d{4}-\d{2}$/.test(input)) {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }

  const [y, m] = input.split("-").map(Number);
  return new Date(y, m - 1, 1);
}

function parseDayParam(input?: string, fallback?: string) {
  if (!input || !/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    return fallback ?? isoDate(new Date());
  }
  return input;
}

function getMonthBounds(monthDate: Date) {
  const start = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const end = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
  return { start, end };
}

function getCalendarStart(monthStart: Date) {
  const day = monthStart.getDay();
  const mondayIndex = day === 0 ? 6 : day - 1;
  const start = new Date(monthStart);
  start.setDate(monthStart.getDate() - mondayIndex);
  return start;
}

function getCalendarDays(monthDate: Date) {
  const { start } = getMonthBounds(monthDate);
  const gridStart = getCalendarStart(start);

  return Array.from({ length: 42 }).map((_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });
}

function formatMonthYear(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function formatLongDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function isSameMonth(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function isToday(iso: string) {
  return iso === isoDate(new Date());
}

function previousMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() - 1, 1);
}

function nextMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 1);
}

function pluralize(count: number, singular: string, plural?: string) {
  return `${count} ${count === 1 ? singular : plural ?? `${singular}s`}`;
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const resolvedSearchParams = await searchParams;

  const rawMonth = resolvedSearchParams?.month;
  const rawDay = resolvedSearchParams?.day;

  const monthParam =
    typeof rawMonth === "string" ? rawMonth : Array.isArray(rawMonth) ? rawMonth[0] : undefined;

  const dayParam =
    typeof rawDay === "string" ? rawDay : Array.isArray(rawDay) ? rawDay[0] : undefined;

  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="rounded-3xl border border-white/50 bg-white/60 p-6 shadow-sm backdrop-blur">
        <div className="text-sm font-semibold">Login required</div>
        <div className="mt-1 text-sm text-zinc-600">
          Please login to access Momentum.
        </div>
      </div>
    );
  }

  const monthDate = parseMonthParam(monthParam);
  const { start: monthStart, end: monthEnd } = getMonthBounds(monthDate);
  const calendarDays = getCalendarDays(monthDate);

  const currentMonthKey = monthKey(monthDate);
  const todayIso = isoDate(new Date());

  const selectedDayCandidate = parseDayParam(dayParam, todayIso);
  const selectedDay = selectedDayCandidate.startsWith(currentMonthKey)
    ? selectedDayCandidate
    : todayIso.startsWith(currentMonthKey)
    ? todayIso
    : isoDate(monthStart);

  const monthStartIso = isoDate(monthStart);
  const monthEndIso = isoDate(monthEnd);

  const [habitsRes, tasksRes, habitLogsRes, taskLogsRes] = await Promise.all([
    supabase
      .from("momentum_habits")
      .select("id,name")
      .eq("user_id", user.id)
      .eq("is_archived", false)
      .order("created_at", { ascending: true }),

    supabase
      .from("momentum_tasks")
      .select("id,title,due_date")
      .eq("user_id", user.id)
      .gte("due_date", monthStartIso)
      .lte("due_date", monthEndIso)
      .order("created_at", { ascending: false }),

    supabase
      .from("momentum_habit_logs")
      .select("habit_id,log_date")
      .eq("user_id", user.id)
      .gte("log_date", monthStartIso)
      .lte("log_date", monthEndIso),

    supabase
      .from("momentum_task_logs")
      .select("task_id,log_date")
      .eq("user_id", user.id)
      .gte("log_date", monthStartIso)
      .lte("log_date", monthEndIso),
  ]);

  if (habitsRes.error) throw new Error(habitsRes.error.message);
  if (tasksRes.error) throw new Error(tasksRes.error.message);
  if (habitLogsRes.error) throw new Error(habitLogsRes.error.message);
  if (taskLogsRes.error) throw new Error(taskLogsRes.error.message);

  const habits = (habitsRes.data ?? []) as Habit[];
  const tasks = (tasksRes.data ?? []) as Task[];
  const habitLogs = (habitLogsRes.data ?? []) as HabitLog[];
  const taskLogs = (taskLogsRes.data ?? []) as TaskLog[];

  const habitsById = new Map(habits.map((h) => [h.id, h]));
  const tasksById = new Map(tasks.map((t) => [t.id, t]));

  const habitLogsByDate = new Map<string, string[]>();
  for (const log of habitLogs) {
    const list = habitLogsByDate.get(log.log_date) ?? [];
    list.push(log.habit_id);
    habitLogsByDate.set(log.log_date, list);
  }

  const taskLogsByDate = new Map<string, string[]>();
  for (const log of taskLogs) {
    const list = taskLogsByDate.get(log.log_date) ?? [];
    list.push(log.task_id);
    taskLogsByDate.set(log.log_date, list);
  }

  const dueTasksByDate = new Map<string, Task[]>();
  for (const task of tasks) {
    if (!task.due_date) continue;
    const list = dueTasksByDate.get(task.due_date) ?? [];
    list.push(task);
    dueTasksByDate.set(task.due_date, list);
  }

  const selectedHabitIds = habitLogsByDate.get(selectedDay) ?? [];
  const selectedTaskIds = taskLogsByDate.get(selectedDay) ?? [];
  const selectedDueTasks = dueTasksByDate.get(selectedDay) ?? [];

  const selectedHabits = selectedHabitIds
    .map((id) => habitsById.get(id))
    .filter(Boolean) as Habit[];

  const selectedCompletedTasks = selectedTaskIds
    .map((id) => tasksById.get(id))
    .filter(Boolean) as Task[];

  const totalDoneSelectedDay = selectedHabits.length + selectedCompletedTasks.length;

  const prevMonthValue = monthKey(previousMonth(monthDate));
  const nextMonthValue = monthKey(nextMonth(monthDate));

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Momentum
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Calendar
          </h1>
          <p className="mt-2 text-sm text-zinc-600 sm:text-base">
            See your rhythm, your wins, and the days that need more consistency.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={`/m/calendar?month=${prevMonthValue}&day=${selectedDay}`}
            className="inline-flex items-center rounded-full border border-white/50 bg-white/75 px-4 py-2.5 text-sm font-medium shadow-sm backdrop-blur transition hover:bg-white"
          >
            ← Previous
          </Link>

          <Link
            href={`/m/calendar?month=${monthKey(new Date())}&day=${todayIso}`}
            className="inline-flex items-center rounded-full border border-white/50 bg-white/75 px-4 py-2.5 text-sm font-medium shadow-sm backdrop-blur transition hover:bg-white"
          >
            Today
          </Link>

          <Link
            href={`/m/calendar?month=${nextMonthValue}&day=${selectedDay}`}
            className="inline-flex items-center rounded-full border border-white/50 bg-white/75 px-4 py-2.5 text-sm font-medium shadow-sm backdrop-blur transition hover:bg-white"
          >
            Next →
          </Link>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.7fr_0.9fr]">
        <div className="rounded-3xl border border-white/50 bg-white/70 p-5 shadow-sm backdrop-blur">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">{formatMonthYear(monthDate)}</h2>
              <p className="mt-1 text-sm text-zinc-600">
                Track completed habits, finished tasks, and due dates.
              </p>
            </div>

            <div className="rounded-2xl bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-700">
              {pluralize(habits.length, "habit")} · {pluralize(tasks.length, "task")} due
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label) => (
              <div
                key={label}
                className="px-2 py-2 text-center text-xs font-semibold uppercase tracking-wide text-zinc-500"
              >
                {label}
              </div>
            ))}

            {calendarDays.map((date) => {
              const dayIso = isoDate(date);
              const inMonth = isSameMonth(date, monthDate);
              const habitDoneCount = new Set(habitLogsByDate.get(dayIso) ?? []).size;
              const taskDoneCount = new Set(taskLogsByDate.get(dayIso) ?? []).size;
              const dueCount = (dueTasksByDate.get(dayIso) ?? []).length;
              const selected = selectedDay === dayIso;
              const today = isToday(dayIso);
              const hasActivity = habitDoneCount > 0 || taskDoneCount > 0 || dueCount > 0;

              return (
                <Link
                  key={dayIso}
                  href={`/m/calendar?month=${currentMonthKey}&day=${dayIso}`}
                  className={[
                    "min-h-[92px] rounded-2xl border p-2.5 transition",
                    "hover:bg-white/90 hover:shadow-sm",
                    selected
                      ? "border-transparent bg-gradient-to-br from-fuchsia-500/12 via-purple-500/12 to-indigo-500/12 ring-2 ring-fuchsia-400/60"
                      : "border-zinc-200 bg-white/75",
                    inMonth ? "" : "opacity-45",
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div
                      className={[
                        "flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold",
                        today
                          ? "bg-gradient-to-r from-fuchsia-500 via-purple-500 to-indigo-500 text-white"
                          : "bg-zinc-100 text-zinc-800",
                      ].join(" ")}
                    >
                      {date.getDate()}
                    </div>

                    {hasActivity ? (
                      <div className="text-[10px] font-medium text-zinc-500">
                        {habitDoneCount + taskDoneCount} done
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-2 space-y-1.5">
                    <DayBadge label={pluralize(habitDoneCount, "habit")} tone="purple" show={habitDoneCount > 0} />
                    <DayBadge label={pluralize(taskDoneCount, "task")} tone="indigo" show={taskDoneCount > 0} />
                    <DayBadge label={pluralize(dueCount, "task")} suffix=" due" tone="amber" show={dueCount > 0} />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="rounded-3xl border border-white/50 bg-white/70 p-5 shadow-sm backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Day detail</h2>
              <p className="mt-1 text-sm text-zinc-600">{formatLongDate(selectedDay)}</p>
            </div>

            <div className="rounded-2xl bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-700">
              {totalDoneSelectedDay} done
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <MiniStat title="Habits completed" value={selectedHabits.length} tone="purple" />
            <MiniStat title="Tasks completed" value={selectedCompletedTasks.length} tone="indigo" />
            <MiniStat title="Tasks due" value={selectedDueTasks.length} tone="amber" />
          </div>

          <div className="mt-6 space-y-5">
            <DetailSection
              title="Completed habits"
              empty="No habits completed on this day."
              items={selectedHabits.map((habit) => habit.name)}
              tone="purple"
            />

            <DetailSection
              title="Completed tasks"
              empty="No tasks completed on this day."
              items={selectedCompletedTasks.map((task) => task.title)}
              tone="indigo"
            />

            <DetailSection
              title="Tasks due"
              empty="No tasks due on this day."
              items={selectedDueTasks.map((task) => task.title)}
              tone="amber"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function DayBadge({
  label,
  tone,
  show,
  suffix = "",
}: {
  label: string;
  tone: "purple" | "indigo" | "amber";
  show: boolean;
  suffix?: string;
}) {
  if (!show) return null;

  const styles =
    tone === "purple"
      ? "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200"
      : tone === "indigo"
      ? "bg-indigo-50 text-indigo-700 border-indigo-200"
      : "bg-amber-50 text-amber-700 border-amber-200";

  return (
    <div className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium ${styles}`}>
      {label}
      {suffix}
    </div>
  );
}

function MiniStat({
  title,
  value,
  tone,
}: {
  title: string;
  value: number;
  tone: "purple" | "indigo" | "amber";
}) {
  const valueClass =
    tone === "purple"
      ? "text-fuchsia-600"
      : tone === "indigo"
      ? "text-indigo-600"
      : "text-amber-600";

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white/80 p-4">
      <div className="text-sm text-zinc-500">{title}</div>
      <div className={`mt-2 text-3xl font-semibold ${valueClass}`}>{value}</div>
    </div>
  );
}

function DetailSection({
  title,
  items,
  empty,
  tone,
}: {
  title: string;
  items: string[];
  empty: string;
  tone: "purple" | "indigo" | "amber";
}) {
  const dotClass =
    tone === "purple"
      ? "bg-fuchsia-500"
      : tone === "indigo"
      ? "bg-indigo-500"
      : "bg-amber-500";

  return (
    <div>
      <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>

      {items.length === 0 ? (
        <div className="mt-2 rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/70 px-4 py-3 text-sm text-zinc-500">
          {empty}
        </div>
      ) : (
        <div className="mt-2 space-y-2">
          {items.map((item, index) => (
            <div
              key={`${title}-${item}-${index}`}
              className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white/80 px-4 py-3"
            >
              <span className={`h-2.5 w-2.5 rounded-full ${dotClass}`} />
              <span className="text-sm font-medium text-zinc-800">{item}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}