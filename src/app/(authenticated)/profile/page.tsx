import { redirect } from "next/navigation";
import { ProfileForm } from "@/components/auth/profile-form";
import { PageHeading } from "@/components/ui/page-heading";
import { createClient } from "@/lib/supabase/server";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/profile");
  }

  const { data: profile, error } = await supabase.from("profiles").select("username").eq("id", user.id).maybeSingle();

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
      <PageHeading eyebrow="Account" title="Your profile" />
      <section className="mt-8 max-w-xl border-t border-[var(--line)] pt-6">
        {error || !profile ? (
          <p className="text-sm leading-6 text-red-700">
            Your profile is not available yet. Ask the project administrator to apply the profiles migration to the development Supabase project.
          </p>
        ) : (
          <ProfileForm username={profile.username ?? ""} />
        )}
      </section>
    </main>
  );
}