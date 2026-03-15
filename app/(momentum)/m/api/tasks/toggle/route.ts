import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const task_id = body?.task_id;
  const log_date = body?.log_date;

  if (!task_id || !log_date) {
    return NextResponse.json(
      { error: "Missing task_id/log_date" },
      { status: 400 }
    );
  }

  const { data: task, error: taskErr } = await supabase
    .from("momentum_tasks")
    .select("id,user_id")
    .eq("id", task_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (taskErr) {
    return NextResponse.json({ error: taskErr.message }, { status: 400 });
  }

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const { data: existing, error: existingErr } = await supabase
    .from("momentum_task_logs")
    .select("id")
    .eq("user_id", user.id)
    .eq("task_id", task_id)
    .eq("log_date", log_date)
    .maybeSingle();

  if (existingErr) {
    return NextResponse.json({ error: existingErr.message }, { status: 400 });
  }

  if (existing?.id) {
    const { error: deleteErr } = await supabase
      .from("momentum_task_logs")
      .delete()
      .eq("id", existing.id)
      .eq("user_id", user.id);

    if (deleteErr) {
      return NextResponse.json({ error: deleteErr.message }, { status: 400 });
    }

    return NextResponse.json({
      done: false,
      task_id,
      log_date,
    });
  }

  const { error: insertErr } = await supabase.from("momentum_task_logs").insert([
    {
      user_id: user.id,
      task_id,
      log_date,
    },
  ]);

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 400 });
  }

  return NextResponse.json({
    done: true,
    task_id,
    log_date,
  });
}