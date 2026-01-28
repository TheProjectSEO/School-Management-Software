import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserFromHeaders } from "@/lib/dal/admin";

/**
 * GET /api/messages/unread-count
 * Fetches the count of unread messages for the current user
 */
export async function GET() {
  try {
    // Use JWT-based authentication from headers
    const currentUser = await getUserFromHeaders();

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Get profile using JWT user ID
    const { data: profile, error: profileError } = await supabase
      .from("school_profiles")
      .select("id")
      .eq("auth_user_id", currentUser.sub)
      .single();

    if (profileError || !profile) {
      // Return 0 if profile not found instead of error
      return NextResponse.json({ count: 0 });
    }

    // Count unread messages
    const { count, error: countError } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("recipient_id", profile.id)
      .eq("is_read", false);

    if (countError) {
      // If table doesn't exist yet, return 0
      console.log("Messages table query error (may not exist yet):", countError);
      return NextResponse.json({ count: 0 });
    }

    return NextResponse.json({ count: count || 0 });
  } catch (error) {
    console.error("Error in GET /api/messages/unread-count:", error);
    return NextResponse.json({ count: 0 });
  }
}
