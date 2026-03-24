import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getCurrentUser } from '@/lib/auth/session'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

// POST /api/teacher/assessments/[id]/publish - Publish an assessment
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = createServiceClient()
    const { id } = await params

    // Check authentication using JWT
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get teacher profile using profile_id from JWT
    const { data: teacherProfile } = await supabase
      .from('teacher_profiles')
      .select('id')
      .eq('profile_id', currentUser.profile_id)
      .single()

    if (!teacherProfile) {
      return NextResponse.json({ error: 'Teacher profile not found' }, { status: 404 })
    }

    // Verify the assessment exists
    const { data: assessment, error: fetchError } = await supabase
      .from('assessments')
      .select('id, status, title, created_by')
      .eq('id', id)
      .single()

    if (fetchError || !assessment) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 })
    }

    // Check ownership - allow if no created_by or if it matches
    if (assessment.created_by && assessment.created_by !== teacherProfile.id) {
      return NextResponse.json({ error: 'You do not have permission to publish this assessment' }, { status: 403 })
    }

    // Check if already published
    if (assessment.status === 'published') {
      return NextResponse.json({ error: 'Assessment is already published' }, { status: 400 })
    }

    // Update assessment status to published
    const { data: updatedAssessment, error: updateError } = await supabase
      .from('assessments')
      .update({
        status: 'published',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error publishing assessment:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Notify all enrolled students in this course
    try {
      const courseId = updatedAssessment.course_id;
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('student_id')
        .eq('course_id', courseId);

      if (enrollments && enrollments.length > 0) {
        const notifications = enrollments.map((e: { student_id: string }) => ({
          student_id: e.student_id,
          type: 'assignment',
          title: 'New Assessment Available',
          message: `"${updatedAssessment.title}" has been published. Check your assessments page.`,
          action_url: '/student/assessments',
          is_read: false,
          created_at: new Date().toISOString(),
        }));
        await supabase.from('student_notifications').insert(notifications);
      }
    } catch (notifyErr) {
      // Non-fatal — don't fail the publish if notifications fail
      console.error('Error sending assessment notifications:', notifyErr);
    }

    return NextResponse.json({
      success: true,
      assessment: updatedAssessment,
      message: 'Assessment published successfully'
    })
  } catch (error) {
    console.error('Error in POST /api/teacher/assessments/[id]/publish:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
