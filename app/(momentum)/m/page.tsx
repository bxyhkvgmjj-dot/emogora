import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";

type DayStat = {
  label: string;
  fullDate: string;
  done: number;
  total: number;
  percent: number;
};

type HabitRow = {
  id: string;
  name?: string;
  current_streak?: number | null;
};

type TaskRow = {
  id: string;
  title?: string | null;
  due_date: string | null;
  created_at: string;
};

function isoDate(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatShortDay(date: Date) {
  return date.toLocaleDateString("en-US", { weekday: "short" });
}

function formatLongDay(date: Date) {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function getMomentumTier(score: number) {
  if (score >= 80) return "Elite momentum";
  if (score >= 60) return "Strong momentum";
  if (score >= 30) return "Building momentum";
  return "Momentum weak";
}

export default async function MomentumDashboardPage() {
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

  const todayDate = new Date();
  const today = isoDate(todayDate);

  const weekDates = Array.from({ length: 7 }).map((_, index) => {
    const d = new Date(todayDate);
    d.setDate(todayDate.getDate() - (6 - index));
    return d;
  });

  const weekDateStrings = weekDates.map(isoDate);

  const [
    habitsRes,
    tasksRes,
    habitLogsTodayRes,
    taskLogsTodayRes,
    habitLogsWeekRes,
    taskLogsWeekRes,
  ] = await Promise.all([
    supabase
      .from("momentum_habits")
      .select("id,name,current_streak")
      .eq("user_id", user.id)
      .eq("is_archived", false),

    supabase
      .from("momentum_tasks")
      .select("id,title,due_date,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),

    supabase
      .from("momentum_habit_logs")
      .select("habit_id,log_date")
      .eq("user_id", user.id)
      .eq("log_date", today),

    supabase
      .from("momentum_task_logs")
      .select("task_id,log_date")
      .eq("user_id", user.id)
      .eq("log_date", today),

    supabase
      .from("momentum_habit_logs")
      .select("habit_id,log_date")
      .eq("user_id", user.id)
      .in("log_date", weekDateStrings),

    supabase
      .from("momentum_task_logs")
      .select("task_id,log_date")
      .eq("user_id", user.id)
      .in("log_date", weekDateStrings),
  ]);

  if (habitsRes.error) throw new Error(habitsRes.error.message);
  if (tasksRes.error) throw new Error(tasksRes.error.message);
  if (habitLogsTodayRes.error) throw new Error(habitLogsTodayRes.error.message);
  if (taskLogsTodayRes.error) throw new Error(taskLogsTodayRes.error.message);
  if (habitLogsWeekRes.error) throw new Error(habitLogsWeekRes.error.message);
  if (taskLogsWeekRes.error) throw new Error(taskLogsWeekRes.error.message);

  const habits: HabitRow[] = habitsRes.data ?? [];
  const tasks: TaskRow[] = tasksRes.data ?? [];
  const habitLogsToday = habitLogsTodayRes.data ?? [];
  const taskLogsToday = taskLogsTodayRes.data ?? [];
  const habitLogsWeek = habitLogsWeekRes.data ?? [];
  const taskLogsWeek = taskLogsWeekRes.data ?? [];

  const habitsTotal = habits.length;
  const tasksTotal = tasks.length;

  const doneHabitIdsToday = new Set(habitLogsToday.map((l) => l.habit_id));
  const doneTaskIdsToday = new Set(taskLogsToday.map((l) => l.task_id));

  const habitsCompletedToday = doneHabitIdsToday.size;
  const tasksCompletedToday = doneTaskIdsToday.size;

  const completedItems = habitsCompletedToday + tasksCompletedToday;
  const totalItems = habitsTotal + tasksTotal;
  const momentumScore =
    totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  const momentumTier = getMomentumTier(momentumScore);

  const overdueTask = tasks.find((task) => {
    if (!task.due_date) return false;
    if (task.due_date >= today) return false;
    return !doneTaskIdsToday.has(task.id);
  });

  const todayTask = tasks.find((task) => {
    if (!task.due_date) return false;
    if (task.due_date !== today) return false;
    return !doneTaskIdsToday.has(task.id);
  });

  const remainingHabit = habits.find((habit) => !doneHabitIdsToday.has(habit.id));

  const overdueTasks = tasks.filter((task) => {
    if (!task.due_date) return false;
    if (task.due_date >= today) return false;
    return !doneTaskIdsToday.has(task.id);
  }).length;

  const weeklyStats: DayStat[] = weekDates.map((date) => {
    const dateStr = isoDate(date);

    const habitDone = new Set(
      habitLogsWeek.filter((l) => l.log_date === dateStr).map((l) => l.habit_id)
    ).size;

    const taskDone = new Set(
      taskLogsWeek.filter((l) => l.log_date === dateStr).map((l) => l.task_id)
    ).size;

    const done = habitDone + taskDone;
    const total = habitsTotal + tasksTotal;
    const percent = total > 0 ? Math.round((done / total) * 100) : 0;

    return {
      label: formatShortDay(date),
      fullDate: formatLongDay(date),
      done,
      total,
      percent,
    };
  });

  let weeklyActiveStreak = 0;
  for (let i = weeklyStats.length - 1; i >= 0; i--) {
    if (weeklyStats[i].done > 0) {
      weeklyActiveStreak += 1;
    } else {
      break;
    }
  }

  const topHabitStreak = habits.reduce(
    (max, habit) => Math.max(max, habit.current_streak ?? 0),
    0
  );

  const streak = topHabitStreak > 0 ? topHabitStreak : weeklyActiveStreak;

  const weeklyAverage =
    weeklyStats.length > 0
      ? Math.round(
          weeklyStats.reduce((sum, day) => sum + day.percent, 0) / weeklyStats.length
        )
      : 0;

  const hasWeeklyActivity = weeklyStats.some((day) => day.done > 0);

  const summaryText =
    overdueTasks > 0
      ? `You have ${overdueTasks} overdue task${overdueTasks > 1 ? "s" : ""}. Clear ${overdueTasks === 1 ? "it" : "them"} first to protect momentum.`
      : completedItems === 0
      ? "No wins logged yet today. Complete one habit or one task now to start momentum."
      : completedItems === 1
      ? "Strong start. One win logged today — keep going while the energy is there."
      : `Great rhythm today: ${habitsCompletedToday} habit${habitsCompletedToday > 1 ? "s" : ""} and ${tasksCompletedToday} task${tasksCompletedToday > 1 ? "s" : ""} completed.`;

  const scoreTone =
    momentumScore >= 80
      ? "text-emerald-600"
      : momentumScore >= 60
      ? "text-violet-600"
      : momentumScore >= 30
      ? "text-amber-600"
      : momentumScore > 0
      ? "text-orange-600"
      : "text-zinc-900";

  const focusItem = overdueTask
    ? { type: "overdue-task" as const, item: overdueTask }
    : todayTask
    ? { type: "today-task" as const, item: todayTask }
    : remainingHabit
    ? { type: "habit" as const, item: remainingHabit }
    : null;

  function getFocusText() {
    if (!focusItem) {
      return {
        title: "Momentum stable",
        subtitle: "Everything important is cleared for today.",
        cta: "Stay consistent",
        href: "/m",
        priority: "Nothing urgent",
      };
    }

    if (focusItem.type === "overdue-task") {
      return {
        title: "Clear overdue task",
        subtitle: focusItem.item.title?.trim() || "Untitled task",
        cta: "Open tasks",
        href: "/m/tasks",
        priority: "Overdue task first",
      };
    }

    if (focusItem.type === "today-task") {
      return {
        title: "Do today's task",
        subtitle: focusItem.item.title?.trim() || "Untitled task",
        cta: "Open tasks",
        href: "/m/tasks",
        priority: "Today's key task",
      };
    }

    return {
      title: "Complete habit",
      subtitle: focusItem.item.name?.trim() || "Next habit",
      cta: "Open habits",
      href: "/m/habits",
      priority: "Remaining habit",
    };
  }

  const focusText = getFocusText();

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
          Momentum
        </p>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Dashboard
            </h1>
            <p className="mt-2 text-sm text-zinc-600 sm:text-base">
              A premium view of progress, consistency, and focus.
            </p>
            <p className="mt-3 text-sm font-medium text-zinc-800">{summaryText}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/m/habits"
              className="inline-flex items-center gap-2 rounded-full border border-white/50 bg-white/75 px-4 py-2.5 text-sm font-medium shadow-sm backdrop-blur transition hover:bg-white"
            >
              <span className="text-base leading-none">＋</span>
              Add habit
            </Link>

            <Link
              href="/m/tasks"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-fuchsia-500 via-purple-500 to-indigo-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:opacity-95"
            >
              <span className="text-base leading-none">＋</span>
              Add task
            </Link>

            <div className="inline-flex items-center gap-2 rounded-full border border-white/50 bg-white/75 px-4 py-2.5 text-sm font-medium shadow-sm backdrop-blur">
              <span className="text-base">🔥</span>
              <span>{streak} day streak</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          href="/m"
          title="Momentum score"
          value={`${momentumScore}%`}
          subtitle={
            totalItems > 0
              ? `${completedItems}/${totalItems} completed today • ${momentumTier}`
              : "No habits or tasks yet"
          }
          emoji="⚡"
          valueClassName={scoreTone}
        />

        <StatCard
          href="/m/habits"
          title="Habits completed"
          value={`${habitsCompletedToday}`}
          subtitle={`${habitsTotal} total habits`}
          emoji="✓"
        />

        <StatCard
          href="/m/tasks"
          title="Tasks completed"
          value={`${tasksCompletedToday}`}
          subtitle={`${tasksTotal} total tasks`}
          emoji="🗂️"
        />

        <StatCard
          href="/m/tasks"
          title="Overdue tasks"
          value={`${overdueTasks}`}
          subtitle={
            overdueTasks > 0 ? "Needs attention today" : "Everything is under control"
          }
          emoji="⚠️"
          danger={overdueTasks > 0}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Link
          href="/m/calendar"
          className="rounded-3xl border border-white/50 bg-white/70 p-5 shadow-sm backdrop-blur transition hover:bg-white/80 xl:col-span-2"
        >
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Weekly progress</h2>
              <p className="mt-1 text-sm text-zinc-600">
                Your completion rhythm over the last 7 days.
              </p>
            </div>

            <div className="rounded-2xl bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-700">
              {weeklyAverage}% avg
            </div>
          </div>

          {hasWeeklyActivity ? (
            <div className="flex h-56 items-end gap-3">
              {weeklyStats.map((day) => (
                <div
                  key={day.fullDate}
                  className="flex flex-1 flex-col items-center justify-end gap-3"
                  title={`${day.fullDate}: ${day.done}/${day.total} (${day.percent}%)`}
                >
                  <div className="flex h-44 w-full items-end">
                    <div className="relative w-full overflow-hidden rounded-2xl bg-zinc-100">
                      <div
                        className="w-full rounded-2xl bg-gradient-to-t from-fuchsia-500 via-purple-500 to-indigo-500 transition-all duration-700 ease-out"
                        style={{
                          height: `${Math.max(day.percent, day.done > 0 ? 10 : 4)}px`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="text-center">
                    <p className="text-xs font-semibold text-zinc-800">{day.label}</p>
                    <p className="mt-1 text-[11px] text-zinc-500">{day.percent}%</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex min-h-[224px] flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-200 bg-zinc-50/70 px-6 text-center">
              <div className="text-3xl">📈</div>
              <div className="mt-3 text-sm font-semibold text-zinc-900">
                No activity yet this week
              </div>
              <div className="mt-1 max-w-md text-sm text-zinc-600">
                Complete one habit or task to start building your weekly momentum.
              </div>
            </div>
          )}
        </Link>

        <Link
          href={focusText.href}
          className="rounded-3xl border border-white/50 bg-white/70 p-5 shadow-sm backdrop-blur transition hover:bg-white/80"
        >
          <h2 className="text-lg font-semibold">Focus today</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Your next best move is selected automatically.
          </p>

          <div className="mt-6 space-y-4">
            <InsightRow label="Momentum" value={momentumTier} />
            <InsightRow label="Priority" value={focusText.priority} />
            <InsightRow
              label="Consistency"
              value={streak > 0 ? `${streak} day streak` : "No active streak"}
            />
          </div>

          <div className="mt-6 rounded-2xl bg-zinc-100 p-4">
            <p className="text-sm font-semibold text-zinc-900">{focusText.title}</p>
            <p className="mt-1 text-sm text-zinc-600">{focusText.subtitle}</p>

            <div className="mt-4 inline-flex items-center rounded-full bg-white px-3 py-2 text-sm font-medium text-zinc-900 shadow-sm">
              {focusText.cta}
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}

function StatCard({
  href,
  title,
  value,
  subtitle,
  emoji,
  danger = false,
  valueClassName = "text-zinc-900",
}: {
  href: string;
  title: string;
  value: string;
  subtitle: string;
  emoji: string;
  danger?: boolean;
  valueClassName?: string;
}) {
  return (
    <Link
      href={href}
      className={[
        "group rounded-3xl border bg-white/70 p-5 shadow-sm backdrop-blur transition",
        "hover:-translate-y-0.5 hover:bg-white/85 hover:shadow-md",
        danger ? "border-red-200" : "border-white/50",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-zinc-500">{title}</p>
          <p className={`mt-3 text-3xl font-semibold tracking-tight ${valueClassName}`}>
            {value}
          </p>
          <p className="mt-2 text-sm text-zinc-600">{subtitle}</p>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-100 text-xl transition-transform duration-200 group-hover:scale-105">
          {emoji}
        </div>
      </div>
    </Link>
  );
}

function InsightRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-zinc-200 px-4 py-3">
      <span className="text-sm text-zinc-500">{label}</span>
      <span className="text-right text-sm font-semibold text-zinc-900">{value}</span>
    </div>
  );
}