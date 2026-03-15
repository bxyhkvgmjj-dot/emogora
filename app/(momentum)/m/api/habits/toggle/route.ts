import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

function isoDate(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export async function POST(req: Request) {
  const supabase = await supabaseServer();

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const habit_id = body?.habit_id as string | undefined;
  const date = body?.date as string | undefined; // YYYY-MM-DD

  if (!habit_id || !date) {
    return NextResponse.json(
      { error: "Missing habit_id/date" },
      { status: 400 }
    );
  }

  const { data: habit, error: habitErr } = await supabase
    .from("momentum_habits")
    .select("id,user_id,current_streak,best_streak,last_completed_date")
    .eq("id", habit_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (habitErr) {
    return NextResponse.json({ error: habitErr.message }, { status: 500 });
  }

  if (!habit) {
    return NextResponse.json({ error: "Habit not found" }, { status: 404 });
  }

  const { data: existing, error: exErr } = await supabase
    .from("momentum_habit_logs")
    .select("id")
    .eq("user_id", user.id)
    .eq("habit_id", habit_id)
    .eq("log_date", date)
    .maybeSingle();

  if (exErr) {
    return NextResponse.json({ error: exErr.message }, { status: 500 });
  }

  if (existing?.id) {
    const { error: delErr } = await supabase
      .from("momentum_habit_logs")
      .delete()
      .eq("id", existing.id)
      .eq("user_id", user.id);

    if (delErr) {
      return NextResponse.json({ error: delErr.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      done: false,
      current_streak: habit.current_streak ?? 0,
      best_streak: habit.best_streak ?? 0,
    });
  }

  const today = new Date(date);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const todayString = isoDate(today);
  const yesterdayString = isoDate(yesterday);

  let currentStreak = habit.current_streak ?? 0;
  let bestStreak = habit.best_streak ?? 0;
  let lastCompletedDate = habit.last_completed_date ?? null;

  if (lastCompletedDate === yesterdayString) {
    currentStreak += 1;
  } else if (lastCompletedDate === todayString) {
    // already counted for today somehow, keep streak unchanged
  } else {
    currentStreak = 1;
  }

  if (currentStreak > bestStreak) {
    bestStreak = currentStreak;
  }

  lastCompletedDate = todayString;

  const { error: insErr } = await supabase.from("momentum_habit_logs").insert({
    user_id: user.id,
    habit_id,
    log_date: date,
  });

  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  const { error: updateErr } = await supabase
    .from("momentum_habits")
    .update({
      current_streak: currentStreak,
      best_streak: bestStreak,
      last_completed_date: lastCompletedDate,
    })
    .eq("id", habit_id)
    .eq("user_id", user.id);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    done: true,
    current_streak: currentStreak,
    best_streak: bestStreak,
  });
}