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

  const { task_id } = await req.json();

  if (!task_id) {
    return NextResponse.json({ error: "Missing task_id" }, { status: 400 });
  }

  const { error } = await supabase
    .from("momentum_tasks")
    .delete()
    .eq("id", task_id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}