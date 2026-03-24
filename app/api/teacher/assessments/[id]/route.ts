import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getCurrentUser } from '@/lib/auth/session'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = createServiceClient()
    const { id } = await params

    // Check authentication using JWT
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Flat select — no FK joins (BUG-001: FK joins silently return empty without DB constraints)
    const { data: assessmentRow, error } = await supabase
      .from('assessments')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !assessmentRow) {
      console.error('Error fetching assessment:', error)
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 })
    }

    // Fetch course separately
    let course = null
    if (assessmentRow.course_id) {
      const { data: courseRow } = await supabase
        .from('courses')
        .select('id, name, subject_code')
        .eq('id', assessmentRow.course_id)
        .single()
      course = courseRow
    }

    // Fetch section separately
    let section = null
    if (assessmentRow.section_id) {
      const { data: sectionRow } = await supabase
        .from('sections')
        .select('id, name')
        .eq('id', assessmentRow.section_id)
        .single()
      section = sectionRow
    }

    // Fetch questions separately
    const { data: questionRows } = await supabase
      .from('teacher_assessment_questions')
      .select('id, question_text, question_type, choices_json, answer_key_json, points, order_index, explanation')
      .eq('assessment_id', id)
      .order('order_index', { ascending: true })

    const assessment = {
      ...assessmentRow,
      course,
      section,
      questions: (questionRows || []).sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0)),
    }

    return NextResponse.json({ assessment })
  } catch (error) {
    console.error('Error in GET /api/teacher/assessments/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = createServiceClient()
    const { id } = await params
    const body = await request.json()

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

    const {
      title,
      description,
      type,
      instructions,
      available_from,
      due_date,
      time_limit_minutes,
      max_attempts,
      total_points,
      status,
      questions,
      grading_period_id
    } = body

    // First verify the assessment exists and teacher has access
    const { data: existingAssessment, error: fetchError } = await supabase
      .from('assessments')
      .select('id, created_by')
      .eq('id', id)
      .single()

    if (fetchError || !existingAssessment) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 })
    }

    // Check if teacher owns this assessment OR allow any teacher to edit (for flexibility)
    // For now, skip ownership check if assessment has no created_by
    if (existingAssessment.created_by && existingAssessment.created_by !== teacherProfile.id) {
      console.log('Ownership mismatch:', {
        assessmentCreatedBy: existingAssessment.created_by,
        teacherProfileId: teacherProfile.id
      })
      return NextResponse.json({ error: 'You do not have permission to edit this assessment' }, { status: 403 })
    }

    // Update assessment
    const { data: assessment, error: assessmentError } = await supabase
      .from('assessments')
      .update({
        title,
        description,
        type,
        instructions,
        available_from,
        due_date,
        time_limit_minutes,
        max_attempts,
        total_points,
        status,
        ...(grading_period_id !== undefined && { grading_period_id }),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (assessmentError) {
      console.error('Error updating assessment:', assessmentError)
      return NextResponse.json({ error: assessmentError.message }, { status: 500 })
    }

    // If questions are provided, update them
    if (questions) {
      // Delete existing questions
      await supabase
        .from('teacher_assessment_questions')
        .delete()
        .eq('assessment_id', id)

      // Insert new questions
      if (questions.length > 0) {
        const questionsToInsert = questions.map((q: any, index: number) => ({
          assessment_id: id,
          question_text: q.question_text,
          question_type: q.question_type || 'multiple_choice',
          choices_json: q.choices_json || null,
          answer_key_json: q.answer_key_json || null,
          points: q.points || 1,
          order_index: q.order_index !== undefined ? q.order_index : (q.order !== undefined ? q.order : index),
          explanation: q.explanation || null,
        }))

        const { error: questionsError } = await supabase
          .from('teacher_assessment_questions')
          .insert(questionsToInsert)

        if (questionsError) {
          console.error('Error updating questions:', questionsError)
          return NextResponse.json({ error: questionsError.message }, { status: 500 })
        }
      }
    }

    return NextResponse.json({ assessment })
  } catch (error) {
    console.error('Error in PUT /api/teacher/assessments/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    // Delete assessment (questions will be cascade deleted)
    const { error } = await supabase
      .from('assessments')
      .delete()
      .eq('id', id)
      .eq('created_by', teacherProfile.id) // Ensure teacher owns this assessment

    if (error) {
      console.error('Error deleting assessment:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/teacher/assessments/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
