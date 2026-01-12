import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get('course_id')

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

    // Build query
    let query = supabase
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
        )
      `)
      .eq('created_by', teacherProfile.id)
      .order('created_at', { ascending: false })

    if (courseId) {
      query = query.eq('course_id', courseId)
    }

    const { data: assessments, error } = await query

    if (error) {
      console.error('Error fetching assessments:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ assessments })
  } catch (error) {
    console.error('Error in GET /api/teacher/assessments:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
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
      course_id,
      section_id,
      instructions,
      due_date,
      time_limit_minutes,
      max_attempts,
      total_points,
      status,
      questions
    } = body

    // Create assessment
    const { data: assessment, error: assessmentError } = await supabase
      .from('n8n_content_creation.assessments')
      .insert({
        title,
        type,
        course_id,
        section_id,
        instructions,
        due_date,
        time_limit_minutes,
        max_attempts,
        total_points,
        status: status || 'draft',
        created_by: teacherProfile.id
      })
      .select()
      .single()

    if (assessmentError) {
      console.error('Error creating assessment:', assessmentError)
      return NextResponse.json({ error: assessmentError.message }, { status: 500 })
    }

    // If questions are provided, create them
    if (questions && questions.length > 0) {
      const questionsToInsert = questions.map((q: any, index: number) => ({
        assessment_id: assessment.id,
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
        console.error('Error creating questions:', questionsError)
        // Rollback assessment creation
        await supabase
          .from('n8n_content_creation.assessments')
          .delete()
          .eq('id', assessment.id)

        return NextResponse.json({ error: questionsError.message }, { status: 500 })
      }
    }

    return NextResponse.json({ assessment }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/teacher/assessments:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
