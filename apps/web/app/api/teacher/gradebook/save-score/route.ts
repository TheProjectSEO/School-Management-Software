import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTeacherProfile } from '@/lib/dal/teacher'

/**
 * POST /api/teacher/gradebook/save-score
 * Save or update a single student score for an assessment
 */
export async function POST(request: NextRequest) {
  try {
    // Get authenticated teacher
    const teacherProfile = await getTeacherProfile()
    if (!teacherProfile) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { studentId, assessmentId, courseId, score } = body

    if (!studentId || !assessmentId || !courseId) {
      return NextResponse.json(
        { error: 'Missing required fields: studentId, assessmentId, courseId' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Verify teacher has access to this course
    const { count: accessCount } = await supabase
      .from('teacher_assignments')
      .select('*', { count: 'exact', head: true })
      .eq('teacher_profile_id', teacherProfile.id)
      .eq('course_id', courseId)

    if (!accessCount || accessCount === 0) {
      return NextResponse.json(
        { error: 'You do not have access to this course' },
        { status: 403 }
      )
    }

    // Check if submission already exists
    const { data: existingSubmission } = await supabase
      .from('submissions')
      .select('id')
      .eq('student_id', studentId)
      .eq('assessment_id', assessmentId)
      .single()

    if (existingSubmission) {
      // Update existing submission
      const { error: updateError } = await supabase
        .from('submissions')
        .update({
          score: score,
          status: score !== null ? 'graded' : 'submitted',
          graded_at: score !== null ? new Date().toISOString() : null,
          graded_by: score !== null ? teacherProfile.profile_id : null,
        })
        .eq('id', existingSubmission.id)

      if (updateError) {
        console.error('Error updating submission:', updateError)
        return NextResponse.json(
          { error: 'Failed to update score' },
          { status: 500 }
        )
      }
    } else {
      // Create new submission with score
      const { error: insertError } = await supabase
        .from('submissions')
        .insert({
          student_id: studentId,
          assessment_id: assessmentId,
          score: score,
          status: score !== null ? 'graded' : 'submitted',
          submitted_at: new Date().toISOString(),
          graded_at: score !== null ? new Date().toISOString() : null,
          graded_by: score !== null ? teacherProfile.profile_id : null,
        })

      if (insertError) {
        console.error('Error creating submission:', insertError)
        return NextResponse.json(
          { error: 'Failed to save score' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in save-score:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
