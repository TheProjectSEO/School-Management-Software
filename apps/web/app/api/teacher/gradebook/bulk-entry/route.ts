import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTeacherProfile } from '@/lib/dal/teacher'

interface BulkEntry {
  studentId: string
  score: number
}

/**
 * POST /api/teacher/gradebook/bulk-entry
 * Save multiple student scores for a single assessment
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
    const { courseId, assessmentId, entries } = body as {
      courseId: string
      assessmentId: string
      entries: BulkEntry[]
    }

    if (!courseId || !assessmentId || !entries || !Array.isArray(entries)) {
      return NextResponse.json(
        { error: 'Missing required fields: courseId, assessmentId, entries' },
        { status: 400 }
      )
    }

    if (entries.length === 0) {
      return NextResponse.json(
        { error: 'No entries to process' },
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

    // Verify assessment belongs to this course
    const { data: assessment } = await supabase
      .from('assessments')
      .select('id')
      .eq('id', assessmentId)
      .eq('course_id', courseId)
      .single()

    if (!assessment) {
      return NextResponse.json(
        { error: 'Assessment not found in this course' },
        { status: 404 }
      )
    }

    // Process entries in batches
    let successCount = 0
    let failedCount = 0

    const now = new Date().toISOString()

    for (const entry of entries) {
      try {
        // Check if submission exists
        const { data: existing } = await supabase
          .from('submissions')
          .select('id')
          .eq('student_id', entry.studentId)
          .eq('assessment_id', assessmentId)
          .single()

        if (existing) {
          // Update existing
          const { error } = await supabase
            .from('submissions')
            .update({
              score: entry.score,
              status: 'graded',
              graded_at: now,
              graded_by: teacherProfile.profile_id,
            })
            .eq('id', existing.id)

          if (error) {
            failedCount++
          } else {
            successCount++
          }
        } else {
          // Create new
          const { error } = await supabase
            .from('submissions')
            .insert({
              student_id: entry.studentId,
              assessment_id: assessmentId,
              score: entry.score,
              status: 'graded',
              submitted_at: now,
              graded_at: now,
              graded_by: teacherProfile.profile_id,
            })

          if (error) {
            failedCount++
          } else {
            successCount++
          }
        }
      } catch (err) {
        console.error('Error processing entry:', err)
        failedCount++
      }
    }

    return NextResponse.json({
      success: successCount,
      failed: failedCount,
      total: entries.length,
    })
  } catch (error) {
    console.error('Error in bulk-entry:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
