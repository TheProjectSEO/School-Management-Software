import { NextRequest, NextResponse } from 'next/server'
import { requireStudentAPI } from '@/lib/auth/requireStudentAPI'
import { createServiceClient } from '@/lib/supabase/service'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireStudentAPI()
    if (!auth.success) return auth.response

    const { id } = await params
    const supabase = createServiceClient()

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
