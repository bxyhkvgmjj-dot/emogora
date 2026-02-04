// app/chat/page.tsx
import { redirect } from "next/navigation";
import ChatClient from "./ChatClient";
import { supabaseServer } from "@/lib/supabase/server";

type ChatPageProps = {
  searchParams: Promise<{
    mode?: string;
  }>;
};

export default async function ChatPage({ searchParams }: ChatPageProps) {
  const supabase = await supabaseServer();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  // Not logged in => go login
  if (error) {
    console.error("getUser error:", error);
  }
  if (!user) redirect("/login");

  // Await the promise and read mode
  const params = await searchParams;
  const mode = (params.mode as string) || "feel";

  return <ChatClient mode={mode} />;
}

