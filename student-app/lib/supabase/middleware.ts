import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { autoProvisionUser } from "@/lib/auth/AUTO_PROVISION_USER";

// Cache to prevent repeated auto-provision attempts per user session
// Key: userId, Value: timestamp of last attempt
const provisionAttemptCache = new Map<string, number>();
const PROVISION_CACHE_TTL = 60 * 1000; // 60 seconds between attempts

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: {
        schema: "school software", // Match server.ts schema
      },
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

  // Refreshing the auth token
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protected routes - redirect to login if not authenticated
  const isAuthRoute =
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/register");

  if (!user && !isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from auth pages
  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // ROLE-BASED ACCESS: Check if user is a teacher trying to access student app
  // Teachers should use the teacher app instead
  if (user && !isAuthRoute) {
    const roleCheckKey = `role_${user.id}`;
    const lastRoleCheck = provisionAttemptCache.get(roleCheckKey);
    const now = Date.now();

    // Only check role once per TTL to avoid repeated DB queries
    if (!lastRoleCheck || (now - lastRoleCheck) > PROVISION_CACHE_TTL) {
      provisionAttemptCache.set(roleCheckKey, now);

      try {
        // Get user's profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("auth_user_id", user.id)
          .maybeSingle();

        if (profile) {
          // Check if user is a teacher (has teacher_profiles record)
          const { data: teacherProfile } = await supabase
            .from("teacher_profiles")
            .select("id")
            .eq("profile_id", profile.id)
            .maybeSingle();

          // Check if user is a student (has students record)
          const { data: studentRecord } = await supabase
            .from("students")
            .select("id")
            .eq("profile_id", profile.id)
            .maybeSingle();

          // If user is a teacher but NOT a student, redirect to teacher app
          if (teacherProfile && !studentRecord) {
            console.log("[Middleware] Teacher detected, redirecting to teacher app");
            // Redirect to teacher app (assuming it's on a different port or domain)
            // For now, redirect to a "wrong app" page
            if (!request.nextUrl.pathname.startsWith("/wrong-app")) {
              const url = request.nextUrl.clone();
              url.pathname = "/wrong-app";
              return NextResponse.redirect(url);
            }
          }

          // If user is a student, clear the role check cache (they're valid)
          if (studentRecord) {
            provisionAttemptCache.delete(roleCheckKey);
          }
        }
      } catch (error) {
        console.error("[Middleware] Role check error:", error);
      }
    }
  }

  // AUTO-PROVISIONING: Ensure profile and student record exist
  // Only attempt once per user per TTL period to prevent log spam
  if (user && !isAuthRoute && !request.nextUrl.pathname.startsWith("/wrong-app")) {
    const lastAttempt = provisionAttemptCache.get(user.id);
    const now = Date.now();

    // Skip if we recently attempted for this user
    if (!lastAttempt || (now - lastAttempt) > PROVISION_CACHE_TTL) {
      provisionAttemptCache.set(user.id, now);

      try {
        const result = await autoProvisionUser(
          supabase,
          user.id,
          user.email,
          user.user_metadata
        );

        if (!result.success) {
          // Only log once, then cache prevents repeated logs
          console.error("[Middleware] Auto-provision failed:", result.error);
        } else if (result.isNewUser) {
          console.log("[Middleware] New user provisioned:", {
            userId: user.id,
            profileId: result.profileId,
            studentId: result.studentId,
          });
        }
        // If successful with studentId, remove from cache to allow normal operation
        if (result.studentId) {
          provisionAttemptCache.delete(user.id);
        }
      } catch (error) {
        console.error("[Middleware] Auto-provision exception:", error);
      }
    }
  }

  return supabaseResponse;
}
