// app/api/chat/route.ts
import OpenAI from "openai";
import { supabaseServer } from "@/lib/supabase/server";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// ------------------------------------------------------
// Types
// ------------------------------------------------------
type FrontMessage = {
  id?: string; // ✅ from DB
  role: "user" | "ai";
  text: string;
  createdAt?: string | null; // ✅ from DB
};

/**
 * ✅ Actions (matches your UI spec)
 * - Feel: regenerate, shorter, deeper, more_empathetic
 * - Plan: regenerate, shorter, deeper
 * - Grow: regenerate, shorter, deeper
 */
type ChatAction = "reply" | "regenerate" | "shorter" | "deeper" | "more_empathetic";

type PostBody = {
  messages: FrontMessage[];
  mode?: string;
  memory?: string | null;

  conversationId?: string; // required for multi-chat
  action?: ChatAction; // actions for the last AI message
};

// ------------------------------------------------------
// Helpers
// ------------------------------------------------------
function safeTitleFrom(text: string) {
  const t = (text || "").trim().replace(/\s+/g, " ");
  if (!t) return "New chat";
  return t.length > 60 ? t.slice(0, 60) + "…" : t;
}

function nowIso() {
  return new Date().toISOString();
}

/**
 * IMPORTANT:
 * We ensure "deeper" is a REAL upgrade:
 * - NOT just longer
 * - new insights, tradeoffs, mechanisms, next moves
 * - avoid repeating the same points
 */
function actionHint(action: ChatAction | undefined, space: string) {
  if (!action || action === "reply") return "";

  if (action === "regenerate") {
    return `
Regenerate the answer with fresh wording and improved clarity.
- Keep the same intent and meaning
- Avoid adding fluff
- Improve structure and usefulness
`.trim();
  }

  if (action === "shorter") {
    return `
Rewrite the answer to be MUCH shorter (about 40–60% length).
- Keep the key points
- Remove repetition
- Keep it crisp and helpful
`.trim();
  }

  if (action === "more_empathetic") {
    return `
Rewrite the answer to be more empathetic and emotionally attuned.
- Validate feelings clearly
- Use gentle language
- Reduce advice density
- Prioritize emotional safety over solutions
`.trim();
  }

  if (action === "deeper") {
    // Adapt depth framing per mode, same overall goal
    const modeFlavor =
      space === "plan"
        ? `
Make this significantly deeper and more practical.
- Identify the real constraint(s) and root cause(s)
- Offer 2–4 high-leverage options with tradeoffs
- Add a simple plan (first step + next 2 steps)
- Call out a common failure mode + how to prevent it
`
        : space === "grow"
        ? `
Make this significantly deeper and more strategic.
- Diagnose the situation (what’s really happening underneath)
- Provide 2–4 strategy options with pros/cons and when to use each
- Include a clear recommended path + first move
- Add nuance (risks, assumptions, what to measure)
`
        : `
Make this significantly deeper and more emotionally intelligent.
- Name likely underlying needs/fears
- Offer 2–3 interpretations (not just one)
- Give 1–2 gentle experiments to test what helps
- Keep the tone soothing and safe
`;

    return `
You are producing a "DEEP DIVE" upgrade.

THIS IS NOT ABOUT LENGTH.
Do NOT repeat the same ideas with different words.

Instead, add REAL value by doing at least 3 of the following:
- Surface hidden assumptions and the real core problem
- Add nuance and tradeoffs (what changes the recommendation)
- Provide a stronger framework / mental model
- Provide a clearer recommendation with reasoning ("why this")
- Add 1–2 concrete examples that change how the user thinks

Keep it readable and premium.
${modeFlavor.trim()}

Before you answer, do a quick internal check:
- Did I add NEW insights (not just rephrasing)?
- Did I include at least one tradeoff/assumption?
- Did I give a clearer next move?
`.trim();
  }

  return "";
}

/**
 * ✅ Model selection
 * - Default: gpt-4o-mini
 * - ONLY "deeper" uses gpt-4o (your “Deep dive” upgrade)
 */
function selectModel(action?: ChatAction) {
  const model: OpenAI.Chat.ChatModel = action === "deeper" ? "gpt-4o" : "gpt-4o-mini";
  return model;
}

/**
 * Optional: tune temperature for depth vs normal.
 * Lower temp helps deeper feel less repetitive.
 */
function selectTemperature(action?: ChatAction) {
  if (action === "deeper") return 0.6;
  if (action && action !== "reply") return 0.8;
  return 0.8;
}

/**
 * For actions that are "rewrite the last answer",
 * we should drop the last assistant message so it doesn't "continue" it.
 */
function isRewriteAction(action?: ChatAction) {
  return !!action && action !== "reply";
}

// ------------------------------------------------------
// GET — load messages (auth + conversation)
// /api/chat?mode=feel&conversationId=uuid
// ------------------------------------------------------
export async function GET(req: Request) {
  try {
    const supabase = await supabaseServer();

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr) console.error("Auth getUser error:", userErr);

    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const mode = searchParams.get("mode") ?? "feel";
    const conversationId = searchParams.get("conversationId");

    if (!conversationId) {
      return Response.json({ messages: [] });
    }

    const { data, error } = await supabase
      .from("messages")
      .select("id, role, content, created_at")
      .eq("user_id", user.id)
      .eq("mode", mode)
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Supabase GET error:", error);
      return Response.json({ messages: [] });
    }

    const messages: FrontMessage[] =
      data?.map((m: any) => ({
        id: m.id as string,
        role: m.role === "assistant" ? "ai" : "user",
        text: (m.content as string) ?? "",
        createdAt: (m.created_at as string) ?? null,
      })) ?? [];

    return Response.json({ messages });
  } catch (err) {
    console.error("GET /api/chat error:", err);
    return new Response(JSON.stringify({ error: "Failed to load chat history" }), { status: 500 });
  }
}

// ------------------------------------------------------
// POST — generate reply + save messages (auth)
// ------------------------------------------------------
export async function POST(req: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return new Response(JSON.stringify({ error: "Missing OPENAI_API_KEY" }), { status: 500 });
  }

  try {
    const supabase = await supabaseServer();

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr) console.error("Auth getUser error:", userErr);

    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const body = (await req.json()) as PostBody;
    const { messages, mode, memory, conversationId, action } = body;

    if (!conversationId) {
      return new Response(JSON.stringify({ error: "Missing conversationId" }), { status: 400 });
    }

    const space = mode ?? "feel";

    // --------------------------------------------------
    // System prompt: professional, premium, readable
    // --------------------------------------------------
    const sharedStyle = `
You are Emogora — a premium companion.

Your #1 job: make answers feel clear, alive, and easy to act on.

Formatting rules (IMPORTANT):
- Output Markdown (GitHub-flavored).
- Balanced paragraphs: mix short + medium length (avoid walls of text).
- Use lists only when helpful (not everywhere).
- Use **bold** for key ideas (a few times, not everywhere).
- Use tasteful emojis (1–3 per reply max).
- Keep it professional (not childish), but engaging.
- Prefer structure:
  - short opening line
  - then sections and/or lists when helpful
  - end with a small "Mode tools" block when relevant (compact)

Behavior rules:
- Ask 1 smart question only if truly needed.
- Otherwise: strong first answer + a clear next step.
`.trim();

    const modeTools =
      space === "plan"
        ? `
At the end, if relevant, include a compact block:
✅ Next steps
⏱ Time estimate
⚠️ Common trap
`.trim()
        : space === "grow"
        ? `
At the end, if relevant, include a compact block:
🔍 Diagnosis
🚀 Options
✅ First move
`.trim()
        : `
At the end, if relevant, include a compact block:
🌿 What I’m hearing
💡 Gentle options
🧩 One tiny next step
`.trim();

    const baseModeSystem =
      space === "plan"
        ? `
${sharedStyle}

Mode: Plan & Execute.
Tone: structured, motivating, practical.
${modeTools}
`.trim()
        : space === "grow"
        ? `
${sharedStyle}

Mode: Grow My Career & Biz.
Tone: warm, confident, strategic.
${modeTools}
`.trim()
        : `
${sharedStyle}

Mode: Feel & Reflect.
Tone: warm, empathetic, soothing.
${modeTools}
`.trim();

    // --------------------------------------------------
    // Stronger prompt separation (Deep dive only)
    // --------------------------------------------------
    const deepDiveSystem =
      action === "deeper"
        ? `
Deep dive contract (STRICT):
- You are acting as a senior coach/strategist.
- Your job is to create NEW insight, not longer text.
- Do NOT mirror the prior answer. Do NOT paraphrase it.

Output shape (use headings when helpful):
1) **What matters most**
2) **What’s really going on (mechanisms / root causes)**
3) **Options (2–4) + tradeoffs**
4) **Recommendation + why**
5) **First move (small, concrete)**

Rules:
- Include at least 1 tradeoff OR assumption that could change the advice.
- Add 1 concrete example or mini-script if relevant.
- Keep it premium and readable (no walls of text).
`.trim()
        : "";

    const hint = actionHint(action, space);

    // --------------------------------------------------
    // Build OpenAI messages
    // For rewrite actions: drop last AI message from history,
    // BUT pass it separately so the model can avoid repeating it.
    // --------------------------------------------------
    const inputMessages = Array.isArray(messages) ? [...messages] : [];
    const last = inputMessages[inputMessages.length - 1];

    const rewrite = isRewriteAction(action);
    const lastAiText =
      rewrite && last && last.role === "ai" ? (last.text || "").trim() : "";

    const dropLastAiFromHistory = rewrite && last && last.role === "ai";
    const finalMessages = dropLastAiFromHistory ? inputMessages.slice(0, -1) : inputMessages;

    const chatMessages: OpenAI.ChatCompletionMessageParam[] = [
      { role: "system", content: baseModeSystem },
    ];

    if (deepDiveSystem) {
      chatMessages.push({ role: "system", content: deepDiveSystem });
    }

    if (memory) {
      chatMessages.push({
        role: "system",
        content: `User memory (use only if it truly helps):\n${memory}`,
      });
    }

    if (lastAiText) {
      chatMessages.push({
        role: "system",
        content: `Previous assistant answer (DO NOT repeat it; improve beyond it):\n${lastAiText}`,
      });
    }

    if (hint) {
      chatMessages.push({ role: "system", content: `Instruction:\n${hint}` });
    }

    for (const m of finalMessages) {
      chatMessages.push({
        role: m.role === "user" ? "user" : "assistant",
        content: m.text,
      });
    }

    // --------------------------------------------------
    // ✅ Model selection: ONLY deeper -> gpt-4o
    // --------------------------------------------------
    const model = selectModel(action);
    const temperature = selectTemperature(action);

    const completion = await openai.chat.completions.create({
      model,
      messages: chatMessages,
      temperature,
    });

    const reply = completion.choices[0]?.message?.content ?? "I’m here with you. Let’s try again.";

    // --------------------------------------------------
    // Conversations: ensure exists + bump updated_at
    // --------------------------------------------------
    const firstUser = finalMessages.find((m) => m.role === "user") ?? null;
    const title = safeTitleFrom(firstUser?.text ?? "");

    const { error: upsertErr } = await supabase
      .from("conversations")
      .upsert(
        {
          id: conversationId,
          user_id: user.id,
          mode: space,
          title,
          updated_at: nowIso(),
        },
        { onConflict: "id" }
      );

    if (upsertErr) console.error("Supabase conversations upsert error:", upsertErr);

    // --------------------------------------------------
    // Save messages
    // - Normal reply: save last user + assistant
    // - Rewrite actions: save only assistant
    // --------------------------------------------------
    const rows: Array<{
      user_id: string;
      mode: string;
      conversation_id: string;
      role: "user" | "assistant";
      content: string;
    }> = [];

    const isVariant = rewrite;

    if (!isVariant) {
      const lastUserMessage = [...finalMessages].reverse().find((m) => m.role === "user");
      if (lastUserMessage) {
        rows.push({
          user_id: user.id,
          mode: space,
          conversation_id: conversationId,
          role: "user",
          content: lastUserMessage.text,
        });
      }
    }

    rows.push({
      user_id: user.id,
      mode: space,
      conversation_id: conversationId,
      role: "assistant",
      content: reply,
    });

    const { error: insertErr } = await supabase.from("messages").insert(rows);
    if (insertErr) console.error("Supabase messages insert error:", insertErr);

    await supabase
      .from("conversations")
      .update({ updated_at: nowIso() })
      .eq("id", conversationId)
      .eq("user_id", user.id);

    // IMPORTANT: do NOT return model name to the client (keeps provider invisible)
    return Response.json({ reply });
  } catch (err) {
    console.error("POST /api/chat error:", err);
    return new Response(JSON.stringify({ error: "Failed to generate reply" }), { status: 500 });
  }
}
