import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: {
    id: string
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient()
    const { id } = params

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get assessment with questions
    const { data: assessment, error } = await supabase
      .from('n8n_content_creation.assessments')
      .select(`
        *,
        courses:course_id (
          id,
          name,
          code
        ),
        sections:section_id (
          id,
          name
        ),
        questions:assessment_questions (
          *
        )
      `)
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching assessment:', error)
      return NextResponse.json({ error: error.message }, { status: 404 })
    }

    // Sort questions by order
    if (assessment.questions) {
      assessment.questions.sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
    }

    return NextResponse.json({ assessment })
  } catch (error) {
    console.error('Error in GET /api/teacher/assessments/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient()
    const { id } = params
    const body = await request.json()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get teacher profile
    const { data: teacherProfile } = await supabase
      .from('teacher_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!teacherProfile) {
      return NextResponse.json({ error: 'Teacher profile not found' }, { status: 404 })
    }

    const {
      title,
      type,
      instructions,
      due_date,
      time_limit_minutes,
      max_attempts,
      total_points,
      status,
      questions
    } = body

    // Update assessment
    const { data: assessment, error: assessmentError } = await supabase
      .from('n8n_content_creation.assessments')
      .update({
        title,
        type,
        instructions,
        due_date,
        time_limit_minutes,
        max_attempts,
        total_points,
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('created_by', teacherProfile.id) // Ensure teacher owns this assessment
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
        .from('n8n_content_creation.assessment_questions')
        .delete()
        .eq('assessment_id', id)

      // Insert new questions
      if (questions.length > 0) {
        const questionsToInsert = questions.map((q: any, index: number) => ({
          assessment_id: id,
          question_text: q.question_text,
          question_type: q.question_type,
          choices_json: q.choices_json,
          answer_key_json: q.answer_key_json,
          points: q.points,
          difficulty: q.difficulty,
          tags: q.tags,
          explanation: q.explanation,
          order: q.order !== undefined ? q.order : index
        }))

        const { error: questionsError } = await supabase
          .from('n8n_content_creation.assessment_questions')
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
    const supabase = await createClient()
    const { id } = params

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get teacher profile
    const { data: teacherProfile } = await supabase
      .from('teacher_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!teacherProfile) {
      return NextResponse.json({ error: 'Teacher profile not found' }, { status: 404 })
    }

    // Delete assessment (questions will be cascade deleted)
    const { error } = await supabase
      .from('n8n_content_creation.assessments')
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
