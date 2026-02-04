// app/api/message/route.ts
import { supabaseServer } from "@/lib/supabase/server";

export async function DELETE(req: Request) {
  try {
    const supabase = await supabaseServer();

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr) console.error("auth.getUser error:", userErr);

    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const mode = searchParams.get("mode") ?? "feel";

    if (!id) {
      return new Response(JSON.stringify({ error: "Missing id" }), { status: 400 });
    }

    const { error, count } = await supabase
      .from("messages")
      .delete({ count: "exact" })
      .eq("id", id)
      .eq("user_id", user.id)
      .eq("mode", mode);

    if (error) {
      console.error("Delete message error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to delete message", details: error.message }),
        { status: 500 }
      );
    }

    return Response.json({
      ok: true,
      deleted: count ?? 0,
      debug: { id, mode, userId: user.id },
    });
  } catch (e: any) {
    console.error("DELETE /api/message error:", e);
    return new Response(
      JSON.stringify({ error: "Server error", details: String(e?.message ?? e) }),
      { status: 500 }
    );
  }
}

