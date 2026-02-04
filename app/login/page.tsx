// app/login/page.tsx
import { redirect } from "next/navigation";
import LoginForm from "./LoginForm";
import { supabaseServer } from "@/lib/supabase/server";

export default async function LoginPage() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Already logged in -> send to app
  if (user) redirect("/");

  return <LoginForm />;
}
