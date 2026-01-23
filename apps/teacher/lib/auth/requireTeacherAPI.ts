/**
 * Teacher Authentication for API Routes
 * Use this in API routes instead of the page-based requireTeacher
 */

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export type TeacherContext = {
  userId: string;
  teacherId: string;
  profileId: string;
  schoolId: string;
  fullName: string;
  email: string;
};

type AuthResult =
  | { success: true; teacher: TeacherContext }
  | { success: false; response: NextResponse };

/**
 * Require teacher authentication for API routes
 * Returns teacher context or error response
 */
export async function requireTeacherAPI(): Promise<AuthResult> {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        response: NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        ),
      };
    }

    // Use RPC to get teacher profile (bypasses RLS)
    const { data, error } = await supabase.rpc('get_teacher_profile', {
      user_auth_id: user.id,
    });

    if (error || !data || data.length === 0) {
      return {
        success: false,
        response: NextResponse.json(
          { error: 'Teacher profile not found' },
          { status: 403 }
        ),
      };
    }

    const row = data[0];

    return {
      success: true,
      teacher: {
        userId: user.id,
        teacherId: row.id,
        profileId: row.profile_id,
        schoolId: row.school_id,
        fullName: row.profile_full_name || 'Teacher',
        email: user.email || '',
      },
    };
  } catch (error) {
    console.error('requireTeacherAPI error:', error);
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      ),
    };
  }
}
