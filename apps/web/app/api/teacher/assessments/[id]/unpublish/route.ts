import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

// POST /api/teacher/assessments/[id]/unpublish - Unpublish an assessment
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient()
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
      return NextResponse.json({ error: 'You do not have permission to unpublish this assessment' }, { status: 403 })
    }

    // Check if already draft
    if (assessment.status === 'draft') {
      return NextResponse.json({ error: 'Assessment is already a draft' }, { status: 400 })
    }

    // Update assessment status to draft
    const { data: updatedAssessment, error: updateError } = await supabase
      .from('assessments')
      .update({
        status: 'draft',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error unpublishing assessment:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      assessment: updatedAssessment,
      message: 'Assessment unpublished successfully'
    })
  } catch (error) {
    console.error('Error in POST /api/teacher/assessments/[id]/unpublish:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
