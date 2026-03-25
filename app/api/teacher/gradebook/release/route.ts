import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getTeacherProfile } from '@/lib/dal/teacher'
import { calculateCourseGrade } from '@/lib/dal/teacher/gradebook'
import { compileReportCardData, createReportCardSnapshot } from '@/lib/report-cards/generator'

/**
 * POST /api/teacher/gradebook/release
 * Release grades to students
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
    const { courseId, periodId, studentIds } = body as {
      courseId: string
      periodId: string
      studentIds: string[]
    }

    if (!courseId || !periodId || !studentIds || !Array.isArray(studentIds)) {
      return NextResponse.json(
        { error: 'Missing required fields: courseId, periodId, studentIds' },
        { status: 400 }
      )
    }

    if (studentIds.length === 0) {
      return NextResponse.json(
        { error: 'No students selected' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

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

    // Calculate and save course grades for each student
    const results = {
      calculated: 0,
      released: 0,
      failed: 0,
    }

    for (const studentId of studentIds) {
      try {
        // Calculate the course grade
        const courseGrade = await calculateCourseGrade(
          studentId,
          courseId,
          periodId
        )

        if (courseGrade) {
          results.calculated++

          // Mark as released
          const { error: releaseError } = await supabase
            .from('course_grades')
            .update({
              is_released: true,
              status: 'released',
              released_at: new Date().toISOString(),
              released_by: teacherProfile.profile_id,
            })
            .eq('id', courseGrade.id)

          if (releaseError) {
            console.error('Error releasing grade:', releaseError)
            results.failed++
          } else {
            results.released++

            // Mark grading queue items as completed for this student's submissions in this course
            const { data: assessmentRows } = await supabase
              .from('assessments')
              .select('id')
              .eq('course_id', courseId)

            if (assessmentRows && assessmentRows.length > 0) {
              const { data: submissionRows } = await supabase
                .from('submissions')
                .select('id')
                .eq('student_id', studentId)
                .in('assessment_id', assessmentRows.map((a: any) => a.id))

              if (submissionRows && submissionRows.length > 0) {
                await supabase
                  .from('teacher_grading_queue')
                  .update({ status: 'completed', graded_at: new Date().toISOString() })
                  .in('submission_id', submissionRows.map((s: any) => s.id))
              }
            }

            // Refresh the student's report card snapshot so it reflects the released grades
            try {
              const reportData = await compileReportCardData(studentId, periodId)
              if (reportData) {
                await createReportCardSnapshot(
                  studentId,
                  periodId,
                  teacherProfile.school_id,
                  reportData,
                  teacherProfile.id
                )
              }
            } catch (rcErr) {
              console.warn('Could not refresh report card for student', studentId, rcErr)
            }
          }
        } else {
          results.failed++
        }
      } catch (err) {
        console.error('Error processing student:', studentId, err)
        results.failed++
      }
    }

    // Create notifications for students (optional - if notifications table exists)
    try {
      const notificationInserts = studentIds.map((studentId) => ({
        student_id: studentId,
        type: 'grade_released',
        title: 'Grades Released',
        message: 'Your grades have been released. Check your gradebook to view your results.',
        is_read: false,
        created_at: new Date().toISOString(),
      }))

      // This will silently fail if the notifications table doesn't have these columns
      await supabase.from('notifications').insert(notificationInserts)
    } catch (notifyError) {
      // Non-critical error, just log it
      console.log('Could not create notifications:', notifyError)
    }

    return NextResponse.json({
      success: true,
      calculated: results.calculated,
      released: results.released,
      failed: results.failed,
      total: studentIds.length,
    })
  } catch (error) {
    console.error('Error in release:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
