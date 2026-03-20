import { redirect } from "next/navigation";
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
    redirect("/m/login");
  }

  const today = isoDate(new Date());

  const { data: habits, error: habitsErr } = await supabase
    .from("momentum_habits")
    .select("id,name,created_at,is_archived,current_streak,best_streak")
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
        current_streak: h.current_streak ?? 0,
        best_streak: h.best_streak ?? 0,
      }))}
    />
  );
}