import HabitsClient from "./HabitClients";
import { supabaseServer } from "@/lib/supabase/server";

function isoDate(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default async function HabitsPage() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // If you want, we can redirect to /login with next=/m/habits
    return (
      <div className="rounded-3xl border border-white/50 bg-white/55 p-6">
        <div className="text-sm font-semibold">Login required</div>
        <div className="mt-2 text-sm text-zinc-600">
          Please login to access Momentum.
        </div>
      </div>
    );
  }

  const today = isoDate(new Date());

  const { data: habits, error: habitsErr } = await supabase
  .from("momentum_habits")
  .select("id,name,created_at,is_archived")
  .eq("user_id", user.id)
  .eq("is_archived", false)
  .order("created_at", { ascending: true });

  if (habitsErr) throw new Error(habitsErr.message);

  const habitIds = (habits ?? []).map((h) => h.id);

  const { data: logs, error: logsErr } = habitIds.length
    ? await supabase
        .from("momentum_habit_logs")
        .select("habit_id,log_date")
        .eq("user_id", user.id)
        .eq("log_date", today)
        .in("habit_id", habitIds)
    : { data: [], error: null };

  if (logsErr) throw new Error(logsErr.message);

  const doneSet = new Set((logs ?? []).map((l) => l.habit_id));

  return (
    <HabitsClient
      today={today}
    initialHabits={(habits ?? []).map((h) => ({
  id: h.id,
  name: h.name,
  created_at: h.created_at,
  done: doneSet.has(h.id),
}))}  
    />
  );
}