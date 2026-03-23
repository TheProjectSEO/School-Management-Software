import { NextRequest, NextResponse } from 'next/server'
import { requireStudentAPI } from '@/lib/auth/requireStudentAPI'
import { createServiceClient } from '@/lib/supabase/service'
import { studentHasCourseAccess } from '@/lib/dal/student'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireStudentAPI()
    if (!auth.success) return auth.response

    const { id } = await params
    const supabase = createServiceClient()

    // Verify enrollment before tracking download (IDOR fix)
    // Step 1: attachment → lesson_id
    const { data: attachment } = await supabase
      .from('lesson_attachments')
      .select('id, lesson_id')
      .eq('id', id)
      .single()

    if (!attachment) {
      return NextResponse.json({ success: true, tracked: false })
    }

    // Step 2: lesson → module_id
    const { data: lesson } = await supabase
      .from('lessons')
      .select('module_id')
      .eq('id', attachment.lesson_id)
      .single()

    if (lesson) {
      // Step 3: module → course_id
      const { data: mod } = await supabase
        .from('modules')
        .select('course_id')
        .eq('id', lesson.module_id)
        .single()

      if (mod) {
        const hasAccess = await studentHasCourseAccess(auth.student.studentId, mod.course_id)
        if (!hasAccess) {
          return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }
      }
    }

    // Fetch current count
    const { data: current } = await supabase
      .from('lesson_attachments')
      .select('download_count')
      .eq('id', id)
      .single()

    // Increment download_count
    const { error } = await supabase
      .from('lesson_attachments')
      .update({
        download_count: (current?.download_count || 0) + 1
      })
      .eq('id', id)

    if (error) {
      console.error('[POST /student/attachments/download] Error:', error)
      // Don't fail the request if tracking fails
      return NextResponse.json({ success: true, tracked: false })
    }

    return NextResponse.json({ success: true, tracked: true })
  } catch (error) {
    console.error('Error in POST /api/student/attachments/[id]/download:', error)
    // Don't fail the request if tracking fails
    return NextResponse.json({ success: true, tracked: false })
  }
}
