import { redirect } from "next/navigation";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export default async function AuthenticatedLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  if (!getSupabaseConfig()) {
    redirect("/login");
  }

  let isAuthenticated = false;

  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    isAuthenticated = !error && Boolean(user);
  } catch {
    isAuthenticated = false;
  }

  if (!isAuthenticated) {
    redirect("/login");
  }

  return children;
}