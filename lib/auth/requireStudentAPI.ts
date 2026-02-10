/**
 * Student Authentication for API Routes
 * Use this in API routes for proper JWT-based authentication
 */

import { createServiceClient } from '@/lib/supabase/service';
import { getCurrentUser } from '@/lib/auth/session';
import { NextResponse } from 'next/server';

export type StudentContext = {
  userId: string;
  studentId: string;
  profileId: string;
  schoolId: string;
  sectionId: string | null;
  fullName: string;
  email: string;
  lrn: string;
};

type AuthResult =
  | { success: true; student: StudentContext }
  | { success: false; response: NextResponse };

/**
 * Require student authentication for API routes
 * Returns student context or error response
 *
 * Uses JWT-based authentication (NOT Supabase Auth)
 */
export async function requireStudentAPI(): Promise<AuthResult> {
  try {
    // Use JWT-based authentication instead of Supabase session
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return {
        success: false,
        response: NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        ),
      };
    }

    // Verify the user has student role
    if (currentUser.role !== 'student') {
      return {
        success: false,
        response: NextResponse.json(
          { error: 'Forbidden - Student role required' },
          { status: 403 }
        ),
      };
    }

    const supabase = createServiceClient();

    // Use RPC to get student profile (bypasses RLS)
    const { data, error } = await supabase.rpc('get_current_student_full', {
      p_auth_user_id: currentUser.sub,
    });

    if (error || !data || data.length === 0) {
      console.error('Student profile lookup failed:', error);
      return {
        success: false,
        response: NextResponse.json(
          { error: 'Student profile not found' },
          { status: 403 }
        ),
      };
    }

    const row = data[0];

    return {
      success: true,
      student: {
        userId: currentUser.sub,
        studentId: row.student_id,
        profileId: row.profile_id,
        schoolId: row.school_id,
        sectionId: row.section_id || null,
        fullName: row.full_name || 'Student',
        email: currentUser.email || '',
        lrn: row.lrn || '',
      },
    };
  } catch (error) {
    console.error('requireStudentAPI error:', error);
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      ),
    };
  }
}
