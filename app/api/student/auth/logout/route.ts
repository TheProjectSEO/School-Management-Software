import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  const supabase = await createClient();
  const cookieStore = await cookies();

  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Supabase signOut error:", error);
    }

    // Create response with success message
    const response = NextResponse.json(
      { success: true },
      { status: 200 }
    );

    // Get all Supabase-related cookies and clear them
    const allCookies = cookieStore.getAll();
    const supabaseCookies = allCookies.filter(
      (cookie) =>
        cookie.name.includes("sb-") ||
        cookie.name.includes("supabase") ||
        cookie.name.includes("auth")
    );

    // Clear each Supabase cookie by setting expired date
    for (const cookie of supabaseCookies) {
      response.cookies.set(cookie.name, "", {
        expires: new Date(0),
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      });
    }

    // Also explicitly clear the common Supabase auth cookie patterns
    const commonCookieNames = [
      "sb-access-token",
      "sb-refresh-token",
      `sb-${process.env.NEXT_PUBLIC_SUPABASE_URL?.split("//")[1]?.split(".")[0]}-auth-token`,
    ];

    for (const name of commonCookieNames) {
      response.cookies.set(name, "", {
        expires: new Date(0),
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      });
    }

    return response;
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { error: "Failed to log out" },
      { status: 500 }
    );
  }
}
