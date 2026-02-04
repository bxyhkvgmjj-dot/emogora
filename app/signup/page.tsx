// app/signup/page.tsx
// Option 1 + simplicity: redirect /signup to /login so you have ONE entry point.
import { redirect } from "next/navigation";

export default function SignupPage() {
  redirect("/login");
}
