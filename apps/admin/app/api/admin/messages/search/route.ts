import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/admin/messages/search
 * Search for students and teachers to start new conversations
 * Uses SECURITY DEFINER RPC function to bypass RLS
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q");

    if (!query || query.trim().length === 0) {
      return NextResponse.json({ users: [] });
    }

    // Get current user (for auth verification)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use RPC function that bypasses RLS for admin search
    const { data: searchResults, error: searchError } = await supabase
      .rpc('admin_search_users', {
        search_query: query.trim(),
        search_limit: 20
      });

    if (searchError) {
      console.error('Admin search RPC error:', searchError);
      // Check if it's an access denied error
      if (searchError.message?.includes('Access denied')) {
        return NextResponse.json(
          { error: "Access denied: Admin privileges required" },
          { status: 403 }
        );
      }
      return NextResponse.json(
        { error: "Search failed" },
        { status: 500 }
      );
    }

    // Transform RPC results to expected format
    const users = (searchResults || []).map((result: any) => ({
      profile_id: result.profile_id,
      full_name: result.full_name || 'Unknown User',
      email: '', // Email not needed in search results
      avatar_url: result.avatar_url,
      role: result.user_role as 'teacher' | 'student' | 'admin',
      school_name: result.school_name,
      extra_info: result.extra_info, // department for teachers, grade_level for students
    }));

    // Sort by name
    users.sort((a: any, b: any) => a.full_name.localeCompare(b.full_name));

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Error in GET /api/admin/messages/search:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
