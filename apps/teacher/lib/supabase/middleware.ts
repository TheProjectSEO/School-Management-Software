import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthRoute =
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/teacher-register") ||
    request.nextUrl.pathname.startsWith("/register");

  const isPublicApiRoute = request.nextUrl.pathname.startsWith("/api/schools");

  const isTeacherRoute = request.nextUrl.pathname.startsWith("/teacher");

  // Not authenticated - redirect to login if trying to access protected routes
  // Allow public API routes to pass through
  if (!user && !isAuthRoute && !isPublicApiRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Authenticated - redirect away from auth pages
  if (user && isAuthRoute) {
    // Get profile to determine role
    const { data: profile } = await supabase
      .from("school_profiles")
      .select("id")
      .eq("auth_user_id", user.id)
      .single();

    if (profile) {
      // Check if teacher
      const { data: teacherProfile } = await supabase
        .from("teacher_profiles")
        .select("id")
        .eq("profile_id", profile.id)
        .eq("is_active", true)
        .maybeSingle();

      const url = request.nextUrl.clone();
      url.pathname = teacherProfile ? "/teacher" : "/";
      return NextResponse.redirect(url);
    }
  }

  // Teacher route protection
  if (user && isTeacherRoute) {
    // Get profile
    const { data: profile } = await supabase
      .from("school_profiles")
      .select("id")
      .eq("auth_user_id", user.id)
      .single();

    if (profile) {
      // Check if user has teacher role
      const { data: teacherProfile } = await supabase
        .from("teacher_profiles")
        .select("id")
        .eq("profile_id", profile.id)
        .eq("is_active", true)
        .maybeSingle();

      if (!teacherProfile) {
        // Not a teacher - redirect to student dashboard or login
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        return NextResponse.redirect(url);
      }
    }
  }

  return supabaseResponse;
}
