import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, logAuthEvent } from '@/lib/supabase/admin';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/utils/rateLimit';

interface RegisterStudentBody {
  type: 'student';
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  schoolId: string;
  gradeLevel?: string;
  lrn?: string;
}

interface RegisterTeacherBody {
  type: 'teacher';
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  schoolId: string;
  employeeId?: string;
  department?: string;
}

type RegisterBody = RegisterStudentBody | RegisterTeacherBody;

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 3 registrations per hour per IP
    const ip = getClientIp(request);
    const rl = checkRateLimit(`register:${ip}`, 3, 60 * 60 * 1000);
    if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs);

    const body: RegisterBody = await request.json();

    // Validate common fields
    if (!body.email || !body.password || !body.firstName || !body.lastName) {
      return NextResponse.json(
        { error: 'Email, password, first name, and last name are required' },
        { status: 400 }
      );
    }

    if (!body.type || !['student', 'teacher'].includes(body.type)) {
      return NextResponse.json(
        { error: 'Invalid registration type. Must be "student" or "teacher"' },
        { status: 400 }
      );
    }

    if (!body.schoolId) {
      return NextResponse.json(
        { error: 'School ID is required' },
        { status: 400 }
      );
    }

    // Validate password strength
    if (body.password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Check if school exists
    const { data: school, error: schoolError } = await supabase
      .from('schools')
      .select('id, name')
      .eq('id', body.schoolId)
      .single();

    if (schoolError || !school) {
      return NextResponse.json(
        { error: 'Invalid school ID' },
        { status: 400 }
      );
    }

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: false, // Require email verification
      user_metadata: {
        first_name: body.firstName,
        last_name: body.lastName,
        role: body.type,
      },
    });

    if (authError || !authData.user) {
      // Check for duplicate email
      if (authError?.message?.includes('already registered')) {
        return NextResponse.json(
          { error: 'An account with this email already exists' },
          { status: 409 }
        );
      }

      console.error('Auth error:', authError);
      return NextResponse.json(
        { error: 'Failed to create account' },
        { status: 500 }
      );
    }

    const userId = authData.user.id;

    // Create school_profiles record (the unified profile table used across the app)
    const { data: profile, error: profileError } = await supabase
      .from('school_profiles')
      .insert({
        auth_user_id: userId,
        email: body.email,
        full_name: `${body.firstName} ${body.lastName}`,
        role: body.type,
      })
      .select('id')
      .single();

    if (profileError || !profile) {
      // Rollback: delete auth user
      await supabase.auth.admin.deleteUser(userId);
      console.error('Profile creation error:', profileError);
      return NextResponse.json(
        { error: 'Failed to create profile' },
        { status: 500 }
      );
    }

    const profileId = profile.id;

    // Create role-specific record
    if (body.type === 'student') {
      const studentBody = body as RegisterStudentBody;

      const { error: studentError } = await supabase.from('students').insert({
        school_id: body.schoolId,
        profile_id: profileId,
        grade_level: studentBody.gradeLevel || null,
        lrn: studentBody.lrn || null,
        status: 'pending',
        enrollment_status: 'pending',
      });

      if (studentError) {
        // Rollback: delete profile and auth user
        await supabase.from('school_profiles').delete().eq('id', profileId);
        await supabase.auth.admin.deleteUser(userId);

        console.error('Student record error:', studentError);
        return NextResponse.json(
          { error: 'Failed to create student record' },
          { status: 500 }
        );
      }
    } else if (body.type === 'teacher') {
      const teacherBody = body as RegisterTeacherBody;

      const { error: teacherError } = await supabase.from('teachers').insert({
        school_id: body.schoolId,
        profile_id: profileId,
        employee_id: teacherBody.employeeId || null,
      });

      if (teacherError) {
        // Rollback: delete profile and auth user
        await supabase.from('school_profiles').delete().eq('id', profileId);
        await supabase.auth.admin.deleteUser(userId);

        console.error('Teacher record error:', teacherError);
        return NextResponse.json(
          { error: 'Failed to create teacher record' },
          { status: 500 }
        );
      }
    }

    // Log registration
    await logAuthEvent(
      userId,
      'login', // Using 'login' type for registration as audit log may not have 'register' type
      { action: 'register', type: body.type, schoolId: body.schoolId },
      request.headers.get('user-agent') || undefined,
      request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined
    );

    return NextResponse.json({
      success: true,
      message: 'Registration successful. Please check your email to verify your account and wait for admin approval.',
      userId,
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
