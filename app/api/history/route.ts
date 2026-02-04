// app/api/history/route.ts
import { supabaseServer } from "@/lib/supabase/server";

type ConversationPreview = {
  id: string;
  title: string;
  preview: string;
  date: string; // ISO string
};

export async function GET(req: Request) {
  try {
    const supabase = await supabaseServer();

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr) console.error("Auth getUser error:", userErr);

    if (!user) {
      return new Response(JSON.stringify({ conversations: [] }), { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const mode = searchParams.get("mode") ?? "feel";

    // Pull conversations (ordered by updated_at desc)
    const { data: convos, error: convosErr } = await supabase
      .from("conversations")
      .select("id, title, updated_at, created_at")
      .eq("user_id", user.id)
      .eq("mode", mode)
      .order("updated_at", { ascending: false });

    if (convosErr) console.error("History conversations fetch error:", convosErr);

    if (convos && convos.length > 0) {
      // Pull recent messages for previews (latest per conversation)
      const { data: recentMsgs, error: msgsErr } = await supabase
        .from("messages")
        .select("conversation_id, content, created_at")
        .eq("user_id", user.id)
        .eq("mode", mode)
        .not("conversation_id", "is", null)
        .order("created_at", { ascending: false })
        .limit(400);

      if (msgsErr) console.error("History preview messages fetch error:", msgsErr);

      const latestPreviewByConversation = new Map<string, string>();

      if (Array.isArray(recentMsgs)) {
        for (const m of recentMsgs as any[]) {
          const cid = (m.conversation_id as string | null) ?? null;
          if (!cid) continue;
          if (latestPreviewByConversation.has(cid)) continue;

          const text = ((m.content as string) ?? "").trim();
          if (!text) continue;

          // cleaner one-line preview
          latestPreviewByConversation.set(cid, text.replace(/\s+/g, " ").slice(0, 90));
        }
      }

      // Filter out "empty" convos that have no message preview AND title is default
      const conversations: ConversationPreview[] = (convos as any[])
        .map((c) => {
          const id = c.id as string;
          const title = ((c.title as string) || "New chat").trim();
          const date =
            (c.updated_at as string) ||
            (c.created_at as string) ||
            new Date().toISOString();

          const preview =
            latestPreviewByConversation.get(id) ??
            (title !== "New chat" ? title : "");

          return { id, title, preview, date };
        })
        .filter((c) => c.preview.length > 0 || c.title !== "New chat");

      return Response.json({ conversations });
    }

    // Fallback: group messages
    const { data, error } = await supabase
      .from("messages")
      .select("conversation_id, content, created_at")
      .eq("user_id", user.id)
      .eq("mode", mode)
      .not("conversation_id", "is", null)
      .order("created_at", { ascending: false });

    if (error || !data) {
      console.error("History fallback fetch error:", error);
      return Response.json({ conversations: [] });
    }

    const map = new Map<string, ConversationPreview>();

    for (const m of data as any[]) {
      const id = (m.conversation_id as string | null) ?? null;
      if (!id) continue;

      if (!map.has(id)) {
        const content = ((m.content as string) ?? "").trim();
        map.set(id, {
          id,
          title: safeTitle(content),
          preview: content.replace(/\s+/g, " ").slice(0, 90),
          date: m.created_at as string,
        });
      }
    }

    return Response.json({ conversations: Array.from(map.values()) });
  } catch (err) {
    console.error("GET /api/history error:", err);
    return Response.json({ conversations: [] });
  }
}

function safeTitle(text: string) {
  const t = (text || "").trim().replace(/\s+/g, " ");
  if (!t) return "New chat";
  return t.length > 60 ? t.slice(0, 60) + "…" : t;
}
