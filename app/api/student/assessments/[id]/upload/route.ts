import { NextRequest, NextResponse } from 'next/server'
import { requireStudentAPI } from '@/lib/auth/requireStudentAPI'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: assessmentId } = await params
  const auth = await requireStudentAPI()
  if (!auth.success) return auth.response

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  const submissionId = formData.get('submissionId') as string | null

  if (!file || !submissionId) {
    return NextResponse.json({ error: 'file and submissionId are required' }, { status: 400 })
  }

  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'File size must be under 10MB' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Verify submission belongs to this student and is still pending
  const { data: submission } = await supabase
    .from('submissions')
    .select('id, student_id, status')
    .eq('id', submissionId)
    .eq('assessment_id', assessmentId)
    .single()

  if (!submission) {
    return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
  }

  if (submission.student_id !== auth.student.studentId) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  if (submission.status !== 'pending') {
    return NextResponse.json({ error: 'Submission already completed' }, { status: 400 })
  }

  // Sanitize filename and build storage path
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_').slice(0, 100)
  const path = `${assessmentId}/${submissionId}/${Date.now()}-${sanitizedName}`

  const arrayBuffer = await file.arrayBuffer()
  const buffer = new Uint8Array(arrayBuffer)

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('submissions')
    .upload(path, buffer, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const { data: { publicUrl } } = supabase.storage
    .from('submissions')
    .getPublicUrl(uploadData.path)

  return NextResponse.json({
    success: true,
    url: publicUrl,
    path: uploadData.path,
    name: file.name,
    size: file.size,
    fileType: file.type,
  })
}
