import { redirect } from "next/navigation";
import TaskClients from "./TaskClients";
import { supabaseServer } from "@/lib/supabase/server";

function isoDate(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default async function TasksPage() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const today = isoDate(new Date());

  if (!user) {
    redirect("/m/login");
  }

  const { data: tasks, error: tasksErr } = await supabase
    .from("momentum_tasks")
    .select("id,title,notes,due_date,created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (tasksErr) throw new Error(tasksErr.message);

  const { data: logs, error: logsErr } = await supabase
    .from("momentum_task_logs")
    .select("task_id,log_date")
    .eq("user_id", user.id)
    .eq("log_date", today);

  if (logsErr) throw new Error(logsErr.message);

  const doneSet = new Set((logs ?? []).map((l) => l.task_id));

  const initialTasks =
    (tasks ?? []).map((t) => ({
      ...t,
      done: doneSet.has(t.id),
    })) ?? [];

  return <TaskClients initialTasks={initialTasks} today={today} />;
}