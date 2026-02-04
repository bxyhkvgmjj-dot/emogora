// app/api/conversation/route.ts
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
    const conversationId = searchParams.get("conversationId");
    const mode = searchParams.get("mode") ?? "feel";

    if (!conversationId) {
      return new Response(JSON.stringify({ error: "Missing conversationId" }), { status: 400 });
    }

    // 1) delete messages first (and get count)
    const { error: delMsgsErr, count: msgsCount } = await supabase
      .from("messages")
      .delete({ count: "exact" })
      .eq("user_id", user.id)
      .eq("mode", mode)
      .eq("conversation_id", conversationId);

    if (delMsgsErr) {
      console.error("Delete messages error:", delMsgsErr);
      return new Response(
        JSON.stringify({ error: "Failed to delete messages", details: delMsgsErr.message }),
        { status: 500 }
      );
    }

    // 2) delete conversation (and get count)
    const { error: delConvoErr, count: convoCount } = await supabase
      .from("conversations")
      .delete({ count: "exact" })
      .eq("user_id", user.id)
      .eq("mode", mode)
      .eq("id", conversationId);

    if (delConvoErr) {
      console.error("Delete conversation error:", delConvoErr);
      return new Response(
        JSON.stringify({ error: "Failed to delete conversation", details: delConvoErr.message }),
        { status: 500 }
      );
    }

    // ✅ Critical: return what actually happened
    return Response.json({
      ok: true,
      deleted: {
        messages: msgsCount ?? 0,
        conversations: convoCount ?? 0,
      },
      debug: { conversationId, mode, userId: user.id },
    });
  } catch (e: any) {
    console.error("DELETE /api/conversation error:", e);
    return new Response(JSON.stringify({ error: "Server error", details: String(e?.message ?? e) }), {
      status: 500,
    });
  }
}
