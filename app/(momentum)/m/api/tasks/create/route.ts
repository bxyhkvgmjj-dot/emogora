import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const title = (body?.title ?? "").trim();
  const due_date = body?.due_date ?? null; // "YYYY-MM-DD" or null
  const notes = (body?.notes ?? "").trim() || null;

  if (!title) return NextResponse.json({ error: "Title required" }, { status: 400 });

  const { data, error } = await supabase
    .from("momentum_tasks")
    .insert([{ user_id: user.id, title, due_date, notes }])
    .select("id,title,notes,due_date,created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ task: data });
}