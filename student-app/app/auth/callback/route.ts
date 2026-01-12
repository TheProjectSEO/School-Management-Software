import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const origin = requestUrl.origin;

  if (code) {
    const supabase = await createClient();

    // Exchange the code for a session
    const { data: { session }, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);

    if (sessionError) {
      console.error("Error exchanging code for session:", sessionError);
      return NextResponse.redirect(`${origin}/login?error=authentication_failed`);
    }

    if (session?.user) {
      // Check if this is a new user (OAuth signup)
      // We'll check if a profile exists for this user
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("auth_user_id", session.user.id)
        .single();

      // If no profile exists, create one with data from OAuth provider
      if (!existingProfile) {
        const fullName = session.user.user_metadata?.full_name ||
                        session.user.user_metadata?.name ||
                        session.user.email?.split("@")[0] ||
                        "Student";

        // First, get the default school (MSU)
        const { data: defaultSchool } = await supabase
          .from("schools")
          .select("id")
          .limit(1)
          .single();

        // Create profile
        const { data: newProfile, error: profileError } = await supabase
          .from("profiles")
          .insert({
            auth_user_id: session.user.id,
            full_name: fullName,
            avatar_url: session.user.user_metadata?.avatar_url,
            phone: null,
          })
          .select()
          .single();

        if (profileError) {
          console.error("Error creating profile:", profileError);
          return NextResponse.redirect(`${origin}/login?error=profile_creation_failed`);
        }

        // Create a student record for the new user
        if (newProfile && defaultSchool) {
          const { error: studentError } = await supabase
            .from("students")
            .insert({
              school_id: defaultSchool.id,
              profile_id: newProfile.id,
              lrn: null,
              grade_level: null,
              section_id: null,
            });

          if (studentError) {
            console.error("Error creating student record:", studentError);
            // Don't fail the login, profile exists so they can still access
          }
        }
      }

      // Successful authentication, redirect to dashboard
      return NextResponse.redirect(`${origin}/`);
    }
  }

  // If no code or something went wrong, redirect to login with error
  return NextResponse.redirect(`${origin}/login?error=authentication_failed`);
}
