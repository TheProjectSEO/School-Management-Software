import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * OAuth callback handler
 * Uses SECURITY DEFINER RPC to auto-provision users bypassing RLS circular dependencies
 */
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
      // Use SECURITY DEFINER RPC to auto-provision user
      // This bypasses RLS circular dependencies and handles both profile and student creation atomically
      const fullName = session.user.user_metadata?.full_name ||
                      session.user.user_metadata?.name ||
                      session.user.email?.split("@")[0] ||
                      "Student";

      const { data: provisionData, error: provisionError } = await supabase.rpc("auto_provision_student", {
        p_auth_user_id: session.user.id,
        p_full_name: fullName,
        p_avatar_url: session.user.user_metadata?.avatar_url || null,
        p_phone: null,
      });

      if (provisionError) {
        console.error("Error auto-provisioning user:", provisionError);
        // Don't fail the login - middleware will attempt again
      } else if (provisionData && provisionData.length > 0 && provisionData[0].is_new_user) {
        console.log("OAuth callback: New user provisioned", {
          profileId: provisionData[0].profile_id,
          studentId: provisionData[0].student_id,
        });
      }

      // Successful authentication, redirect to dashboard
      return NextResponse.redirect(`${origin}/`);
    }
  }

  // If no code or something went wrong, redirect to login with error
  return NextResponse.redirect(`${origin}/login?error=authentication_failed`);
}
